import type { ToolContext } from "./toolPermission";

export interface SkillManager {
  context: ToolContext;
}

export function createSkillManager(context: ToolContext): SkillManager {
  return { context };
}
