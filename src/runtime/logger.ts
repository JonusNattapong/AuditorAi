type LogPayload = string | Record<string, unknown>;

function write(level: "info" | "warn" | "error" | "debug", payload: LogPayload, message?: string): void {
  const prefix = `[${new Date().toISOString()}] ${level.toUpperCase()}`;
  const writer = level === "debug" ? console.log : console[level];

  if (typeof payload === "string") {
    writer(`${prefix} ${payload}`);
    return;
  }

  writer(message ? `${prefix} ${message}` : prefix, payload);
}

export const logger = {
  info: (payload: LogPayload, message?: string) => write("info", payload, message),
  warn: (payload: LogPayload, message?: string) => write("warn", payload, message),
  error: (payload: LogPayload, message?: string) => write("error", payload, message),
  debug: (payload: LogPayload, message?: string) => write("debug", payload, message),
};

export default logger;
