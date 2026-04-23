import { getNextKey, getDefaultModel, getBaseUrl } from "../../providers/keyPool";
import configManager from "../../config/configManager";

export interface SwarmTaskState {
  spec: {
    objective: string;
    provider?: string;
  };
  turnCount: number;
  result?: {
    finalOutput?: string;
    provider?: string;
    model?: string;
    latency?: number;
  };
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
}

export interface SwarmCoordinator {
  executeMission(
    objective: string,
    onLog: (message: string) => void,
    extraContext?: string,
  ): Promise<Map<string, SwarmTaskState>>;
  reset(): void;
  getProviders(): string[];
}

const DEFAULT_PROVIDERS = ["openai", "anthropic", "gemini", "local"];

export function createSwarmCoordinator(): SwarmCoordinator {
  let missionActive = false;

  async function executeWithProvider(
    provider: string,
    objective: string,
    extraContext?: string,
    modelOverride?: string,
    apiKeyOverride?: string,
  ): Promise<SwarmTaskState> {
    const startTime = Date.now();
    const state: SwarmTaskState = {
      spec: { objective, provider },
      turnCount: 0,
      status: "running",
    };

    try {
      const keyResult = apiKeyOverride ? { key: apiKeyOverride } : getNextKey(provider);
      if (!keyResult) {
        state.status = "failed";
        state.error = `No API key found for provider: ${provider}`;
        return state;
      }

      const model = modelOverride || getDefaultModel(provider);
      const baseUrl = getBaseUrl(provider);

      const promptManager = (await import("../../../engine/promptManager")).default;
      const prompt = promptManager.getPrompt("swarm_worker")
        .replace(/{{objective}}/g, objective)
        .replace(/{{context}}/g, extraContext || "None provided");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (provider !== "local" && keyResult.key) {
        headers["Authorization"] = `Bearer ${keyResult.key}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;

        state.turnCount = 1;
        state.result = {
          finalOutput: data?.choices?.[0]?.message?.content || "No response",
          provider,
          model,
          latency: Date.now() - startTime,
        };
        state.status = "completed";
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      state.status = "failed";
      state.error = err instanceof Error ? err.message : "Unknown error";
    }

    return state;
  }

  return {
    async executeMission(objective, onLog, extraContext) {
      if (missionActive) {
        onLog("[Coordinator] Mission already in progress.");
        return new Map();
      }

      missionActive = true;
      onLog(`[Coordinator] Mission accepted: ${objective}`);

      const activeProfile = configManager.getActiveProfile();
      const providers = activeProfile?.provider
        ? [activeProfile.provider]
        : DEFAULT_PROVIDERS.filter((p) => getNextKey(p) !== null);

      onLog(`[Coordinator] Executing across: ${providers.join(", ")}`);

      const results = new Map<string, SwarmTaskState>();

      // Execute in parallel across providers
      const executions = providers.map(async (provider) => {
        onLog(`[Coordinator] Dispatching to ${provider}...`);
        const modelOverride = (activeProfile?.provider === provider) ? activeProfile.model : undefined;
        const keyOverride = (activeProfile?.provider === provider) ? activeProfile.apiKey : undefined;
        
        const result = await executeWithProvider(provider, objective, extraContext, modelOverride, keyOverride);
        results.set(provider, result);

        if (result.status === "completed") {
          onLog(
            `[Coordinator] ${provider} completed in ${result.result?.latency}ms`,
          );
        } else {
          onLog(`[Coordinator] ${provider} failed: ${result.error}`);
        }
      });

      await Promise.all(executions);

      // Cross-validation: compare results
      const completed = Array.from(results.values()).filter(
        (r) => r.status === "completed",
      );
      if (completed.length > 1) {
        onLog(
          `[Coordinator] Cross-validation: ${completed.length} providers returned results`,
        );
        // TODO: Implement deeper cross-validation logic
      }

      missionActive = false;
      return results;
    },

    reset() {
      missionActive = false;
    },

    getProviders() {
      return DEFAULT_PROVIDERS.filter((p) => getNextKey(p) !== null);
    },
  };
}
