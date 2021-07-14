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

  pauseStartTime: number;
  pauseTotalTime: number;
  isPaused = false;

  recordingSavedObservers: Array<() => void> = [];
  process: Promise<unknown>;
  stopRecordingResolver: (value?: unknown) => void;

  async loadCodio(codioPath: string, codioName: string, destinationFolder?: Uri, workspaceRoot?: Uri): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
      this.saveRecording();
    }
    this.timer = new Timer();
    this.audioRecorder = new AudioHandler(FSManager.audioPath(codioPath));
    this.codeEditorRecorder = new CodeEditorRecorder();
    this.setInitialState(codioPath, codioName, destinationFolder, workspaceRoot);
  }

  private setInitialState(codioPath = '', codioName = '', destinationFolder?: Uri, workspaceRoot?: Uri) {
    this.codioPath = codioPath;
    this.codioName = codioName;
    this.destinationFolder = destinationFolder;
    this.workspaceRoot = workspaceRoot;
    this.process = undefined;
    this.recordingSavedObservers = [];
    this.pauseStartTime = 0;
    this.pauseTotalTime = 0;
    this.timer.setInitialState();
  }

  onTimerUpdate(observer: (currentSecond: number, totalSeconds: number) => void): void {
    this.timer.onUpdate(observer);
  }

  onRecordingSaved(observer: () => void): void {
    this.recordingSavedObservers.push(observer);
  }

  async setRecordingDevice(prompt: (items: string[]) => Promise<string | undefined>): Promise<boolean> {
    return this.audioRecorder.setDevice(prompt);
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

  /**
   * Cancel recording and reset state.
   */
  async cancel(): Promise<void> {
    await this.stopRecording();
    this.setInitialState();
  }

  /**
   * Stop recording and set state.
   */
  async stopRecording(): Promise<void> {
    if (this.isPaused) {
      await this.resume();
    }

    this.timer.stop();
    this.codeEditorRecorder.stopRecording();
    await this.audioRecorder.stopRecording();

    // Todo: Check situation where pause time > recording time
    this.recordingLength = Math.abs(Date.now() - this.recordingStartTime - this.pauseTotalTime);
    this.stopRecordingResolver();

    this.isPaused = false;
    commands.executeCommand('setContext', 'isCodioRecordingPaused', false);

    this.isRecording = false;
    commands.executeCommand('setContext', 'inCodioRecording', false);
  }

  /**
   * Pause Codio media.
   */
  async pause(): Promise<void> {
    this.pauseStartTime = Date.now();
    await this.audioRecorder.pause();
    this.codeEditorRecorder.stopRecording();
    this.timer.stop();

    this.isPaused = true;
    commands.executeCommand('setContext', 'isCodioRecordingPaused', true);
  }

  /**
   * Resume Codio media.
   */
  async resume(): Promise<void> {
    // Keep track of total time paused through out recording
    if (this.pauseStartTime) {
      this.pauseTotalTime += Date.now() - this.pauseStartTime;
      this.pauseStartTime = 0;
    }

    this.timer.run(this.timer.currentSecond);
    this.codeEditorRecorder.record();
    await this.audioRecorder.resume();

    this.isPaused = false;
    commands.executeCommand('setContext', 'isCodioRecordingPaused', false);
  }

  /**
   * Save recording by getting timeline content and constructing objects to save to file.
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
