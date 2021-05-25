import pauseOrResume from './pauseOrResume';
import playCodio from './playCodio';
import playCodioTask from './playCodioTask';
import playFrom from './playFrom';
import { forward, rewind } from './rewindAndForward';
import resumeCodio from './resumeCodio';
import pauseCodio from './pauseCodio';
import saveRecording from './saveRecording';
import recordCodio from './recordCodio';
import trimEnd from './trimEnd';

export const codioCommands = {
  pauseOrResume,
  playCodio,
  playCodioTask,
  playFrom,
  forward,
  rewind,
  resumeCodio,
  pauseCodio,
  saveRecording,
  recordCodio,
  trimEnd,
};

export class CommandNames {
  public static readonly PLAY_CODIO = 'codio.playCodio';
  public static readonly PLAY_CODIO_TASK = 'codio.playCodioTask';
  public static readonly STOP_CODIO = 'codio.stopCodio';
  public static readonly RECORD_CODIO = 'codio.recordCodio';
  public static readonly SAVE_RECORDING = 'codio.saveRecording';
  public static readonly PAUSE_CODIO = 'codio.pauseCodio';
  public static readonly RESUME_CODIO = 'codio.resumeCodio';
  public static readonly PLAY_FROM = 'codio.playFrom';
  public static readonly UPLOAD_CODIO = 'codio.uploadCodio';
  public static readonly DOWNLOAD_CODIO = 'codio.downloadCodio';
  public static readonly SEND_MESSAGE = 'codio.sendMessage';
  public static readonly RECORD_MESSAGE = 'codio.recordMessage';
  public static readonly PLAY_MESSAGE = 'codio.playMessage';
  public static readonly REWIND = 'codio.rewind';
  public static readonly FORWARD = 'codio.forward';
  public static readonly PAUSE_OR_RESUME = 'codio.pauseOrResume';
  public static readonly RECORD_CODIO_TO_PROJECT = 'codio.recordCodioToProject';
  public static readonly TRIM_END = 'codio.trimEnd';
}
