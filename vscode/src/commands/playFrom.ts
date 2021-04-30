import Player from '../player/Player';
import FSManager from '../filesystem/FSManager';
import { showPlayFromInputBox, UI, MESSAGES } from '../user_interface/messages';

/**
 * Play codio from given milliseconds time.
 * @param fsManager File System Manager.
 * @param player Player to activate.
 * @param time Given milliseconds time to play from.
 */
export default async function playFrom(fsManager: FSManager, player: Player, time?: number): Promise<void> {
  // Select a codio to play if none selected prior.
  if (!player?.codioLength) {
    const itemSelected = await fsManager.chooseCodio();
    if (!itemSelected?.path) {
      UI.showMessage(MESSAGES.noActiveCodio);
      return;
    }

    await player.loadCodio(itemSelected.path, itemSelected.workspaceRoot?.fsPath);
  }

  // Ask for a time if none given.
  if (!time) {
    let timeInSeconds = parseInt(await showPlayFromInputBox(player));

    // Validate input
    if (isNaN(timeInSeconds)) {
      UI.showMessage(MESSAGES.noStartTime);
      return;
    } else if (timeInSeconds < 0) {
      timeInSeconds = 0;
    } else if (timeInSeconds > player.codioLength / 1000) {
      timeInSeconds = player.codioLength / 1000;
    }

    time = timeInSeconds * 1000;
  }

  player.playFrom(time);
  UI.showPlayerStatusBar(player);
}
