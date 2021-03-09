import * as vscode from 'vscode';
import { workspace, Uri } from 'vscode';
import { showCodioNameInputBox, UI, MESSAGES } from '../user_interface/messages';
import { basename, join } from 'path';
import { ensureDir } from './saveProjectFiles';
import { existsSync } from 'fs';

const createWorkspaceCodiosFolder = async (workspaceUri: Uri) => {
  const codioWorkspaceFolder = join(workspaceUri.fsPath, '.codio');
  await ensureDir(codioWorkspaceFolder);
  return codioWorkspaceFolder;
};

export const getWorkspaceUriAndCodioDestinationUri = async (): Promise<Record<string, unknown>> => {
  let workspaceUri: Uri = null;
  let codioUri: Uri = null;
  let getCodioName: () => Promise<string> = null;

  if (workspace.workspaceFolders) {
    let name = await showCodioNameInputBox();
    if (name) {
      workspaceUri = workspace.workspaceFolders[0].uri;
      codioUri = await getAvailableUri(name, workspaceUri);
      name = basename(codioUri.path, '.codio');
      getCodioName = async () => name;
    }
  } else {
    UI.showMessage(MESSAGES.noActiveWorkspace);
  }

  return { workspaceUri, codioUri, getCodioName };
};

/**
 * Get a URI that does not exist and safe to write to.
 * @param name Name to save codio to.
 * @param workspaceUri Workspace folder to save codio to.
 * @returns A safe URI to write the new given codio to.
 */
const getAvailableUri = async (name: string, workspaceUri: Uri): Promise<vscode.Uri> => {
  let uri: Uri;
  let append = '';
  let count = 0;
  let filename;
  let fileStat: vscode.FileStat;
  const codioWorkspaceFolderPath = await createWorkspaceCodiosFolder(workspaceUri);

  do {
    filename = `${name.split(' ').join('_')}${append}.codio`;
    uri = Uri.file(join(codioWorkspaceFolderPath, filename));
    try {
      fileStat = await vscode.workspace.fs.stat(uri);
      if (fileStat.type === vscode.FileType.File) {
        count++;
        append = `_${count.toString().padStart(2, '0')}`;
      }
    } catch (e) { // File doesn't exist and available to write to.
      fileStat = null;
    }
  } while (fileStat);

  return uri;
}

export const getWorkspaceRootAndCodiosFolder = ():
  | { workspaceRootUri: Uri; workspaceCodiosFolder: string }
  | undefined => {
  const workspaceRootUri = workspace.workspaceFolders[0]?.uri;
  if (workspaceRootUri) {
    const workspaceCodiosFolder = join(workspaceRootUri.fsPath, '.codio');
    if (existsSync(workspaceCodiosFolder)) {
      return { workspaceCodiosFolder, workspaceRootUri };
    }
  }
};
