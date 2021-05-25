import { Position, Range } from 'vscode';
import { replaceRange, nthIndex } from '../../utils';

export default class ShadowDocument {
  text: string;

  constructor(text: string) {
    this.text = text;
    return this;
  }

  replaceWithPosition(position: Position, substitute: string): void {
    try {
      const start = this.transformPositionToIndex(position, this.text);
      const end = start;
      this.text = replaceRange(this.text, start, end, substitute);
    } catch (e) {
      console.log('replace failed', { position, substitute });
    }
  }

  replaceWithRange(range: Range, substitute: string): void {
    try {
      const start = this.transformPositionToIndex(range.start, this.text);
      const end = this.transformPositionToIndex(range.end, this.text);
      this.text = replaceRange(this.text, start, end, substitute);
    } catch (e) {
      console.log('replaceWithRange failed', { range, substitute });
    }
  }

  private transformPositionToIndex(position: Position, str: string): number {
    if (position.line !== 0) {
      const startLineIndex = nthIndex(str, '\n', position.line);
      return startLineIndex + position.character + 1;
    } else {
      return position.character;
    }
  }
}
