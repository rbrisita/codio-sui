import { ChildProcess, exec, spawn } from 'child_process';
import { getDeviceList } from './ffmpegDeviceListParser';
import { isWindows, isMacOs, findPID, getExtensionPath } from '../utils';
import { sep } from 'path';

/**
 * Possible audio process states.
 */
enum State {
  NONE,
  PLAYING,
  RECORDING,
  PAUSE,
}

export default class AudioHandler {
  audioFilePath: string;
  private processPID: number;
  private currentAudioProcess: ChildProcess;
  private audioInputDevice: string;
  private state: State;

  constructor(path: string) {
    this.audioFilePath = path;
  }

  async setDevice(prompt: (items: string[]) => Promise<string | undefined>): Promise<boolean> {
    if (isWindows || isMacOs) {
      const deviceList: DeviceList = await getDeviceList();
      const audioDevices: Device[] = deviceList.audioDevices;
      if (audioDevices.length) {
        if (audioDevices.length > 1) {
          const deviceName = await prompt(audioDevices.map((device: Device) => device.name));
          if (deviceName) {
            this.audioInputDevice = deviceName;
          }
        } else {
          this.audioInputDevice = audioDevices[0].name;
        }
      }
      if (!this.audioInputDevice) {
        return false;
      } else {
        return true;
      }
    }
  }

  async record(): Promise<void> {
    if (isWindows) {
      this.currentAudioProcess = spawn(
        'ffmpeg',
        [
          '-hide_banner',
          '-nostats',
          '-loglevel',
          'error',
          '-f',
          'dshow',
          '-i',
          `audio="${this.audioInputDevice}"`,
          '-y',
          this.audioFilePath,
        ],
        { shell: 'powershell.exe' }, // Using powershell will result in one instance to handle
      );
      try {
        this.processPID = await findPID('ffmpeg.exe');
      } catch (error) {
        console.log('Audio record', error);
      }
    } else {
      this.currentAudioProcess = exec(`ffmpeg -f avfoundation -i :"${this.audioInputDevice}" ${this.audioFilePath}`);
    }
    this.state = State.RECORDING;
  }

  async stopRecording(): Promise<string | void> {
    return this.stopAudioProcess();
  }

  /**
   * Play audio file with no visuals and exit when done.
   * @param time Time in seconds to seek into audio file.
   */
  play(time: number): void {
    this.currentAudioProcess = exec(`ffplay -hide_banner -nodisp -nostats -autoexit -ss ${time} ${this.audioFilePath}`);
    this.state = State.PLAYING;
  }

  /**
   * Pause when playing or recording audio.
   * @returns Void
   */
  async pause(): Promise<void> {
    if (!this.state || this.state === State.PAUSE) {
      return;
    }

    if (this.state === State.PLAYING) {
      await this.stopAudioProcess();
      return;
    }

    if (isWindows) {
      const { suspend } = await import(`..${sep}..${sep}dependencies${sep}win${sep}win32-${process.arch}_lib.node`);
      suspend(this.processPID);
    } else {
      this.currentAudioProcess.kill('SIGSTOP');
    }

    this.state = State.PAUSE;
  }

  /**
   * Resume audio recording process.
   * @returns Void
   */
  async resume(): Promise<void> {
    if (this.state !== State.PAUSE) {
      return;
    }

    if (isWindows) {
      const { resume } = await import(`..${sep}..${sep}dependencies${sep}win${sep}win32-${process.arch}_lib.node`);
      resume(this.processPID);
    } else {
      this.currentAudioProcess.kill('SIGCONT');
    }

    this.state = State.RECORDING;
  }

  /**
   * Stop audio process in regards to OS.
   */
  private stopAudioProcess(): Promise<string | void> {
    const proc = this.currentAudioProcess;
    // TODO: might crash because pause and stop are called in recorder
    // check proc.killed if so
    if (isWindows) {
      if (this.isRecording()) {
        // Kill if VS Code process exits before audio process
        process.once('exit', this.taskKill);

        // Listen to process events and handle accordingly
        const p = new Promise<string | void>((res, rej) => {
          proc.once('exit', (code, signal) => {
            if (this.exitWin32Process(code, signal)) {
              this.clear();
              res();
            } else {
              rej('stopAudioProcess exitWin32Process Error');
            }
          });
          proc.once('error', (err) => {
            process.removeListener('exit', this.taskKill);
            this.taskKill();
            rej(err.message);
          });
        });

        this.quitRecording();

        return p;
      }

      this.taskKill();
    } else {
      proc.kill();
      this.clear();
    }
  }

  /**
   * Check if the current process writeable.
   * @return True if writeable, false otherwise.
   */
  private isRecording(): boolean {
    return this.currentAudioProcess?.stdin.writable && this.state === State.RECORDING;
  }

  /**
   * Quit recording on ffmpeg by sending 'q' to the process input.
   * Only valid if duration argument not given when executed.
   */
  private quitRecording() {
    this.currentAudioProcess.stdin.write('q');
  }

  /**
   * Check if windows process exited cleanly.
   * @param code Exit code; 0 for no issues.
   * @param signal Signal code; null for no issues.
   * @return True on clean exit, false otherwise.
   */
  private exitWin32Process(code: number, signal: string) {
    process.removeListener('exit', this.taskKill);
    if (code || signal) {
      this.taskKill();
      return false;
    }
    return true;
  }

  /**
   * Windows specific way to kill a process when all else fails.
   * taskkill options:
   * '/pid' Process Id to kill.
   * '/f' Force.
   * '/t' Terminate any children.
   */
  private taskKill() {
    spawn('taskkill', ['/pid', this.currentAudioProcess?.pid.toString(), '/f', '/t']);
    this.clear();
  }

  /**
   * Clear process and reset state.
   */
  private clear(): void {
    this.currentAudioProcess = null;
    this.state = State.NONE;
  }
}
