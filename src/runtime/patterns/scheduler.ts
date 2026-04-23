import { SchedulerPersistence } from "./schedulerPersistence";

type MissionRunner = (target: string, extraContext: string) => Promise<void>;

export class SwarmScheduler {
  constructor(private readonly runMission: MissionRunner) {}

  async start(): Promise<void> {
    await SchedulerPersistence.readMissions();
  }

  async runNow(target: string, extraContext = ""): Promise<void> {
    await this.runMission(target, extraContext);
  }
}
