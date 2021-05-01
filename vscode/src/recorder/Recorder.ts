import CodeEditorRecorder from './Editor';
import Timer from '../ProgressTimer';
import FSManager from '../filesystem/FSManager';
import { Uri, commands } from 'vscode';
import AudioHandler from '../audio/Audio';

const CODIO_FORMAT_VERSION = '0.1.0';

/**
 * Manage media to record, cancel, stop, and save recordings.
 */
export default class Recorder {
  audioRecorder: AudioHandler;
  codeEditorRecorder: CodeEditorRecorder;
  timer: Timer;
  codioPath: string;
  destinationFolder?: Uri;
  workspaceRoot?: Uri;
  codioName: string;

  recordingStartTime: number;
  recordingLength = 0;
  isRecording = false;

  recordingSavedObservers: Array<() => void> = [];
  process: Promise<unknown>;
  stopRecordingResolver: (value?: unknown) => void;

  async loadCodio(codioPath: string, codioName: string, destinationFolder?: Uri, workspaceRoot?: Uri): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
      this.saveRecording();
    }
    this.setInitialState(codioPath, codioName, destinationFolder, workspaceRoot);
    this.audioRecorder = new AudioHandler(FSManager.audioPath(this.codioPath));
    this.codeEditorRecorder = new CodeEditorRecorder();
    this.timer = new Timer();
  }

  private setInitialState(codioPath, codioName, destinationFolder, workspaceRoot) {
    this.codioPath = codioPath;
    this.codioName = codioName;
    this.destinationFolder = destinationFolder;
    this.workspaceRoot = workspaceRoot;
    this.process = undefined;
    this.recordingSavedObservers = [];
  }

  onTimerUpdate(observer: (currentSecond: number, totalSeconds: number) => void): void {
    this.timer.onUpdate(observer);
  }

  onRecordingSaved(observer: () => void): void {
    this.recordingSavedObservers.push(observer);
  }

  /**
   * Start recording on all media and set state.
   */
  startRecording(): void {
    this.codeEditorRecorder.record();
    this.audioRecorder.record();
    this.timer.run();
    this.process = new Promise((resolve) => (this.stopRecordingResolver = resolve));
    this.recordingStartTime = Date.now() + 300;
    this.isRecording = true;
    commands.executeCommand('setContext', 'inCodioRecording', true);
  }

  async setRecordingDevice(prompt: (items: string[]) => Promise<string | undefined>): Promise<boolean> {
    return this.audioRecorder.setDevice(prompt);
  }

  /**
   * Cancel recording and reset state.
   */
  async cancel(): Promise<void> {
    await this.stopRecording();
    this.setInitialState('', '', '', '');
  }

  /**
   * Stop recording and set state.
   */
  async stopRecording(): Promise<void> {
    await this.audioRecorder.stopRecording();
    this.codeEditorRecorder.stopRecording();
    this.timer.stop();
    this.recordingLength = Date.now() - this.recordingStartTime;
    this.stopRecordingResolver();
    this.isRecording = false;
    commands.executeCommand('setContext', 'inCodioRecording', false);
  }

  /**
   * Save recording by getting timeline content and constructing objeccts to save to file.
   * Alert any observers.
   */
  async saveRecording(): Promise<void> {
    try {
      const codioTimelineContent = this.codeEditorRecorder.getTimelineContent(
        this.recordingStartTime,
        this.workspaceRoot,
      );
      const codioJsonContent = { ...codioTimelineContent, codioLength: this.recordingLength };
      const metadataJsonContent = { length: this.recordingLength, name: this.codioName, version: CODIO_FORMAT_VERSION };
      await FSManager.saveRecordingToFile(
        codioJsonContent,
        metadataJsonContent,
        codioJsonContent.codioEditors,
        this.codioPath,
        this.destinationFolder,
      );
      this.recordingSavedObservers.forEach((obs) => obs());
    } catch (e) {
      console.log('Saving recording failed', e);
    }
  }
}
