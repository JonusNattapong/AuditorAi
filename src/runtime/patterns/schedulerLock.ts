export class SchedulerLock {
  async acquire(): Promise<boolean> {
    return true;
  }

  async release(): Promise<void> {}
}
