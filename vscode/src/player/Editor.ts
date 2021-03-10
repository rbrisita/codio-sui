import { removeSelection } from '../editor/event_dispatcher';
import { createFrame, applyFrame } from '../editor/frame';
import deserializeEvents from '../editor/deserialize';
import { window } from 'vscode';
import { overrideEditorText } from '../utils';
import {
  createTimelineWithAbsoluteTimes,
  cutTimelineFrom,
  runThroughTimeline,
  cutTimelineUntil,
  createRelativeTimeline,
} from '../editor/event_timeline';
import deserializeFrame from '../editor/frame/deserialize_frame';
import { getInitialFilePathAndContentFromFrame } from '../editor/frame/create_frame';
import { UI } from '../user_interface/messages';
export default class CodeEditorPlayer {
  currentActionTimer: any;
  events: Array<CodioEvent>;
  initialFrame: Array<CodioFile>;
  workspaceFolder: string;

  /**
   * Load given data to create events and initial frame.
   * @param workspacePath Path to where codio lives.
   * @param timeline Object containing properties to act on.
   * @returns True if loaded correctly; false otherwise.
   */
  load(workspacePath, timeline): Boolean {
    this.events = deserializeEvents(timeline.events, workspacePath);
    this.initialFrame = deserializeFrame(timeline.initialFrame, workspacePath);
    return !!this.events.length || !!this.initialFrame.length;
  }

  /**
   * Guard against future errors.
   */
  destroy(): void {
    this.play = () => { };
    this.pause = () => { };
    this.moveToFrame = (): Promise<void> => Promise.resolve();
    this.getTimeline = () => [];
  }

  play(events: Array<CodioEvent>, time) {
    const timeline = createTimelineWithAbsoluteTimes(events, time);
    runThroughTimeline(timeline, (timer) => (this.currentActionTimer = timer));
  }

  //todo: moveToFrame should use create+applyFrame when time is 0
  async moveToFrame(time: number) {
    if (time === 0) {
      const { uri, content } = getInitialFilePathAndContentFromFrame(this.initialFrame);
      try {
        await window.showTextDocument(uri);
      } catch (e) {
        UI.showError(e.message);
      }
      await overrideEditorText(window.activeTextEditor, content);
    } else {
      const initialToCurrentFrameActions = cutTimelineUntil(this.events, time);
      // const interacterContent = getInteracterContent(this.tutorial);
      const frame = createFrame(this.initialFrame, initialToCurrentFrameActions);
      // const finalFrame = addInteracterContentToFrame(frame, interacterContent);
      await applyFrame(frame);
    }
  }

  getTimeline(relativeTimeToStart: number) {
    const timelineFromTime = cutTimelineFrom(this.events, relativeTimeToStart);
    return createRelativeTimeline(timelineFromTime, relativeTimeToStart);
  }

  pause() {
    clearTimeout(this.currentActionTimer);
    removeSelection();
  }
}
