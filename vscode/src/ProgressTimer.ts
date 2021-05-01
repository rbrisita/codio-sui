/**
 * Keep track of time passed and alert any observers.
 */
export default class CodioProgressTimer {
  codioLength: number | undefined;
  timer: NodeJS.Timer;
  currentSecond: number;

  private onUpdateObservers: Array<(currentSecond: number, totalSeconds: number) => void> = [];
  private onFinishObservers: Array<() => void> = [];

  constructor(codioLength?: number) {
    this.codioLength = codioLength;
  }

  /**
   * Add given observer to be notified when timer finished.
   * @param observer Function to be executed when timer finishes.
   */
  onFinish(observer: () => void): void {
    this.onFinishObservers.push(observer);
  }

  /**
   * Add given obeserver to be notified on timer updates.
   * @param observer Function to be executed receiving current second and total seconds if applicable.
   */
  onUpdate(observer: (currentSecond: number, totalSeconds: number) => void): void {
    this.onUpdateObservers.push(observer);
  }

  stop(): void {
    clearInterval(this.timer);
  }

  /**
   * Run timer and alert observers on update and on finish.
   * @param codioTime Time to set current second to.
   */
  run(codioTime = 0): void {
    try {
      if (this.timer) {
        clearInterval(this.timer);
      }

      this.currentSecond = codioTime;
      this.timer = setInterval(() => {
        this.currentSecond++;

        if (this.codioLength && this.currentSecond > this.codioLength / 1000) {
          this.onFinishObservers.forEach((observer) => observer());
          clearInterval(this.timer);
          this.onUpdateObservers.forEach((observer) => observer(this.codioLength / 1000, this.codioLength / 1000));
        } else {
          this.onUpdateObservers.forEach((observer) => observer(this.currentSecond, this.codioLength / 1000));
        }
      }, 1000);
    } catch (e) {
      console.log('report progress error,', e);
    }
  }
}
