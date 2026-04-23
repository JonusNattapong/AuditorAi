function parseBooleanFlag(value?: string | null): boolean {
  if (!value) return false;

  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    default:
      return false;
  }
}

function sanitizeProviderName(provider?: string | null): string {
  return (provider || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function shouldAllowInsecureTls(
  provider?: string,
  targetUrl?: string,
): boolean {
  const providerKey = sanitizeProviderName(provider);
  const providerFlag = providerKey
    ? process.env[`${providerKey}_ALLOW_INSECURE_TLS`]
    : undefined;

  if (
    parseBooleanFlag(providerFlag) ||
    parseBooleanFlag(process.env.MIBU_ALLOW_INSECURE_TLS) ||
    parseBooleanFlag(process.env.REDLOCK_ALLOW_INSECURE_TLS) ||
    parseBooleanFlag(process.env.ALLOW_INSECURE_TLS) ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
  ) {
    return true;
  }

  if (!targetUrl) return false;

  try {
    const url = new URL(targetUrl);
    if (url.protocol !== "https:") return false;

    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

export function describeTlsFailure(error: unknown, provider?: string): string {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  const lower = message.toLowerCase();
  const looksLikeTlsFailure =
    lower.includes("certificate") ||
    lower.includes("self signed") ||
    lower.includes("tls") ||
    lower.includes("ssl");

  if (!looksLikeTlsFailure) {
    return message;
  }

  const providerPrefix = provider ? `${provider} ` : "";
  return `${message}. If this provider is behind a self-signed or intercepted TLS certificate, set ${providerPrefix.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_ALLOW_INSECURE_TLS=1 or MIBU_ALLOW_INSECURE_TLS=1 and retry.`;
}
