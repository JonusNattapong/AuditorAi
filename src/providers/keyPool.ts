import { SUPPORTED_PROVIDERS } from "./modelCatalog";
import configManager from "../config/configManager";

export interface KeyResult {
  key: string;
  provider: string;
}

export function getNextKey(provider: string, _scope?: string | null): KeyResult | null {
  const normalized = provider.toLowerCase();
  const active = configManager.getActiveProfile();
  if (active?.provider === normalized && active.apiKey) return { key: active.apiKey, provider: normalized };

  const envKey = SUPPORTED_PROVIDERS[normalized]?.env_key || `${normalized.toUpperCase()}_API_KEY`;
  const key = process.env[envKey] || configManager.get(envKey);
  return key ? { key, provider: normalized } : null;
}

export function getDefaultModel(provider: string): string {
  const normalized = provider.toLowerCase();
  const active = configManager.getActiveProfile();
  if (active?.provider === normalized && (active.model || active.defaultModel)) {
    return String(active.model || active.defaultModel);
  }
  return process.env[`${normalized.toUpperCase()}_MODEL`] || SUPPORTED_PROVIDERS[normalized]?.model || "gpt-4o-mini";
}

export function getBaseUrl(provider: string): string {
  const normalized = provider.toLowerCase();
  const active = configManager.getActiveProfile();
  if (active?.provider === normalized && active.baseUrl) return active.baseUrl;
  return process.env[`${normalized.toUpperCase()}_BASE_URL`] || SUPPORTED_PROVIDERS[normalized]?.baseUrl || "https://api.openai.com/v1";
}

export default {
  getNextKey,
  getDefaultModel,
  getBaseUrl,
};
