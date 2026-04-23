import stealthConfig from "../config/stealth_config.json";
import configManager from "../config/configManager";

interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

function pick<T>(items: T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

export function getRandomUA(): string {
  return pick((stealthConfig as { userAgents: string[] }).userAgents) || "Mozilla/5.0";
}

export function getTacticalHeaders(): Record<string, string> {
  return {
    ...(stealthConfig as { headers: Record<string, string> }).headers,
    "User-Agent": getRandomUA(),
  };
}

export function getProxyConfig(): string | undefined {
  return configManager.get("HTTP_PROXY") || configManager.get("HTTPS_PROXY") || pick((stealthConfig as { proxies: string[] }).proxies);
}

export function parseProxy(proxyUrl: string): ProxyConfig {
  const url = new URL(proxyUrl);
  return {
    server: `${url.protocol}//${url.host}`,
    username: url.username || undefined,
    password: url.password || undefined,
  };
}

export default {
  getRandomUA,
  getTacticalHeaders,
  getProxyConfig,
  parseProxy,
};
