import { SwarmCommander } from "./agent";

/**
 * ChatAgent - Persistent Session Intelligence
 * 
 * Manages the conversation history and coordinates with SwarmCommander
 * for complex tasks like history compaction and strategic planning.
 */

export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export class ChatAgent {
  private history: Message[] = [];
  public coordinator: SwarmCommander;

  constructor() {
    this.coordinator = new SwarmCommander();
  }

  /**
   * Get full conversation history
   */
  public getHistory(): Message[] {
    return this.history;
  }

  /**
   * Add a message to history
   */
  public addMessage(message: Message): void {
    this.history.push(message);
    
    // Auto-compaction check (Optional: could trigger if history > threshold)
    if (this.history.length > 50) {
      console.log("[ChatAgent] History length exceeded threshold. Suggesting compaction.");
    }
  }

  /**
   * Compact the conversation history to save tokens
   * Uses a summarizer function (usually powered by the coordinator)
   */
  public async compact(
    summarizer: (prompt: string) => Promise<string>
  ): Promise<void> {
    if (this.history.length < 5) return;

    const historyText = this.history
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const prompt = `Summarize the following conversation history into a concise tactical brief. 
Keep all critical technical details, target info, and discovered vulnerabilities.
CONVERSATION:\n${historyText}`;

    try {
      const summary = await summarizer(prompt);
      
      // Reset history with the summary as a system message
      this.history = [
        {
          role: "system",
          content: `This is a tactical summary of the previous conversation: ${summary}`
        }
      ];
      
      console.log("[ChatAgent] History compacted successfully.");
    } catch (error) {
      console.error("[ChatAgent] Compaction failed:", error);
    }
  }

  /**
   * Clear entire history
   */
  public clear(): void {
    this.history = [];
  }
}
