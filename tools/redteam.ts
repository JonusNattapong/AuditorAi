import promptfoo from "promptfoo";
import { logger } from "../src/runtime/logger";
import configManager from "../src/config/configManager";
import keyPool from "../src/providers/keyPool";

/**
 * REDLOCK AuditorAi Red Team Engine
 * Orchestrates automated security evaluations of LLMs and AI Agents.
 * Scans for prompt injection, jailbreaks, data leakage, and more.
 */

export async function runSecurityScan(
  targetPrompt: string,
  targetResponse: string,
) {
  const provider = String(configManager.get("DEFAULT_PROVIDER") || "openai");
  const model = String(keyPool.getDefaultModel(provider));
  const key = keyPool.getNextKey(provider, null);

  logger.info(
    { provider, model },
    "Initiating automated LLM Red Team evaluation",
  );

  try {
    // Basic evaluation using promptfoo's built-in assertions
    // Note: promptfoo providers often need specific formatting (e.g. openai:gpt-4o)
    const promptfooProvider = `${provider}:${model}`;

    const results = await (promptfoo as any).evaluate({
      prompts: [targetPrompt],
      providers: [promptfooProvider],
      tests: [
        {
          vars: { response: targetResponse },
          assert: [
            { type: "prompt-injection", value: targetResponse },
            { type: "jailbreak", value: targetResponse },
            { type: "pii", value: targetResponse },
            { type: "is-json", value: targetResponse }, // Add check for structural integrity
          ],
        },
      ],
      env: {
        [`${provider.toUpperCase()}_API_KEY`]: key?.key || "",
      },
    });

    logger.info("Red Team evaluation scan completed");
    return results;
  } catch (err: any) {
    logger.error(`Red Team scan failed: ${err.message}`);
    throw err;
  }
}

export default {
  runSecurityScan,
};
