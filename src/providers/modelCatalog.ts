import * as fs from "fs";
import * as path from "path";
import {
  describeTlsFailure,
  shouldAllowInsecureTls,
} from "../runtime/tls";

export interface ProviderDefaults {
  label: string;
  env_key: string;
  baseUrl: string;
  modelsUrl?: string;
  model: string;
  is_local?: boolean;
  timeout?: number;
  retryLimit?: number;
}

export interface ModelEntry {
  id: string;
  name: string;
  meta?: Record<string, string>;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function sanitizeModelName(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return undefined;
  }
  return trimmed;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveModelsUrl(provider: string, config: ProviderDefaults): string {
  const envModelsUrl = process.env[`${provider.toUpperCase()}_MODELS_URL`];
  const envBaseUrl = process.env[`${provider.toUpperCase()}_BASE_URL`];
  const explicitModelsUrl = sanitizeModelName(envModelsUrl) || config.modelsUrl;

  if (explicitModelsUrl) {
    return trimTrailingSlash(explicitModelsUrl);
  }

  return `${trimTrailingSlash(envBaseUrl || config.baseUrl)}/models`;
}

function resolveModelsUrlCandidates(
  provider: string,
  config: ProviderDefaults,
): string[] {
  const envModelsUrl = sanitizeModelName(
    process.env[`${provider.toUpperCase()}_MODELS_URL`],
  );
  const envBaseUrl = sanitizeModelName(
    process.env[`${provider.toUpperCase()}_BASE_URL`],
  );

  const candidates = [
    envModelsUrl,
    config.modelsUrl,
    envBaseUrl ? `${trimTrailingSlash(envBaseUrl)}/models` : undefined,
    config.baseUrl ? `${trimTrailingSlash(config.baseUrl)}/models` : undefined,
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates.map((value) => trimTrailingSlash(value))));
}

function buildAuthHeaders(
  provider: string,
  apiKey?: string,
): Record<string, string> | undefined {
  if (!apiKey) return undefined;

  if (provider === "anthropic") {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  return { Authorization: `Bearer ${apiKey}` };
}

export function loadProviders(): Record<string, ProviderDefaults> {
  const providersPath = path.join(__dirname, "../config/providers.json");
  try {
    const content = fs.readFileSync(providersPath, "utf8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to load providers.json:", e);
    return {};
  }
}

export const SUPPORTED_PROVIDERS = loadProviders();

export async function fetchModels(provider: string, apiKey?: string): Promise<ModelEntry[]> {
  const config = SUPPORTED_PROVIDERS[provider];
  if (!config) return [];

  const fallbackModel = sanitizeModelName(config.model) || "gpt-4o-mini";
  if (!apiKey && !config.is_local) {
    return [{ id: fallbackModel, name: fallbackModel, meta: { recommendation: "default" } }];
  }

  const modelsUrls = resolveModelsUrlCandidates(provider, config);
  
  for (const modelsUrl of modelsUrls) {
    try {
      const response = await fetch(modelsUrl, {
        headers: buildAuthHeaders(provider, apiKey),
        signal: createTimeoutSignal(10_000),
        // @ts-ignore - Bun specific property
        tls: shouldAllowInsecureTls(provider, modelsUrl)
          ? { rejectUnauthorized: false }
          : undefined,
        // @ts-ignore - Bun specific property
        verbose: true,
      });
      if (!response.ok) throw new Error(`Model fetch failed: ${response.status}`);
      const data = await response.json() as { data?: Array<{ id: string }> };
      const models = (data.data || []).map((model) => ({ id: model.id, name: model.id }));
      if (models.length > 0) return models;
    } catch (error) {
      console.warn(
        `[modelCatalog] Failed to fetch models from ${modelsUrl}: ${describeTlsFailure(error, provider)}`,
      );
      continue;
    }
  }

  return [{ id: fallbackModel, name: fallbackModel, meta: { recommendation: "default" } }];
}

export async function fetchAllModels(keyMap: Record<string, string>): Promise<Record<string, ModelEntry[]>> {
  const pairs = await Promise.all(
    Object.keys(SUPPORTED_PROVIDERS).map(async (provider) => [provider, await fetchModels(provider, keyMap[provider])] as const),
  );
  return Object.fromEntries(pairs);
}
