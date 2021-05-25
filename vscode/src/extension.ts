import { commands, ExtensionContext, Uri } from 'vscode';
import { UI, showCodioNameInputBox } from './user_interface/messages';
import Player from './player/Player';
import Recorder from './recorder/Recorder';
import { registerTreeViews } from './user_interface/Viewers';
import FSManager from './filesystem/FSManager';
import { codioCommands, CommandNames } from './commands';
import { getWorkspaceUriAndCodioDestinationUri } from './filesystem/workspace';

const fsManager = new FSManager();
const player = new Player();
const recorder = new Recorder();

export async function activate(context: ExtensionContext): Promise<void> {
  await fsManager.createExtensionFolders();
  UI.shouldDisplayMessages = true;
  UI.createStatusBar(context);
  registerTreeViews(fsManager, context.extensionPath);

  const recordCodioDisposable = commands.registerCommand(
    CommandNames.RECORD_CODIO,
    async (destination?: Uri, workspaceRoot?: Uri) => {
      codioCommands.recordCodio(fsManager, player, recorder, destination, workspaceRoot, showCodioNameInputBox);
    },
  );

  const recordCodioToProjectDisposable = commands.registerCommand(CommandNames.RECORD_CODIO_TO_PROJECT, async () => {
    const rp: RecordProject = await getWorkspaceUriAndCodioDestinationUri();
    if (rp.workspaceUri && rp.codioUri && rp.getCodioName) {
      codioCommands.recordCodio(fsManager, player, recorder, rp.codioUri, rp.workspaceUri, rp.getCodioName);
    }
  });

  const saveRecordingDisposable = commands.registerCommand(CommandNames.SAVE_RECORDING, () => {
    codioCommands.saveRecording(recorder);
  });

  const playCodioDisposable = commands.registerCommand(
    CommandNames.PLAY_CODIO,
    async (source: Uri, workspaceUri?: Uri) => {
      codioCommands.playCodio(fsManager, player, recorder, source, workspaceUri);
    },
  );

  const playCodioTaskDisposable = commands.registerCommand(
    CommandNames.PLAY_CODIO_TASK,
    async (source: Uri, workspaceUri?: Uri) => {
      codioCommands.playCodioTask(fsManager, player, recorder, source, workspaceUri);
    },
  );

  const playFromDisposable = commands.registerCommand(CommandNames.PLAY_FROM, async (time?: number) => {
    codioCommands.playFrom(fsManager, player, time);
  });

  const stopCodioDisposable = commands.registerCommand(CommandNames.STOP_CODIO, () => {
    player.stop();
  });

  const pauseCodioDisposable = commands.registerCommand(CommandNames.PAUSE_CODIO, () => {
    codioCommands.pauseCodio(player);
  });

  const pauseOrResumeDisposable = commands.registerCommand(CommandNames.PAUSE_OR_RESUME, () => {
    codioCommands.pauseOrResume(player);
  });

  const resumeCodioDisposable = commands.registerCommand(CommandNames.RESUME_CODIO, () => {
    codioCommands.resumeCodio(player);
  });

  const rewindDisposable = commands.registerCommand(CommandNames.REWIND, async (time?: number) => {
    codioCommands.rewind(player, time);
  });

  const forwardDisposable = commands.registerCommand(CommandNames.FORWARD, async (time?: number) => {
    codioCommands.forward(player, time);
  });

  const trimEnd = commands.registerCommand(CommandNames.TRIM_END, async () => {
    codioCommands.trimEnd(player);
  });

  context.subscriptions.push(recordCodioDisposable);
  context.subscriptions.push(saveRecordingDisposable);
  context.subscriptions.push(recordCodioToProjectDisposable);
  context.subscriptions.push(playCodioDisposable);
  context.subscriptions.push(playCodioTaskDisposable);
  context.subscriptions.push(stopCodioDisposable);
  context.subscriptions.push(pauseCodioDisposable);
  context.subscriptions.push(resumeCodioDisposable);
  context.subscriptions.push(playFromDisposable);
  context.subscriptions.push(rewindDisposable);
  context.subscriptions.push(forwardDisposable);
  context.subscriptions.push(pauseOrResumeDisposable);
  context.subscriptions.push(trimEnd);
}

export function deactivate(): void {
  player.closeCodio();
  recorder.stopRecording();
}
