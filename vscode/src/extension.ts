import { commands, ExtensionContext, Uri } from 'vscode';
import { UI, showCodioNameInputBox } from './user_interface/messages';
import Player from './player/Player';
import Recorder from './recorder/Recorder';
import { registerTreeViews } from './user_interface/Viewers';
import FSManager from './filesystem/FSManager';
import * as COMMAND_NAMES from './consts/command_names';
import * as codioCommands from './commands/index';
import { createSdk } from './sdk';
import { getWorkspaceUriAndCodioDestinationUri } from './filesystem/workspace';

const fsManager = new FSManager();
const player = new Player();
const recorder = new Recorder();

const {
  recordCodio,
  saveRecording,
  playCodio,
  playCodioTask,
  playFrom,
  pauseCodio,
  pauseOrResume,
  resumeCodio,
  rewind,
  forward,
} = createSdk(player, recorder, fsManager);

export {
  recordCodio,
  saveRecording,
  playCodio,
  playCodioTask,
  playFrom,
  pauseCodio,
  pauseOrResume,
  resumeCodio,
  rewind,
  forward,
};

export async function activate(context: ExtensionContext) {
  await fsManager.createExtensionFolders();
  UI.shouldDisplayMessages = true;
  UI.createStatusBar(context);
  registerTreeViews(fsManager, context.extensionPath);

  const recordCodioDisposable = commands.registerCommand(
    COMMAND_NAMES.RECORD_CODIO,
    async (destination?: Uri, workspaceRoot?: Uri) => {
      codioCommands.recordCodio(fsManager, player, recorder, destination, workspaceRoot, showCodioNameInputBox);
    },
  );

  const recordCodioToProjectDisposable = commands.registerCommand(
    COMMAND_NAMES.RECORD_CODIO_TO_PROJECT,
    async () => {
      const rp: RecordProject = await getWorkspaceUriAndCodioDestinationUri();
      if (rp.workspaceUri && rp.codioUri && rp.getCodioName) {
        codioCommands.recordCodio(fsManager, player, recorder, rp.codioUri, rp.workspaceUri, rp.getCodioName);
      }
    },
  );

  const saveRecordingDisposable = commands.registerCommand(COMMAND_NAMES.SAVE_RECORDING, () => {
    codioCommands.saveRecording(recorder);
  });

  const playCodioDisposable = commands.registerCommand(
    COMMAND_NAMES.PLAY_CODIO,
    async (source: Uri, workspaceUri?: Uri) => {
      codioCommands.playCodio(fsManager, player, recorder, source, workspaceUri);
    },
  );

  const playCodioTaskDisposable = commands.registerCommand(
    COMMAND_NAMES.PLAY_CODIO_TASK,
    async (source: Uri, workspaceUri?: Uri) => {
      codioCommands.playCodioTask(fsManager, player, recorder, source, workspaceUri);
    },
  );
  
  const playFromDisposable = commands.registerCommand(COMMAND_NAMES.PLAY_FROM, async (time?: number) => {
    codioCommands.playFrom(fsManager, player, time);
  });

  const stopCodioDisposable = commands.registerCommand(COMMAND_NAMES.STOP_CODIO, () => {
    player.stop();
  });

  const pauseCodioDisposable = commands.registerCommand(COMMAND_NAMES.PAUSE_CODIO, () => {
    codioCommands.pauseCodio(player);
  });

  const pauseOrResumeDisposable = commands.registerCommand(COMMAND_NAMES.PAUSE_OR_RESUME, () => {
    codioCommands.pauseOrResume(player);
  });

  const resumeCodioDisposable = commands.registerCommand(COMMAND_NAMES.RESUME_CODIO, () => {
    codioCommands.resumeCodio(player);
  });

  const rewindDisposable = commands.registerCommand(COMMAND_NAMES.REWIND, async (time?: number) => {
    codioCommands.rewind(player, time);
  });

  const forwardDisposable = commands.registerCommand(COMMAND_NAMES.FORWARD, async (time?: number) => {
    codioCommands.forward(player, time);
  });

  const trimEnd = commands.registerCommand(COMMAND_NAMES.TRIM_END, async () => {
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

export function deactivate() {
  player.closeCodio();
  recorder.stopRecording();
}
