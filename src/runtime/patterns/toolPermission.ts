export interface ToolContext {
  permissions: Map<string, boolean>;
  capabilities: Set<string>;
  abortSignal: AbortSignal;
}

export interface SecurityTool<TPayload = unknown, TResult = unknown> {
  name: string;
  execute(payload: TPayload, context: ToolContext): Promise<TResult> | TResult;
}

export function allow(context: ToolContext, permission: string): void {
  context.permissions.set(permission, true);
}

export async function executeSecureTool<TPayload, TResult>(
  tool: SecurityTool<TPayload, TResult>,
  payload: TPayload,
  context: ToolContext,
): Promise<TResult> {
  return await tool.execute(payload, context);
}
