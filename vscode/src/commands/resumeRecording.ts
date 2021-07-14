import { UI, MESSAGES } from '../user_interface/messages';
import Recorder from '../recorder/Recorder';

export default async function resumeRecording(recorder: Recorder): Promise<void> {
  try {
    // TODO: Don't think I need try and catch here
    if (recorder && recorder.isRecording) {
      await recorder.resume();
      UI.showMessage(MESSAGES.recordingResumed);
    }
  } catch (e) {
    UI.showMessage(`Resume Recording failed: ${e}`);
    console.log('Resume recording failed', e);
  }
}
