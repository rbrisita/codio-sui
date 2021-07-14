import {
  workspace,
  window,
  TextEditor,
  TextDocumentChangeEvent,
  TextEditorSelectionChangeEvent,
  Disposable,
  TextEditorVisibleRangesChangeEvent,
  Uri,
} from 'vscode';
import serializeEvents from '../editor/serialize';
import * as eventCreators from '../editor/event_creator';
import FSManager from '../filesystem/FSManager';
import { createRelativeTimeline } from '../editor/event_timeline';
import ShadowDocument from '../editor/frame/ShadowDocument';
import serializeFrame from '../editor/frame/serialize_frame';

export default class CodeEditorRecorder {
  onDocumentTextChangedListener: Disposable;
  onDidChangeActiveTextEditorListener: Disposable;
  onDidChangeTextEditorSelectionListener: Disposable;
  onDidChangeTextEditorVisibleRangesListener: Disposable;

  initialFrame: Array<CodioFile> = [];
  codioEditors: Array<string> = [];
  records: Array<CodioEvent> = [];

  /**
   * Save active text editor and listen to change events.
   */
  record(): void {
    const editor = window.activeTextEditor;
    if (editor) {
      this.addCodioFileToInitialFrame(new ShadowDocument(editor.document.getText()), 1, editor.document.uri, 0);
      this.codioEditors = [...this.codioEditors, editor.document.uri.path];
    }

    this.onDidChangeActiveTextEditorListener = window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor);
    this.onDidChangeTextEditorSelectionListener = window.onDidChangeTextEditorSelection(
      this.onDidChangeTextEditorSelection,
    );
    this.onDocumentTextChangedListener = workspace.onDidChangeTextDocument(this.onDocumentTextChanged);
    this.onDidChangeTextEditorVisibleRangesListener = window.onDidChangeTextEditorVisibleRanges(
      this.onDidChangeTextEditorVisibleRanges,
    );
  }

  private addCodioFileToInitialFrame(document: ShadowDocument, column: number, uri: Uri, lastAction: number) {
    this.initialFrame.push({
      document,
      column,
      uri,
      lastAction,
    });
  }

  stopRecording(): void {
    this.onDidChangeActiveTextEditorListener.dispose();
    this.onDidChangeTextEditorSelectionListener.dispose();
    this.onDocumentTextChangedListener.dispose();
    this.onDidChangeTextEditorVisibleRangesListener.dispose();
  }

  getTimelineContent(recordingStartTime: number, workspaceRoot?: Uri): TimelineContent {
    const { files, rootPath } = FSManager.normalizeFilesPath(this.codioEditors, workspaceRoot);
    const events = serializeEvents(this.records, rootPath);
    const initialFrame = serializeFrame(this.initialFrame, rootPath);
    const eventsTimeline = createRelativeTimeline(events, recordingStartTime);
    // change actions to events, change codioEditors initialFilePath and initialContent to initialFrame.
    return { events: eventsTimeline, initialFrame, codioEditors: files };
  }

  private onDocumentTextChanged = (e: TextDocumentChangeEvent) => {
    const record = eventCreators.createCodioTextEvent(e);
    if (record) {
      this.records.push(record);
    }
  };

  /**
   * Handle file interactions.
   * @param te New active text editor with changes
   */
  private onDidChangeActiveTextEditor = (te: TextEditor) => {
    // Null when a file replaced another one in the same editor.
    if (!te) {
      return;
    }

    const editorUri = te.document.uri;
    const editorPath = editorUri.path;
    const editorContent = te.document.getText();

    // Save active text editor if it wasn't available when record started.
    if (!this.codioEditors.length) {
      this.addCodioFileToInitialFrame(new ShadowDocument(editorContent), 1, editorUri, 0);
      this.codioEditors = [editorPath];
      return;
    }

    // Add new file if need be.
    if (this.codioEditors.indexOf(editorPath) === -1) {
      this.codioEditors.push(editorPath);
      const record = eventCreators.createCodioEditorEvent(te, editorContent, true);
      this.records.push(record);
      this.addCodioFileToInitialFrame(
        new ShadowDocument(record.data.content),
        record.data.viewColumn,
        record.data.uri,
        1,
      );
    } else {
      const record = eventCreators.createCodioEditorEvent(te, editorContent, false);
      this.records.push(record);
    }
  };

  private onDidChangeTextEditorVisibleRanges = (e: TextEditorVisibleRangesChangeEvent) => {
    const record = eventCreators.createCodioVisibleRangeEvent(e);
    if (record) {
      this.records.push(record);
    }
  };

  private onDidChangeTextEditorSelection = (e: TextEditorSelectionChangeEvent) => {
    const record = eventCreators.createCodioSelectionEvent(e);
    if (record) {
      this.records.push(record);
    }
  };
}
