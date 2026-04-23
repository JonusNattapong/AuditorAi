export interface MissionTelemetry {
  startTime: number;
  endTime: number;
  apiDurationMs: number;
  totalTokens: number;
  filesAudited: Set<string>;
  toolsUsed: Set<string>;
  vulnerabilitiesFound: number;
  totalCostUsd: number;
}

export const MissionDossier = {
  estimateCost(totalTokens: number): number {
    return Number(((totalTokens / 1_000_000) * 5).toFixed(6));
  },
  generate(telemetry: MissionTelemetry): string {
    const durationMs = Math.max(0, telemetry.endTime - telemetry.startTime);
    return [
      "",
      "## Tactical Summary",
      `Duration: ${durationMs}ms`,
      `Estimated tokens: ${telemetry.totalTokens}`,
      `Estimated cost: $${telemetry.totalCostUsd}`,
      `Files audited: ${telemetry.filesAudited.size}`,
      `Tools used: ${telemetry.toolsUsed.size}`,
      `Findings flagged: ${telemetry.vulnerabilitiesFound}`,
      "",
    ].join("\n");
  },
};
