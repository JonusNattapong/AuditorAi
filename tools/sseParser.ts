/**
 * Robust SSE Parser for Reverse Engineer
 * Parses Server-Sent Events (SSE) from AI Providers and the local API gateway.
 */

interface SSEEvent {
  type: "data" | "done";
  data?: any; // The parsed JSON from "data: " line
}

type OnEventCallback = (event: SSEEvent) => void;

class SSEParser {
  private buffer: string;
  private onEvent: OnEventCallback;

  constructor(onEvent: OnEventCallback) {
    this.buffer = "";
    this.onEvent = onEvent;
  }

  /**
   * Feed new chunk of data (from axios, fetch, or stream)
   * @param chunk - Raw string chunk received from the server
   */
  feed(chunk: string): void {
    this.buffer += chunk;

    // Split by newlines
    const lines = this.buffer.split("\n");

    // Keep the last (potentially incomplete) line in the buffer
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and non-data lines
      if (!trimmed || !trimmed.startsWith("data: ")) {
        continue;
      }

      const data = trimmed.replace(/^data:\s*/, "").trim();

      if (data === "[DONE]") {
        this.onEvent({ type: "done" });
      } else {
        try {
          const json = JSON.parse(data);
          this.onEvent({ type: "data", data: json });
        } catch (e) {
          // Ignore fragmented JSON or parse errors (common with partial chunks)
          // You can add logging here if needed:
          // console.warn('SSE JSON parse error:', e);
        }
      }
    }
  }

  /**
   * Reset the parser (useful when starting a new stream)
   */
  reset(): void {
    this.buffer = "";
  }

  /**
   * Get current buffer content (for debugging)
   */
  getBuffer(): string {
    return this.buffer;
  }
}

export { SSEParser };
export type { SSEEvent, OnEventCallback };
