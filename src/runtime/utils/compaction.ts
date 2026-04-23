export const CompactionService = {
  async compact<TMessage extends { role?: unknown; content?: unknown }>(
    _scope: string,
    history: TMessage[],
    aiCallback: (prompt: string) => Promise<string>,
  ): Promise<TMessage[]> {
    if (history.length <= 12) return history;

    const transcript = history
      .map((message) => `${message.role}: ${String(message.content)}`)
      .join("\n");
    const summary = await aiCallback(`Summarize this conversation for continuity:\n\n${transcript}`);

    return [
      { role: "system", content: `Conversation summary:\n${summary}` } as TMessage,
      ...history.slice(-6),
    ];
  },
};
