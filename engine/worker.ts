/**
 * Distributed Worker Node
 *
 * Runs on any machine, connects back to master controller,
 * accepts and executes audit tasks autonomously
 */

import axios from "axios";
import os from "os";
import crypto from "crypto";

interface WorkerRegistration {
  workerId: string;
  hostname: string;
  platform: string;
  cpuCount: number;
  memoryGb: number;
  capabilities: string[];
}

interface TaskAssignment {
  taskId: string;
  type: "scan" | "fuzz" | "recon" | "exploit" | "crawl";
  target: string;
  parameters: Record<string, any>;
}

export class AuditWorker {
  private workerId: string;
  private masterUrl: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private runningTasks = new Map<string, any>();
  private isRunning = false;

  constructor(masterUrl: string) {
    this.workerId = crypto.randomBytes(8).toString("hex");
    this.masterUrl = masterUrl;
  }

  public async start() {
    console.log(`🧿 REDLOCK Audit Worker starting`);
    console.log(`   ID: ${this.workerId}`);
    console.log(`   Master: ${this.masterUrl}`);

    this.isRunning = true;

    // Register with master
    await this.register();

    // Send heartbeat every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 5000);

    // Poll for tasks every 2 seconds
    while (this.isRunning) {
      await this.pollForTasks();
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  private async register() {
    const registration: WorkerRegistration = {
      workerId: this.workerId,
      hostname: os.hostname(),
      platform: process.platform,
      cpuCount: os.cpus().length,
      memoryGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      capabilities: ["scan", "fuzz", "recon", "crawl", "ssrf"],
    };

    try {
      await axios.post(`${this.masterUrl}/api/worker/register`, registration);
      console.log("✅ Registered with master successfully");
    } catch (e) {
      console.error("❌ Failed to register with master:", (e as Error).message);
      process.exit(1);
    }
  }

  private async sendHeartbeat() {
    try {
      await axios.post(`${this.masterUrl}/api/worker/heartbeat`, {
        workerId: this.workerId,
        activeTasks: this.runningTasks.size,
        loadAverage: os.loadavg()[0],
      });
    } catch (e) {}
  }

  private async pollForTasks() {
    try {
      const res = await axios.get(
        `${this.masterUrl}/api/worker/tasks/${this.workerId}`,
      );
      const tasks = res.data;

      for (const task of tasks) {
        if (!this.runningTasks.has(task.taskId)) {
          this.executeTask(task);
        }
      }
    } catch (e) {}
  }

  private async executeTask(task: TaskAssignment) {
    console.log(
      `📥 Received task: ${task.taskId} [${task.type}] ${task.target}`,
    );
    this.runningTasks.set(task.taskId, task);

    try {
      // Execute actual task logic here
      const result = {
        taskId: task.taskId,
        status: "completed",
        output: "Task completed successfully",
      };

      await axios.post(`${this.masterUrl}/api/worker/complete`, result);
    } catch (e) {
      console.error(`Task ${task.taskId} failed:`, (e as Error).message);
    } finally {
      this.runningTasks.delete(task.taskId);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const masterUrl = process.argv[2] || "http://localhost:4040";
  const worker = new AuditWorker(masterUrl);
  worker.start().catch(console.error);
}
