import { window, StatusBarItem, StatusBarAlignment } from 'vscode';
import Player from '../player/Player';
import Recorder from '../recorder/Recorder';
import { CommandNames } from '../commands';

export const showCodioNameInputBox = async (): Promise<string> => {
  return await window.showInputBox({ prompt: 'Give your codio a name:' });
};

export const showChooseAudioDevice = async (items: string[]): Promise<string | undefined> => {
  const audioDevice = await window.showQuickPick(items, { placeHolder: 'Choose an Audio Device to record from' });
  return audioDevice;
};

export const showPlayFromInputBox = async (player: Player): Promise<string> => {
  return await window.showInputBox({
    prompt: `Choose a starting time from 0 to ${player.codioLength / 1000} seconds.`,
  });
};

export const MESSAGES = {
  startingToRecord: 'Starting to record.',
  recordingSaved: 'Recording saved.',
  recordingCanceled: 'Recording canceled.',
  cantPlayWhileRecording: "Can't play Codio while recording.",
  alreadyPlaying: 'You already have a Codio playing.',
  noActiveCodio: "You don't have an active Codio.",
  noStartTime: 'No start time entered.',
  ffmpegNotAvailable: `Looks like you haven't installed ffmpeg, which is required for Codio to work.
     You can install it with brew: "brew install ffmpeg".`,
  emptyCodioNameInvalid: 'Filename needed to save Codio to.',
  noRecordingDeviceAvailable: 'Codio could not find an audio recording device.',
  noActiveWorkspace: 'You need to have an active workspace to record a Codio.',
};
class UIController {
  shouldDisplayMessages: boolean;
  private statusBar: StatusBarItem;

  constructor(shouldDisplayMessages) {
    this.shouldDisplayMessages = shouldDisplayMessages;
  }

  /**
   * Create a status bar item to write codio progress to.
   * @param context Context from when the extension was activated.
   */
  createStatusBar(context): void {
    if (this.statusBar) {
      this.statusBar.dispose();
    }

    this.statusBar = window.createStatusBarItem(StatusBarAlignment.Right, 101);
    context.subscriptions.push(this.statusBar);
  }

  showMessage(message): void {
    if (this.shouldDisplayMessages) {
      window.showInformationMessage(message);
    }
  }

  /**
   * Show given message as an error pop-up.
   * @param message Message to show in error pop-up.
   */
  showError(message): void {
    window.showErrorMessage(message);
  }

  /**
   * Show codio player progress on status bar item.
   * @param player Player to get updates from.
   */
  showPlayerStatusBar(player: Player) {
    this.statusBar.command = CommandNames.STOP_CODIO;
    this.statusBar.tooltip = 'Stop Codio';
    this.statusBar.show();

    player.onTimerUpdate(async (currentTime, totalTime) => {
      const percentage = (currentTime / totalTime) * 100;
      this.statusBar.text = `$(megaphone) Codio $(mention)${Math.round(percentage)}% - ${Math.round(
        currentTime,
      )}s/${Math.round(totalTime)}s $(stop-circle)`;
    });

    player.process.then(() => {
      this.statusBar.hide();
    });
  }

  /**
   * Show codio recorder progress on status bar item.
   * @param recorder Recorder to get updatess from.
   */
  showRecorderStatusBar(recorder: Recorder) {
    this.statusBar.command = CommandNames.SAVE_RECORDING;
    this.statusBar.tooltip = 'Save Recording';
    this.statusBar.show();

    recorder.onTimerUpdate(async (currentTime) => {
      this.statusBar.text = `$(pulse) Recording Codio $(mention) ${Math.round(currentTime)}s $(stop-circle)`;
    });

    recorder.process.then(() => {
      this.statusBar.hide();
    });
  }
}

export const UI = new UIController(false);
