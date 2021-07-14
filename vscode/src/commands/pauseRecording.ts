import { UI, MESSAGES } from '../user_interface/messages';
import Recorder from '../recorder/Recorder';

export default async function pauseRecording(recorder: Recorder): Promise<void> {
  try {
    // TODO: Don't think I need try and catch here
    if (recorder && recorder.isRecording) {
      await recorder.pause();
      UI.showMessage(MESSAGES.recordingPaused);
    }
  } catch (e) {
    UI.showMessage(`Pause Recording failed: ${e}`);
    console.log('Pause recording failed', e);
  }
}
