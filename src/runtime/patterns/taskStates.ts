export type TaskStatus =
  | "pending"
  | "scheduled"
  | "running"
  | "paused"
  | "success"
  | "warning"
  | "error"
  | "completed"
  | "failed"
  | "killed"
  | "cancelled"
  | "timeout";

export interface Task {
  id: string;
  subject: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;
  owner?: string;
  metadata?: {
    progress?: number;
    [key: string]: unknown;
  };
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return ["success", "warning", "error", "completed", "failed", "killed", "cancelled", "timeout"].includes(status);
}

export async function listTasks(): Promise<Task[]> {
  return [];
}
