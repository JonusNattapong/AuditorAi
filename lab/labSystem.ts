import * as fs from "fs";
import * as path from "path";
import { createInterface } from "readline";

const PROGRESS_FILE = path.join(__dirname, ".progress.json");

export interface LabLevel {
  id: number;
  name: string;
  description: string;
  flag: string;
  run: () => Promise<boolean>;
  unlocked: boolean;
  completed: boolean;
}

export interface ProgressState {
  completedLevels: number[];
  currentLevel: number;
  lastPlayed: string;
}

export class LabSystem {
  private levels: Map<number, LabLevel> = new Map();
  private progress: ProgressState;
  private rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  constructor() {
    this.progress = this.loadProgress();
    this.initializeLevels();
  }

  private loadProgress(): ProgressState {
    try {
      if (fs.existsSync(PROGRESS_FILE)) {
        const data = fs.readFileSync(PROGRESS_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch {}

    return {
      completedLevels: [],
      currentLevel: 1,
      lastPlayed: new Date().toISOString(),
    };
  }

  private saveProgress(): void {
    this.progress.lastPlayed = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
  }

  private initializeLevels(): void {
    const levelsPath = path.join(__dirname, "levels.json");
    const levelData = JSON.parse(fs.readFileSync(levelsPath, "utf8"));

    const levelDefinitions = levelData.map((l: any) => ({
      id: parseInt(l.id),
      name: l.name,
      description: l.description,
      flag: l.flag,
    }));

    levelDefinitions.forEach((def: any) => {
      this.levels.set(def.id, {
        ...def,
        run: this.createLevelRunner(def.id),
        unlocked:
          def.id === 1 || this.progress.completedLevels.includes(def.id - 1),
        completed: this.progress.completedLevels.includes(def.id),
      } as any);
    });
  }

  private createLevelRunner(levelId: number): () => Promise<boolean> {
    return async (): Promise<boolean> => {
      console.log(`\n📦 กำลังโหลดเลเวล ${levelId}...`);

      // Try to load dynamic level module
      try {
        const levelPath = path.join(
          __dirname,
          "levels",
          `level${levelId.toString().padStart(2, "0")}.ts`,
        );
        if (fs.existsSync(levelPath)) {
          const levelModule = await import(levelPath);
          if (typeof levelModule.run === "function") {
            return await levelModule.run();
          }
        }
      } catch (e) {
        console.log(`⚠️  ไม่พบโมดูลเลเวล ${levelId}, ใช้โหมดทดสอบแทน`);
      }

      // Demo fallback runner
      return await this.demoLevelRunner(levelId);
    };
  }

  private async demoLevelRunner(levelId: number): Promise<boolean> {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║            LEVEL ${levelId}                        ║`);
    console.log(`╚════════════════════════════════════════════╝`);
    console.log(`\n💡 หมายเหตุ: นี่คือโหมดทดสอบสำหรับเลเวล ${levelId}`);

    return new Promise((resolve) => {
      this.rl.question("\n🔑 ป้อน Flag สำหรับเลเวลนี้: ", (input) => {
        const level = this.levels.get(levelId);
        if (level && input.trim() === level.flag) {
          console.log("\n✅ ถูกต้อง! คุณผ่านเลเวลนี้แล้ว");
          resolve(true);
        } else {
          console.log("\n❌ Flag ไม่ถูกต้อง ลองอีกครั้ง");
          resolve(false);
        }
      });
    });
  }

  public async showMainMenu(): Promise<void> {
    console.clear();
    this.printHeader();
    this.printProgressBar();
    this.printLevelList();

    this.rl.question(
      "\n👉 เลือกเลเวลที่จะเล่น (0 เพื่อออก): ",
      async (input) => {
        const choice = parseInt(input.trim(), 10);

        if (choice === 0) {
          console.log("\n👋 ลาก่อน!");
          this.rl.close();
          process.exit(0);
        }

        if (this.levels.has(choice)) {
          const level = this.levels.get(choice)!;
          if (!level.unlocked) {
            console.log("\n🔒 เลเวลนี้ยังล็อคอยู่! ให้ผ่านเลเวลก่อนหน้าก่อน");
            setTimeout(() => this.showMainMenu(), 2000);
            return;
          }

          await this.runLevel(choice);
        } else {
          console.log("\n❌ ไม่มีเลเวลนี้ กรุณาเลือกอีกครั้ง");
          setTimeout(() => this.showMainMenu(), 1500);
        }
      },
    );
  }

  private printHeader(): void {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ███╗   ███╗██╗██████╗ ██╗   ██╗     ██╗ ██████╗ ██╗    ║
║   ████╗ ████║██║██╔══██╗██║   ██║     ██║██╔═══██╗██║    ║
║   ██╔████╔██║██║██████╔╝██║   ██║     ██║██║   ██║██║    ║
║   ██║╚██╔╝██║██║██╔══██╗██║   ██║██   ██║██║   ██║██║    ║
║   ██║ ╚═╝ ██║██║██████╔╝╚██████╔╝╚█████╔╝╚██████╔╝██║    ║
║   ╚═╝     ╚═╝╚═╝╚═════╝  ╚═════╝  ╚════╝  ╚═════╝ ╚═╝    ║
║                                                          ║
║               Security Training Lab                      ║
╚══════════════════════════════════════════════════════════╝
`);
  }

  private printProgressBar(): void {
    const total = this.levels.size;
    const completed = this.progress.completedLevels.length;
    const percentage = Math.round((completed / total) * 100);
    const barLength = 40;
    const filled = Math.round((completed / total) * barLength);

    console.log(`\n📊 ความก้าวหน้า: ${completed}/${total} (${percentage}%)`);
    console.log(`├${"█".repeat(filled)}${"░".repeat(barLength - filled)}┤`);
  }

  private printLevelList(): void {
    console.log("\n📋 รายการเลเวล:");
    console.log("─────────────────────────────────────────────────────");

    this.levels.forEach((level) => {
      let statusIcon = "🔒";
      if (level.completed) statusIcon = "✅";
      else if (level.unlocked) statusIcon = "🔓";

      console.log(
        `  ${statusIcon} ${level.id.toString().padStart(2, " ")}. ${level.name.padEnd(25)} ${level.completed ? "✓ ผ่านแล้ว" : level.unlocked ? "พร้อมเล่น" : "ยังล็อค"}`,
      );
      if (level.unlocked && !level.completed) {
        console.log(`       └─ ${level.description}`);
      }
    });
  }

  private async runLevel(levelId: number): Promise<void> {
    const level = this.levels.get(levelId)!;

    const success = await level.run();

    if (success) {
      if (!this.progress.completedLevels.includes(levelId)) {
        this.progress.completedLevels.push(levelId);
        this.saveProgress();

        // Unlock next level
        const nextLevel = this.levels.get(levelId + 1);
        if (nextLevel) {
          nextLevel.unlocked = true;
          console.log(`\n🔓 เลเวล ${levelId + 1} ถูกปลดล็อคแล้ว!`);
        }

        // Check if all completed
        if (this.progress.completedLevels.length === this.levels.size) {
          console.log(
            "\n🎉🎉🎉 ยินดีด้วย! คุณผ่านทุกเลเวลใน RedLock Lab แล้ว! 🎉🎉🎉",
          );
        }
      }
    }

    this.rl.question("\nกด Enter เพื่อกลับไปที่เมนูหลัก...", () => {
      this.initializeLevels(); // Refresh state
      this.showMainMenu();
    });
  }

  public validateFlag(levelId: number, flag: string): boolean {
    const level = this.levels.get(levelId);
    return level ? level.flag === flag.trim() : false;
  }

  public getCompletedLevels(): number[] {
    return [...this.progress.completedLevels];
  }

  public isUnlocked(levelId: number): boolean {
    const level = this.levels.get(levelId);
    return level ? level.unlocked : false;
  }

  public resetProgress(): void {
    this.progress = {
      completedLevels: [],
      currentLevel: 1,
      lastPlayed: new Date().toISOString(),
    };
    this.saveProgress();
    this.initializeLevels();
    console.log("\n🔄 รีเซ็ตความคืบหน้าทั้งหมดแล้ว");
  }
}

// Auto start if run directly
if (typeof require !== "undefined" && require.main === module) {
  const lab = new LabSystem();
  lab.showMainMenu();
}

export default LabSystem;
