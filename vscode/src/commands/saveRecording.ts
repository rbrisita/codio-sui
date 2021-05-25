import { UI, MESSAGES } from '../user_interface/messages';
import Recorder from '../recorder/Recorder';

export default async function saveRecording(recorder: Recorder): Promise<void> {
  try {
    if (recorder && recorder.isRecording) {
      await recorder.stopRecording();
      recorder.saveRecording();
      UI.showMessage(MESSAGES.recordingSaved);
    }
  } catch (e) {
    UI.showMessage(`Recording failed: ${e}`);
    console.log('finish recording failed', e);
  }
}
