import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import chalk from "chalk";
import crypto from "crypto";

import { SwarmCommander } from "./agent";
import configManager from "../src/config/configManager";
import promptManager from "../engine/promptManager";
import { ChatAgent } from "./chatAgent";
import * as modelCatalog from "../src/providers/modelCatalog";
import { logger } from "../src/runtime/logger";
import keyPool from "../src/providers/keyPool";
import { SwarmScheduler } from "../src/runtime/patterns/scheduler";
import { SchedulerPersistence } from "../src/runtime/patterns/schedulerPersistence";
import { SchedulerLock } from "../src/runtime/patterns/schedulerLock";
import { McpManager } from "../src/runtime/mcp/manager";
import { McpConfigManager } from "../src/runtime/mcp/config";
import { syncMcpTools } from "../src/runtime/tools/registry";

// Load persistent config first, then let .env override
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  configManager.migrateFromDotEnv(envPath);
}
configManager.ensureProfiles();
configManager.injectIntoProcessEnv();
dotenv.config({ override: true });

logger.info(`REDLOCK AUDITORAI ENGINE INITIALIZED (ELYISA POWERED)`);

const activeProvider =
  process.env.DEFAULT_PROVIDER ||
  configManager.get("DEFAULT_PROVIDER") ||
  "openai";
logger.info({ activeProvider }, "Global Provider Strategy Resolved");

const activeProfile = (configManager as any).getActiveProfile();
if (activeProfile) {
  logger.info(
    {
      profile: activeProfile.name,
      model: activeProfile.model,
      gateway: activeProfile.baseUrl,
    },
    "Active Session Profile Loaded",
  );
}

const PORT = 4040;

// Load Provider Config from JSON (Source of Truth)
const PROVIDER_DEFAULTS = modelCatalog.SUPPORTED_PROVIDERS;

// Session Store for Chat (with basic cleanup)
const chatSessions = new Map<string, ChatAgent>();
const MAX_SESSIONS = 100;
function cleanupSessions() {
  if (chatSessions.size > MAX_SESSIONS) {
    const firstKey = chatSessions.keys().next().value;
    if (firstKey) chatSessions.delete(firstKey);
  }
}

import {
  analyzeWithProvider,
  AnalysisPayload,
  GitHubContext,
  GitHubMetadata,
  TreeItem,
  buildAnalysisPrompt,
  inspectTarget,
  parseGitHubUrl,
} from "./providerUtils";

function getProviderCatalog(): Record<string, any> {
  const catalog: Record<string, any> = {};
  for (const [key, defaults] of Object.entries(PROVIDER_DEFAULTS)) {
    const d = defaults as any;
    const envKey = d.env_key;

    catalog[key] = {
      label: d.label,
      model: process.env[`${key.toUpperCase()}_MODEL`] || d.model,
      configured: d.is_local ? true : Boolean(process.env[envKey]),
      baseUrl: process.env[`${key.toUpperCase()}_BASE_URL`] || d.baseUrl,
    };
  }
  return catalog;
}

// --- DISTRIBUTED WORKER SWARM CONTROLLER ---
const connectedWorkers = new Map();
const taskQueue: any[] = [];

// ==================== ELYSIA APP ====================

const app = new Elysia()
  .use(cors())
  .use(
    staticPlugin({
      assets: "assets",
      prefix: "/assets",
    }),
  )

  .post(
    "/api/chat/compact",
    async ({ body }) => {
      const { sessionId } = body as { sessionId: string };
      const session = chatSessions.get(sessionId || "default");
      if (session) {
        await session.compact(async (prompt) => {
          // Use the coordinator to run a simple summarization mission
          // Safe access to coordinator if possible, or use public method if we had source
          const coordinator =
            (session as any).coordinator || session["coordinator"];
          if (!coordinator)
            throw new Error("Coordinator not available on session");

          const results = await coordinator.executeMission(prompt, () => {});
          return Array.from(results.values())
            .map((r: any) => r.result?.finalOutput)
            .join("\n");
        });
        return { success: true };
      } else {
        throw new Error("Session not found");
      }
    },
    {
      body: t.Object({
        sessionId: t.String(),
      }),
    },
  )

  .get("/api/health", () => ({
    ok: true,
    defaultProvider: process.env.DEFAULT_PROVIDER || "openai",
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    providers: getProviderCatalog(),
  }))

  .get("/api/models", async () => {
    try {
      const catalog = getProviderCatalog();
      const keyMap: Record<string, string> = {};
      Object.entries(catalog).forEach(([id, config]) => {
        if (config.configured) {
          const envKey =
            PROVIDER_DEFAULTS[id]?.env_key || `${id.toUpperCase()}_API_KEY`;
          keyMap[id] = process.env[envKey] || "";
        }
      });

      const results = await modelCatalog.fetchAllModels(keyMap);
      return {
        success: true,
        timestamp: new Date().toISOString(),
        providers: results,
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })

  .get(
    "/api/github/inspect",
    async ({ query }) => {
      try {
        const url = query.url as string;
        return await inspectTarget(url);
      } catch (e: any) {
        throw new Error(e.message);
      }
    },
    {
      query: t.Object({
        url: t.String(),
      }),
    },
  )

  .post(
    "/api/analyze/stream",
    ({ body, set }) => {
      const payload = body as AnalysisPayload;

      if (payload.stream !== false) {
        set.headers["Content-Type"] = "text/event-stream";

        return new ReadableStream({
          async start(controller) {
            try {
              await analyzeWithProvider(payload, (chunk) => {
                controller.enqueue(`data: ${JSON.stringify({ chunk })}\n\n`);
              });
              controller.enqueue("data: [DONE]\n\n");
              controller.close();
            } catch (e: any) {
              controller.enqueue(
                `data: ${JSON.stringify({ error: e.message })}\n\n`,
              );
              controller.close();
            }
          },
        });
      } else {
        return analyzeWithProvider(payload);
      }
    },
    {
      body: t.Object({
        githubContext: t.Any(),
        goal: t.Optional(t.String()),
        outputStyle: t.String(),
        language: t.Optional(t.String()),
        extraContext: t.Optional(t.String()),
        provider: t.String(),
        model: t.Optional(t.String()),
        stream: t.Optional(t.Boolean()),
      }),
    },
  )

  .post(
    "/api/agent/stream",
    ({ body, set }) => {
      const payload = body as any;
      set.headers["Content-Type"] = "text/event-stream";
      set.headers["Cache-Control"] = "no-cache, no-transform";
      set.headers["Connection"] = "keep-alive";
      set.headers["X-Accel-Buffering"] = "no";

      let agent: SwarmCommander | null = null;
      let heartbeat: any = null;

      return new ReadableStream({
        async start(controller) {
          try {
            let provider =
              payload.provider || process.env.DEFAULT_PROVIDER || "openai";
            provider = provider.toLowerCase();

            // Handle Chat Session Persistence
            let chatContext = "";
            if (payload.sessionId) {
              let session = chatSessions.get(payload.sessionId);
              if (!session) {
                cleanupSessions();
                session = new ChatAgent();
                chatSessions.set(payload.sessionId, session);
              }

              const history = session.getHistory();
              if (history.length > 0) {
                // Sanitize and format history
                chatContext =
                  "\n\n### PREVIOUS CONVERSATION HISTORY (Contextual Reference):\n" +
                  history
                    .map((m) => {
                      const role = m.role.toUpperCase();
                      const content = m.content.replace(/^SYSTEM:/i, "Agent:");
                      return `${role}: ${content}`;
                    })
                    .join("\n");
              }

              // Record user message safely
              session.getHistory().push({
                role: "user",
                content: payload.goal || payload.url || "Interactive Task",
              });
            }

            // Resolve Model
            let model = payload.model || keyPool.getDefaultModel(provider);

            // Resolve Keys & BaseURL
            let apiKey = payload.apiKey || "";
            let baseUrl = payload.baseUrl || "";

            if (!apiKey) {
              const keyResult = keyPool.getNextKey(provider, model);
              apiKey = keyResult?.key || "";
            }

            if (!baseUrl) {
              baseUrl = keyPool.getBaseUrl(provider);
            }

            // Final safety checks
            if (!apiKey && provider !== "ollama") {
              throw new Error(
                `No API key available for provider '${provider}'`,
              );
            }

            logger.info(
              `[MISSION START] Swarm Agent Engaged | Provider: ${provider} | Model: ${model} | Visible: ${payload.browserVisible}`,
            );

            // Sync visibility to config for humanBrowser to pick up
            if (payload.browserVisible !== undefined) {
              const activeProfile = configManager.getActiveProfile();
              if (activeProfile) {
                activeProfile.browserVisible = payload.browserVisible;
                configManager.updateProfile(activeProfile.id, activeProfile);
              }
            }

            const missionObjective =
              payload.goal || payload.url || "Interactive Session";
            const finalExtraContext =
              (payload.extraContext || "") + (chatContext || "");

            let fullAssistantResponse = "";
            controller.enqueue(
              `data: ${JSON.stringify({ log: `[System] Provider online: ${provider} / ${model}` })}\n\n`,
            );

            agent = new SwarmCommander();

            // Keep-alive heartbeat to prevent socket timeout
            heartbeat = setInterval(() => {
              try {
                controller.enqueue(`: heartbeat\n\n`);
              } catch (e) {
                if (heartbeat) clearInterval(heartbeat);
              }
            }, 15000);

            try {
              await agent.run(
                payload.url,
                (log) => {
                  controller.enqueue(`data: ${JSON.stringify({ log })}\n\n`);
                },
                (chunk) => {
                  fullAssistantResponse += chunk;
                  controller.enqueue(`data: ${JSON.stringify({ chunk })}\n\n`);
                },
                (draft) => {
                  controller.enqueue(`data: ${JSON.stringify({ draft })}\n\n`);
                },
                payload.outputStyle || "blueprint",
                payload.goal || payload.extraContext || "",
                (thought) => {
                  controller.enqueue(
                    `data: ${JSON.stringify({ thought })}\n\n`,
                  );
                },
                payload.browserVisible || false,
              );
            } finally {
              if (heartbeat) clearInterval(heartbeat);
              heartbeat = null;
            }

            // Record assistant message
            if (payload.sessionId && fullAssistantResponse) {
              const session = chatSessions.get(payload.sessionId);
              if (session) {
                session
                  .getHistory()
                  .push({ role: "assistant", content: fullAssistantResponse });
              }
            }

            controller.enqueue("data: [DONE]\n\n");
            controller.close();
          } catch (e: any) {
            logger.error(`[Agent Stream Error] ${e.message}`);
            controller.enqueue(
              `data: ${JSON.stringify({ error: e.message })}\n\n`,
            );
            controller.close();
          }
        },
        cancel() {
          // Cleanup when client disconnects
          if (heartbeat) clearInterval(heartbeat);
          if (agent) {
            logger.warn("[Stream Cancelled] Stopping Swarm Agent...");
            agent.stop();
          }
        },
      });
    },
    {
      body: t.Object({
        url: t.String(),
        goal: t.Optional(t.String()),
        sessionId: t.Optional(t.String()),
        outputStyle: t.String(),
        extraContext: t.Optional(t.String()),
        language: t.Optional(t.String()),
        provider: t.Optional(t.String()),
        model: t.Optional(t.String()),
        apiKey: t.Optional(t.String()),
        baseUrl: t.Optional(t.String()),
        profileName: t.Optional(t.String()),
        browserVisible: t.Optional(t.Boolean()),
      }),
    },
  )

  .post("/api/worker/register", ({ body }) => {
    const worker = body as any;
    worker.lastSeen = Date.now();
    worker.status = "idle";
    connectedWorkers.set(worker.workerId, worker);
    logger.info(`🧿 Worker connected: ${worker.workerId} [${worker.hostname}]`);
    return { ok: true, message: "Registered successfully" };
  })

  .post("/api/worker/heartbeat", ({ body }) => {
    const { workerId, activeTasks, loadAverage } = body as any;
    const worker = connectedWorkers.get(workerId);
    if (worker) {
      worker.lastSeen = Date.now();
      worker.activeTasks = activeTasks;
      worker.loadAverage = loadAverage;
    }
    return { ok: true };
  })

  .get("/api/worker/tasks/:workerId", ({ params }) => {
    if (taskQueue.length === 0) return [];
    const assignedTasks = taskQueue.splice(0, Math.min(2, taskQueue.length));
    return assignedTasks;
  })

  .post("/api/worker/complete", ({ body }) => {
    const { taskId } = body as any;
    logger.info(`✅ Task completed: ${taskId}`);
    return { ok: true };
  })

  .get("/api/swarm/status", () => ({
    totalWorkers: connectedWorkers.size,
    workers: Array.from(connectedWorkers.values()),
    queuedTasks: taskQueue.length,
  }))

  .post("/api/swarm/queue", ({ body }) => {
    const task = {
      taskId: crypto.randomBytes(8).toString("hex"),
      ...(body as any),
      queuedAt: Date.now(),
    };
    taskQueue.push(task);
    return { taskId: task.taskId };
  })

  // --- SCHEDULER ENDPOINTS ---
  .get("/api/scheduler/list", async () => {
    return await SchedulerPersistence.readMissions();
  })

  .post(
    "/api/scheduler/add",
    async ({ body }) => {
      const payload = body as any;
      const id = await SchedulerPersistence.addMission({
        cron: payload.cron,
        target: payload.target,
        extraContext: payload.extraContext || "",
        recurring: payload.recurring ?? true,
      });
      return { success: true, id };
    },
    {
      body: t.Object({
        cron: t.String(),
        target: t.String(),
        extraContext: t.Optional(t.String()),
        recurring: t.Optional(t.Boolean()),
      }),
    },
  )

  .delete("/api/scheduler/remove/:id", async ({ params }) => {
    await SchedulerPersistence.removeMission(params.id);
    return { success: true };
  })

  // --- MCP ENDPOINTS ---
  .post("/api/mcp/add", async ({ body }) => {
    const { name, command, args, env } = body as any;
    await McpConfigManager.addServer(name, { command, args, env });
    await McpManager.connect(name, { command, args, env });
    syncMcpTools();
    return { success: true };
  })

  .delete("/api/mcp/remove/:name", async ({ params }) => {
    await McpConfigManager.removeServer(params.name);
    return { success: true };
  })

  .listen(PORT);

// --- BACKGROUND SCHEDULER INITIALIZATION ---
const scheduler = new SwarmScheduler(async (target, extraContext) => {
  logger.info({ target }, "[Background] Executing scheduled mission");
  const agent = new SwarmCommander();
  // Execute mission in background - output is logged via logger.info inside SwarmCommander
  await agent.run(
    target,
    (log) => logger.info(`[SchedLog] ${log}`),
    (chunk) => {}, // No need for streaming chunks in background
    (draft) => {},
    "blueprint",
    extraContext,
    (thought) => logger.info(`[SchedThought] ${thought}`),
  );
  logger.info({ target }, "[Background] Scheduled mission completed");
});

scheduler.start().catch((e) => {
  logger.error({ error: e.message }, "Failed to start background scheduler");
});

// --- MCP INITIALIZATION ---
McpManager.initialize()
  .then(() => {
    syncMcpTools();
    logger.info("[MCP] System initialized and tools synced");
  })
  .catch((e) => {
    logger.error({ error: e.message }, "Failed to initialize MCP system");
  });

console.log(
  chalk.bold.red(
    `\n  REDLOCK AUDITORAI ENGINE (ELYISA) running at http://localhost:4040\n`,
  ),
);
console.log(
  chalk.dim(
    `  🧿 Worker swarm mode enabled. Run worker with: bun engine/worker.ts http://localhost:4040\n`,
  ),
);

export type App = typeof app;
export default app;
