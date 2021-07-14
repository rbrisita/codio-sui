import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as util from 'util';
import { platform } from 'os';
import { sep } from 'path';

//filesystem
export const createReadStream = fs.createReadStream;
export const promiseExec = util.promisify(exec);
export const readFile = util.promisify(fs.readFile);
export const writeFile = util.promisify(fs.writeFile);
export const readdir = util.promisify(fs.readdir);
export const unlink = util.promisify(fs.unlink);
export const mkdir = util.promisify(fs.mkdir);
export const exists = util.promisify(fs.exists);

export const isWindows = platform() === 'win32';
export const isMacOs = platform() === 'darwin';

export const uriSeperator = '/';
//ffmpeg
export const checkForFfmpeg = async (): Promise<unknown> => {
  return new Promise((res) => {
    exec('ffmpeg -h', (error) => {
      res(!error);
    });
  });
};

//editor
export async function overrideEditorText(editor: vscode.TextEditor, newText: string): Promise<void> {
  const invalidRange = new vscode.Range(0, 0, editor.document.lineCount /*intentionally missing the '-1' */, 0);
  const fullRange = editor.document.validateRange(invalidRange);
  await editor.edit((edit) => edit.replace(fullRange, newText));
}

export function getTextEditor(path: string): vscode.TextEditor {
  return vscode.window.visibleTextEditors.find((editor) => editor.document.uri.path === path);
}
//strings
export function replaceRange(s: string, start: number, end: number, substitute: string): string {
  return s.substring(0, start) + substitute + s.substring(end);
}

export function nthIndex(str: string, pat: string, n: number): number {
  const L = str.length;
  let i = -1;
  while (n-- && i++ < L) {
    i = str.indexOf(pat, i);
    if (i < 0) {
      break;
    }
  }
  return i;
}

/**
 * After each interation wait for callback to return to continue.
 * @param array Array to iterate through and pass to callback.
 * @param callback Callback to wait on.
 */
export async function asyncForEach(
  array: Array<unknown>,
  callback: (elem: unknown, i: number, arr: Array<unknown>) => unknown,
): Promise<void> {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

/**
 * Check if given object is a tree item.
 * @param obj Object to check properties on.
 * @returns Return true if given object is a tree item; false otherwise.
 */
export function isTreeItem(obj = {}): boolean {
  return 'contextValue' in obj || 'command' in obj;
}

/**
 * Finds Process Id of given command. This is Windows based because of how
 * some third party package managers install shims.
 * @see https://github.com/lukesampson/scoop/issues/4376
 * @param cmd Command to find in the tasklist.
 * @returns Resolves to PID found or error strings if rejected.
 */
export function findPID(cmd: string): Promise<number> {
  return new Promise((res, rej) => {
    let output = '';

    const callAndParse = (cmd: string) => {
      const taskListProcess = spawn('tasklist.exe', ['/FI', `"IMAGENAME eq ${cmd}"`, '/FO', 'CSV', '/NH'], {
        shell: 'powershell.exe',
      });

      taskListProcess.stderr.on('data', (data) => {
        rej(data.toString());
      });

      // Compile data received
      taskListProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      taskListProcess.on('close', (code) => {
        if (code) {
          rej(`Error code: ${code}`);
        }

        const arr = getLastLine(output).split(',');
        if (arr.length < 2) {
          rej('PID in array not found.');
        }

        const pid = parseInt(arr[1]);
        pid > 0 ? res(pid) : rej('Valid PID not found.');
      });
    };

    callAndParse(cmd);
  });
}

/**
 * Get the last non-empty line from the given output.
 * @param output Output to parse.
 * @returns String found or empty string on no data.
 */
function getLastLine(output: string): string {
  let lines = output.split('\n');
  lines = lines.filter((line) => line.length);
  const last = lines[lines.length - 1];
  return last.replace(/"/gm, '');
}

let extensionPath = null;

/**
 * Save extension path for later use.
 * @param path Path of extension being executed.
 */
export function saveExtensionPath(path: string): void {
  extensionPath = path;
}

/**
 * Get path to the extension being executed.
 * @returns The path to the extension being executed.
 */
export function getExtensionPath(): string {
  return extensionPath;
}

/**
 * Check if dependencies need to be installed.
 * @returns Resolve to true if all dependencies are available.
 */
export async function checkDependencies(): Promise<boolean> {
  // TODO: ffmpeg

  // Recorder Pause/Resume
  if (isWindows) {
    const libPath = `${getExtensionPath()}${sep}dependencies${sep}win${sep}win32-${process.arch}_lib.node`;
    const fileExists = await exists(libPath);
    if (!fileExists) {
      return await installWindowsPauseResume();
    }
  }

  return true;
}

/**
 * Install ntsuspend.
 */
async function installWindowsPauseResume(): Promise<boolean> {
  const libPath = `${getExtensionPath()}${sep}dependencies${sep}win${sep}install.cjs`;

  return new Promise((res, rej) => {
    try {
      const cp = spawn('node', ['--unhandled-rejections=strict', libPath]);
      cp.on('close', (code) => {
        if (code) {
          console.error('installWindowsPauseResume process error code:', code);
          rej(false);
        }

        res(true);
      });

      cp.on('error', (data) => {
        console.error('installWindowsPauseResume error data', data.toString());
      });
      cp.stderr.on('data', (data) => {
        console.info('installWindowsPauseResume info:', data.toString());
      });
    } catch (error) {
      console.error('Install Error', error.message);
      rej(false);
    }
  });
}
