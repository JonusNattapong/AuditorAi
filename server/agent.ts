import * as fs from "fs";
import * as path from "path";
import { logger } from "../src/runtime/logger";
import {
  createSwarmCoordinator,
  SwarmCoordinator,
} from "../src/runtime/patterns/swarmCoordinator";
import TurndownService from "turndown";
import { memoryManager } from "../src/runtime/memoryManager";
import { watchdog } from "../src/runtime/patterns/watchdog";
import {
  createSkillManager,
  SkillManager,
} from "../src/runtime/patterns/skillBundle";
import { ToolContext } from "../src/runtime/patterns/toolPermission";
import configManager from "../src/config/configManager";
import { remoteTaskManager } from "../src/runtime/patterns/remoteTask";
import * as reconTools from "../tools/reconTools";
import * as humanBrowser from "../tools/humanBrowser";
import * as reportForge from "../tools/reportForge";
import smartFuzzer from "../tools/smartFuzzer";
import VisionBrowser from "../tools/visionBrowser";
import ReverseEngineer from "../tools/reverseEngineer";
import advancedTools from "../tools/advancedTools";

// Engine Integrations
import { spawn, ChildProcess } from "node:child_process";
import vulnerabilityMemory from "../engine/vulnerabilityMemory";
import promptInjectionLab from "../engine/promptInjection";
import ObsidianWorkspace from "../engine/obsidianWorkspace";

/**
 * Manages a persistent interactive terminal session
 */
class TerminalSession {
  private process: ChildProcess;
  private buffer: string = "";
  private lastReadIndex: number = 0;

  constructor(command: string) {
    this.process = spawn(command, { 
      shell: true, 
      env: { ...process.env, FORCE_COLOR: "1" } 
    });
    
    this.process.stdout?.on("data", (data) => {
      this.buffer += data.toString();
    });
    
    this.process.stderr?.on("data", (data) => {
      this.buffer += data.toString();
    });
  }

  public async readNew(timeout = 1500): Promise<string> {
    // Wait for the stream to populate
    await new Promise(r => setTimeout(r, timeout));
    const newContent = this.buffer.slice(this.lastReadIndex);
    this.lastReadIndex = this.buffer.length;
    return newContent || "(No new output available yet)";
  }

  public write(data: string) {
    if (this.process.stdin?.writable) {
      this.process.stdin.write(data + "\n");
      return true;
    }
    return false;
  }

  public close() {
    this.process.kill();
  }

  public isAlive() {
    return this.process.exitCode === null;
  }
}

// Load tools schema
const TOOLS_SCHEMA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "tools.json"), "utf8"),
);

type ToolArguments = Record<string, unknown>;

interface ParsedToolCall {
  name: string;
  arguments: ToolArguments;
  id?: string;
}

interface BrowserMissionState {
  interactiveEnabled: boolean;
  disableReason?: string;
}

function truncateForDisplay(value: string, maxLength = 220): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function previewToolArguments(args: ToolArguments, maxLength = 180): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return "{}";

  try {
    return truncateForDisplay(JSON.stringify(args), maxLength);
  } catch {
    return `{${keys.join(", ")}}`;
  }
}

function summarizeToolResult(toolResult: unknown, maxLength = 240): string {
  if (typeof toolResult === "string") {
    return truncateForDisplay(toolResult, maxLength);
  }

  if (Buffer.isBuffer(toolResult)) {
    return `[binary result: ${toolResult.length} bytes]`;
  }

  if (toolResult && typeof toolResult === "object") {
    const candidate = toolResult as Record<string, unknown>;

    if (typeof candidate.summary === "string" && candidate.summary.trim()) {
      return truncateForDisplay(candidate.summary, maxLength);
    }

    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return truncateForDisplay(candidate.message, maxLength);
    }

    if (typeof candidate.status === "string" && candidate.status.trim()) {
      return truncateForDisplay(candidate.status, maxLength);
    }

    try {
      return truncateForDisplay(JSON.stringify(toolResult), maxLength);
    } catch {
      return "[structured result]";
    }
  }

  return truncateForDisplay(String(toolResult), maxLength);
}

function summarizeAssistantStep(
  responseText: string,
  toolCalls: ParsedToolCall[],
): string {
  if (toolCalls.length > 0) {
    const names = toolCalls.map((call) => call.name).join(", ");
    return `Selected ${toolCalls.length} tool ${toolCalls.length === 1 ? "call" : "calls"}: ${names}`;
  }

  return `Produced a direct analysis update: ${truncateForDisplay(responseText, 200)}`;
}

function asToolArguments(value: unknown): ToolArguments {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ToolArguments)
    : {};
}

function getStringArg(args: ToolArguments, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value : "";
}

function getNumberArg(args: ToolArguments, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeUrlArg(args: ToolArguments, fallback?: string): string {
  const provided = getStringArg(args, "url") || getStringArg(args, "target");
  if (provided && provided.trim()) return provided;
  return fallback || "";
}

function normalizeHostArg(args: ToolArguments, fallback?: string): string {
  const host = getStringArg(args, "host") || getStringArg(args, "domain");
  if (host && host.trim()) return host;

  const url = normalizeUrlArg(args, fallback);
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function resolveBrowserAction(
  args: ToolArguments,
  missionTarget: string,
): {
  action:
    | "navigate"
    | "click"
    | "type"
    | "submit"
    | "select"
    | "press"
    | "wait_for_selector"
    | "scroll"
    | "capture"
    | "inspect"
    | "status";
  url: string;
  selector: string;
  text: string;
  key: string;
  value: string;
  state?: "attached" | "detached" | "visible" | "hidden";
  direction: "up" | "down";
  amount?: number;
  waitUntil?: "domcontentloaded" | "load" | "networkidle" | "commit";
  waitMs?: number;
  timeoutMs?: number;
  inferred: boolean;
} {
  const requestedAction = getStringArg(args, "action").trim().toLowerCase();
  const url = normalizeUrlArg(args, missionTarget);
  const selector =
    getStringArg(args, "target") ||
    getStringArg(args, "selector") ||
    getStringArg(args, "element");
  const text = getStringArg(args, "text");
  const key = getStringArg(args, "key");
  const value = getStringArg(args, "value") || getStringArg(args, "option");
  const direction = getStringArg(args, "direction") === "up" ? "up" : "down";
  const amount =
    typeof args["amount"] === "number"
      ? (args["amount"] as number)
      : typeof args["pixels"] === "number"
        ? (args["pixels"] as number)
        : undefined;
  const waitUntilRaw = getStringArg(args, "waitUntil") || getStringArg(args, "wait_until");
  const waitUntil =
    waitUntilRaw === "load" ||
    waitUntilRaw === "networkidle" ||
    waitUntilRaw === "commit" ||
    waitUntilRaw === "domcontentloaded"
      ? waitUntilRaw
      : undefined;
  const waitMs =
    typeof args["waitMs"] === "number"
      ? (args["waitMs"] as number)
      : typeof args["wait_ms"] === "number"
        ? (args["wait_ms"] as number)
        : undefined;
  const timeoutMs =
    typeof args["timeoutMs"] === "number"
      ? (args["timeoutMs"] as number)
      : typeof args["timeout_ms"] === "number"
        ? (args["timeout_ms"] as number)
        : undefined;
  const stateRaw = getStringArg(args, "state");
  const state =
    stateRaw === "attached" ||
    stateRaw === "detached" ||
    stateRaw === "visible" ||
    stateRaw === "hidden"
      ? stateRaw
      : undefined;

  if (
    requestedAction === "navigate" ||
    requestedAction === "click" ||
    requestedAction === "type" ||
    requestedAction === "submit" ||
    requestedAction === "select" ||
    requestedAction === "press" ||
    requestedAction === "wait_for_selector" ||
    requestedAction === "scroll" ||
    requestedAction === "capture" ||
    requestedAction === "inspect" ||
    requestedAction === "status"
  ) {
    return {
      action: requestedAction,
      url,
      selector,
      text,
      key,
      value,
      state,
      direction,
      amount,
      waitUntil,
      waitMs,
      timeoutMs,
      inferred: false,
    };
  }

  if (selector && value) {
    return {
      action: "select",
      url,
      selector,
      text,
      key,
      value,
      state,
      direction,
      amount,
      waitUntil,
      waitMs,
      timeoutMs,
      inferred: true,
    };
  }

  if (selector && (key || text.toLowerCase() === "enter")) {
    return {
      action: "press",
      url,
      selector,
      text,
      key: key || text,
      value,
      state,
      direction,
      amount,
      waitUntil,
      waitMs,
      timeoutMs,
      inferred: true,
    };
  }

  if (selector && text) {
    return {
      action: "type",
      url,
      selector,
      text,
      key,
      value,
      state,
      direction,
      amount,
      waitUntil,
      waitMs,
      timeoutMs,
      inferred: true,
    };
  }

  if (selector) {
    return {
      action: "click",
      url,
      selector,
      text,
      key,
      value,
      state,
      direction,
      amount,
      waitUntil,
      waitMs,
      timeoutMs,
      inferred: true,
    };
  }

  if (getStringArg(args, "direction")) {
    return {
      action: "scroll",
      url,
      selector,
      text,
      key,
      value,
      state,
      direction,
      amount,
      waitUntil,
      waitMs,
      timeoutMs,
      inferred: true,
    };
  }

  return {
    action: "navigate",
    url,
    selector,
    text,
    key,
    value,
    state,
    direction,
    amount,
    waitUntil,
    waitMs,
    timeoutMs,
    inferred: true,
  };
}

function parseJsonToolCall(text: string): ParsedToolCall | null {
  try {
    const parsed = JSON.parse(text.trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;

    const candidate = parsed as Record<string, unknown>;
    const toolName = candidate.tool_name || candidate.tool;
    if (typeof toolName !== "string" || toolName.length === 0) return null;

    return {
      name: toolName,
      arguments: asToolArguments(candidate.arguments),
    };
  } catch {
    return null;
  }
}

function parseToolCalls(responseText: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];

  // Improved extraction using bracket counting for robust JSON parsing
  const toolHeaderRegex = /\[Tool Call\] (.*?)\(/g;
  let match;

  while ((match = toolHeaderRegex.exec(responseText)) !== null) {
    const toolName = match[1].trim();
    const startIdx = match.index + match[0].length;

    // Find matching closing parenthesis for the JSON arguments
    let bracketCount = 1;
    let endIdx = -1;
    for (let i = startIdx; i < responseText.length; i++) {
      if (responseText[i] === "(") bracketCount++;
      else if (responseText[i] === ")") bracketCount--;

      if (bracketCount === 0) {
        endIdx = i;
        break;
      }
    }

    if (endIdx !== -1) {
      let toolArgsStr = responseText.substring(startIdx, endIdx).trim();

      // Check for ID suffix: "ID:call_xxx"
      let toolId: string | undefined;
      const remainingText = responseText.substring(endIdx + 1, endIdx + 50);
      const idMatch = remainingText.match(/^\s*ID:([^\s\n]+)/);
      if (idMatch) {
        toolId = idMatch[1];
      }

      let toolArgs: ToolArguments = {};
      try {
        toolArgs = asToolArguments(JSON.parse(toolArgsStr));
      } catch {
        // Fallback for malformed JSON if it's simple
        toolArgs = {};
      }

      if (toolName) {
        calls.push({
          name: toolName,
          arguments: toolArgs,
          id: toolId || `call_${Math.random().toString(36).substring(7)}`,
        });
      }
    }
  }

  const rawJsonCall = parseJsonToolCall(responseText);
  if (rawJsonCall && !calls.some((call) => call.name === rawJsonCall.name)) {
    calls.push({
      ...rawJsonCall,
      id: `call_${Math.random().toString(36).substring(7)}`,
    });
  }

  return calls;
}

/**
 * REDLOCK Swarm Commander
 * Modernized Autonomous Agent Infrastructure
 */
export class SwarmCommander {
  private coordinator: SwarmCoordinator;
  private skillManager: SkillManager;
  private context: ToolContext;
  private abortController: AbortController;
  private terminalSessions: Map<string, TerminalSession> = new Map();
  private toolRegistry: Record<
    string,
    (args: ToolArguments) => Promise<unknown> | unknown
  >;
  private obsidian: ObsidianWorkspace;

  constructor() {
    this.abortController = new AbortController();
    this.context = {
      permissions: new Map(),
      capabilities: new Set(["recon", "exploit", "analysis"]),
      abortSignal: this.abortController.signal,
    };

    this.coordinator = createSwarmCoordinator();
    this.skillManager = createSkillManager(this.context);

    // Initialize Local Obsidian Vault
    const vaultPath = path.join(process.cwd(), "dossiers");
    this.obsidian = new ObsidianWorkspace(vaultPath);

    // Tool registry will be dynamically resolved with mission target
    this.toolRegistry = {};
  }

  private htmlToMarkdown(html: string): string {
    try {
      const turndown = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
      });
      // Filter out noisy elements before conversion
      const cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
      
      return turndown.turndown(cleanHtml);
    } catch (e) {
      return html; // Fallback to raw HTML if conversion fails
    }
  }

  public stop() {
    this.abortController.abort();
    // Cleanup terminal sessions
    for (const session of this.terminalSessions.values()) {
      session.close();
    }
    this.terminalSessions.clear();
  }

  private getToolRegistry(
    target: string,
    browserMissionState: BrowserMissionState,
    onLog: (msg: string) => void,
  ): Record<string, (args: ToolArguments) => Promise<unknown> | unknown> {
    return {
      dns_recon: (args) => reconTools.dnsRecon(normalizeHostArg(args, target)),
      http_header_audit: (args) =>
        reconTools.httpHeaderAudit(normalizeUrlArg(args, target)),
      ssl_inspect: (args) =>
        reconTools.sslInspect(
          getStringArg(args, "host") || normalizeUrlArg(args, target),
        ),
      secret_scanner: (args) =>
        reconTools.secretScanner(getStringArg(args, "path") || process.cwd()),
      wayback_lookup: (args) =>
        reconTools.waybackLookup(normalizeUrlArg(args, target)),
      port_probe: (args) =>
        reconTools.portProbe(normalizeHostArg(args, target)),
      web_spider: (args) => reconTools.webSpider(normalizeUrlArg(args, target)),
      fetch_url: async (args) => {
        const url = normalizeUrlArg(args, target);
        if (!url || url.includes(" ")) return "Error: 'url' argument is invalid or missing.";
        const result = await humanBrowser.navigate(
          url,
          (getStringArg(args, "waitUntil") as
            | "domcontentloaded"
            | "load"
            | "networkidle"
            | "commit"
            | "") || undefined,
          getNumberArg(args, "waitMs"),
        );
        return typeof result === "string" ? this.htmlToMarkdown(result) : result;
      },
      browse_url: async (args) => {
        const url = normalizeUrlArg(args, target);
        if (!url || url.includes(" ")) return "Error: 'url' argument is invalid or missing.";
        const result = await humanBrowser.navigate(url);
        return typeof result === "string" ? this.htmlToMarkdown(result) : result;
      },
      get_request: async (args) => {
        const url = normalizeUrlArg(args, target);
        if (!url || url.includes(" ")) return "Error: 'url' argument is invalid or missing.";
        const result = await humanBrowser.navigate(url);
        return typeof result === "string" ? this.htmlToMarkdown(result) : result;
      },
      http_request: async (args) => {
        const url = normalizeUrlArg(args, target);
        if (!url || url.includes(" ")) return "Error: 'url' argument is invalid or missing.";
        const result = await humanBrowser.navigate(url);
        return typeof result === "string" ? this.htmlToMarkdown(result) : result;
      },
      swarm_coordinate: async (args) => {
        const objective = getStringArg(args, "objective");
        const context = getStringArg(args, "context") || "";
        if (!objective) return "Error: 'objective' is required for swarm coordination.";
        
        onLog(`[Swarm] Coordinating parallel analysis for: ${objective}`);
        const results = await this.coordinator.executeMission(objective, onLog, context);
        
        let report = `### Swarm Consensus Report: ${objective}\n\n`;
        results.forEach((state, provider) => {
          report += `#### Provider: ${provider} (${state.status})\n`;
          if (state.status === "completed") {
            report += `${state.result?.finalOutput}\n\n`;
          } else {
            report += `Error: ${state.error}\n\n`;
          }
        });
        return report;
      },
      browser_action: async (args) => {
        const resolved = resolveBrowserAction(args, target);
        const readOnlyAction =
          resolved.action === "navigate" ||
          resolved.action === "inspect" ||
          resolved.action === "status";

        if (!browserMissionState.interactiveEnabled && !readOnlyAction) {
          return `Interactive browser controls are disabled for this mission after a launch failure. Reason: ${browserMissionState.disableReason || "browser unavailable"}. Use fetch_url or non-browser tools instead.`;
        }

        const result = await humanBrowser.executeAction({
          action: resolved.action,
          url: resolved.url,
          selector: resolved.selector,
          target: resolved.selector,
          text: resolved.text,
          key: resolved.key,
          value: resolved.value,
          state: resolved.state,
          direction: resolved.direction,
          amount: resolved.amount,
          waitUntil: resolved.waitUntil,
          waitMs: resolved.waitMs,
          timeoutMs: resolved.timeoutMs,
        });
        return resolved.inferred
          ? `[Inferred browser action=${resolved.action} for target ${resolved.url}]\n${result}`
          : result;
      },
      deliver_final_report: (args) => {
        const content = getStringArg(args, "report_content");
        // Auto-save to Obsidian as well
        this.obsidian.createNote({
          title: `Final_Report_${Date.now()}`,
          content: content,
          tags: ["final-report", "swarm-mission"],
          aliases: [],
          links: [],
          properties: { status: "completed", timestamp: Date.now() },
        });
        return content;
      },

      // --- Engine Tool Extensions ---
      record_vulnerability: (args) => {
        const targetUrl = normalizeUrlArg(args, target);
        const vector = getStringArg(args, "vector");
        const method = getStringArg(args, "method");
        const status = getStringArg(args, "status");
        const payload = getStringArg(args, "payload");

        if (status === "success") {
          vulnerabilityMemory.recordSuccess(targetUrl, vector, method, payload);
          return "Vulnerability recorded in memory (Success)";
        } else {
          vulnerabilityMemory.recordFailure(targetUrl, vector, method, payload);
          return "Vulnerability recorded in memory (Failure)";
        }
      },

      get_technique_blueprint: (args) => {
        const id = getStringArg(args, "technique_id");
        return promptInjectionLab.generateResearchBlueprint(id);
      },

      search_memory: (args) => {
        const targetUrl = normalizeUrlArg(args, target);
        const recommendation =
          vulnerabilityMemory.getRecommendedMethod(targetUrl);
        return recommendation
          ? `Recommended method based on history: ${recommendation}`
          : "No specific history for this target.";
      },

      create_obsidian_note: (args) => {
        const title = getStringArg(args, "title");
        const content = getStringArg(args, "content");
        const tags = (args["tags"] as string[]) || [];
        return this.obsidian.createNote({
          title,
          content,
          tags,
          aliases: [],
          links: [],
          properties: { created: Date.now() },
        });
      },

      generate_attack_canvas: (args) => {
        const targetUrl = normalizeUrlArg(args, target);
        const findings = (args["findings"] as string[]) || [];
        return this.obsidian.generateAttackCanvas(targetUrl, findings);
      },

      smart_fuzz: (args) => smartFuzzer.smartFuzz(normalizeUrlArg(args, target)),

      vision_analyze: async (args) => {
        const url = normalizeUrlArg(args, target);
        const prompt = getStringArg(args, "prompt");
        const vision = new VisionBrowser();
        return await vision.scanAndAnalyze(url);
      },

      ssrf_probe: (args) => {
        const url = normalizeUrlArg(args, target);
        const param = getStringArg(args, "parameter");
        return smartFuzzer.scanSSRF(url, param);
      },

      reverse_engineer: (args) => {
        const path = getStringArg(args, "path");
        const re = new ReverseEngineer(path);
        return re.generateReport();
      },

      subdomain_enum: (args) =>
        advancedTools.subdomainEnum(
          getStringArg(args, "domain") || normalizeHostArg(args, target),
        ),

      xss_scanner: (args) =>
        advancedTools.xssScanner(normalizeUrlArg(args, target)),

      sqli_scanner: (args) =>
        advancedTools.sqliProbe(normalizeUrlArg(args, target)),

      cloud_storage_finder: (args) =>
        advancedTools.cloudStorageFinder(
          getStringArg(args, "domain") || normalizeHostArg(args, target),
        ),

      git_history_scanner: (args) =>
        advancedTools.gitHistoryScanner(getStringArg(args, "path") || "./"),

      osint_leak_checker: (args) =>
        advancedTools.osintLeakChecker(
          getStringArg(args, "domain") || normalizeHostArg(args, target),
        ),

      api_endpoint_mapper: (args) =>
        advancedTools.apiEndpointMapper(getStringArg(args, "html")),

      search_github_exploits: (args) => {
        const query = getStringArg(args, "query");
        if (!query) return "Error: 'query' is required.";
        return advancedTools.searchGithubExploits(query);
      },
 
      search_web: (args) => {
        const query = getStringArg(args, "query");
        if (!query) return "Error: 'query' is required.";
        return advancedTools.webSearch(query);
      },
 
      obsidian_create_note: (args) => {
        const title = getStringArg(args, "title");
        const content = getStringArg(args, "content");
        const tags = (args["tags"] as string[]) || [];
        if (!title || !content) return "Error: 'title' and 'content' are required.";
        const path = this.obsidian.createNote({
          title,
          content,
          tags,
          aliases: [],
          links: [],
          properties: {}
        });
        return `Note created: ${path}`;
      },
 
      obsidian_create_finding: (args) => {
        const title = getStringArg(args, "title");
        const severity = getStringArg(args, "severity");
        const evidence = getStringArg(args, "evidence");
        const references = (args["references"] as string[]) || [];
        if (!title || !severity || !evidence) return "Error: 'title', 'severity', and 'evidence' are required.";
        const path = this.obsidian.createFinding(title, severity, evidence, references);
        return `Security finding recorded in Obsidian: ${path}`;
      },
 
      obsidian_create_attack_canvas: (args) => {
        const targetUrl = getStringArg(args, "target");
        const findings = (args["findings"] as string[]) || [];
        if (!targetUrl || findings.length === 0) return "Error: 'target' and at least one 'findings' note title are required.";
        const path = this.obsidian.generateAttackCanvas(targetUrl, findings);
        return `Attack canvas generated: ${path}. Open this in Obsidian to see the visual attack map.`;
      },

      security_policy_audit: (args) =>
        advancedTools.securityPolicyAudit(normalizeUrlArg(args, target)),

      jwt_inspector: (args) => advancedTools.jwtInspector(getStringArg(args, "token")),

      js_vulnerability_scan: (args) =>
        advancedTools.jsLibVulnerabilityScan(getStringArg(args, "html")),

      learn_github_skill: async (args) => {
        const url = getStringArg(args, "url");
        const skillName = getStringArg(args, "skill_name");
        const category = getStringArg(args, "category") || "general";
        
        if (!url) return "Error: RAW GitHub URL is required.";

        try {
          const axios = (await import("axios")).default;
          const response = await axios.get(url, { timeout: 10000 });
          const content = response.data;
          
          const noteTitle = `Skill_${skillName.replace(/\s+/g, "_")}`;
          const noteContent = `
# Skill: ${skillName}
## Source: ${url}
## Category: ${category}

### Implementation Details:
\`\`\`
${typeof content === "string" ? content : JSON.stringify(content, null, 2)}
\`\`\`

---
*Skill learned autonomously on ${new Date().toLocaleString()}*
`;
          this.obsidian.createNote({
            title: noteTitle,
            content: noteContent,
            tags: ["skill", category],
            aliases: [skillName],
            links: [],
            properties: {
              source: url,
              type: "github_skill",
              learned: Date.now()
            }
          });

          return `Successfully learned skill: ${skillName}. Stored in AI brain (Obsidian). You can now use search_skills to retrieve it.`;
        } catch (e: any) {
          return `Failed to learn skill from GitHub: ${e.message}`;
        }
      },

      add_mcp_server: async (args) => {
        const name = getStringArg(args, "name");
        const command = getStringArg(args, "command");
        const mcpArgs = (args["args"] as string[]) || [];
        
        if (!name || !command) return "Error: 'name' and 'command' are required to add an MCP server.";
        
        try {
          const { McpConfigManager: cfg } = await import("../src/runtime/mcp/config");
          const { McpManager: mcp } = await import("../src/runtime/mcp/manager");
          
          await cfg.addServer(name, { command, args: mcpArgs });
          await mcp.connect(name, { command, args: mcpArgs });
          
          return `MCP Server '${name}' successfully added and connected. You can now use tools prefixed with '${name}__'.`;
        } catch (e: any) {
          return `Error adding MCP server: ${e.message}`;
        }
      },

      list_mcp_servers: async () => {
        try {
          const { McpManager: mcp } = await import("../src/runtime/mcp/manager");
          const servers = mcp.list();
          if (servers.length === 0) return "No MCP servers connected.";
          return `Active MCP Servers:\n${servers.map(s => `- ${s.name} (${s.config.command})`).join("\n")}`;
        } catch (e: any) {
          return `Error listing MCP servers: ${e.message}`;
        }
      },

      search_skills: (args) => {
        const query = getStringArg(args, "query");
        if (!query) return "Error: Search query is required.";
        
        const results = this.obsidian.searchNotes(query);
        const skillResults = results.filter(r => r.title.startsWith("Skill_"));
        
        if (skillResults.length === 0) {
          return `No skills found for query: ${query}. Try searching for something broader or use learn_github_skill to acquire new techniques.`;
        }

        return `Found ${skillResults.length} relevant skills:\n\n${skillResults.map(r => `### ${r.title}\n${r.preview}`).join("\n\n")}\n\nTo see the full implementation, use load_skill with the exact title.`;
      },

      load_skill: (args) => {
        const skillName = getStringArg(args, "skill_name");
        if (!skillName) return "Error: 'skill_name' is required.";
        
        try {
          const content = this.obsidian.readNote(skillName);
          return `--- FULL SKILL CONTENT: ${skillName} ---\n\n${content}`;
        } catch (e: any) {
          return `Error loading skill: ${e.message}`;
        }
      },

      mission_checkpoint: (args) => {
        const summary = getStringArg(args, "summary");
        const nextSteps = getStringArg(args, "next_steps");
        return `[CRITICAL CHECKPOINT]\nSUMMARY: ${summary}\nNEXT STEPS: ${nextSteps}\nStatus: Alignment Confirmed.`;
      },

      terminal_spawn: async (args) => {
        const cmd = getStringArg(args, "command");
        const id = getStringArg(args, "sessionId");
        if (!cmd) return "Error: 'command' argument is required. DO NOT send empty arguments {}.";
        if (!id) return "Error: 'sessionId' argument is required. Provide a unique ID for this terminal.";
        
        if (this.terminalSessions.has(id)) {
          this.terminalSessions.get(id)?.close();
        }
        const session = new TerminalSession(cmd);
        this.terminalSessions.set(id, session);
        return await session.readNew();
      },

      terminal_interact: async (args) => {
        const id = getStringArg(args, "sessionId");
        const input = (args["input"] as string) || "";
        if (!id) return "Error: 'sessionId' argument is required.";
        
        const session = this.terminalSessions.get(id);
        if (!session) return `Error: Terminal session '${id}' not found. Use terminal_spawn first.`;
        
        if (input) {
          session.write(input);
        }
        
        const output = await session.readNew();
        if (!session.isAlive()) {
          this.terminalSessions.delete(id);
          return `[Session Terminated] Final Output:\n${output}`;
        }
        return output;
      },
    };
  }

  public async run(
    target: string,
    onLog: (msg: string) => void,
    onChunk: (content: string) => void,
    onDraftUpdate: (data: any) => void,
    outputStyle: string = "agent",
    extraContext: string = "",
    onThought: ((thought: string) => void) | null = null,
    browserVisible: boolean = false,
  ): Promise<void> {
    logger.info({ target, goal: extraContext, browserVisible }, "Starting Autonomous Swarm Mission");
    onLog(`[System] Initializing Swarm Commander | TARGET: ${target} | VISIBILITY: ${browserVisible ? 'VISIBLE' : 'HEADLESS'}`);
    if (extraContext) onLog(`[System] Objective: ${extraContext}`);

    try {
      const { inspectTarget, analyzeWithProvider } =
        await import("./providerUtils");

      // 1. Initial Recon
      onLog(`[System] Performing reconnaissance on target infrastructure...`);
      const githubContext = await inspectTarget(target, browserVisible);
      onLog(`[System] Reconnaissance complete. Tactical intelligence mapped.`);

      await memoryManager.initialize();
      watchdog.start();

      // --- MCP Integration ---
      const { McpManager } = await import("../src/runtime/mcp/manager");
      await McpManager.initialize();
      const mcpTools = await McpManager.listTools();
      onLog(`[System] MCP Swarm initialized. ${mcpTools.length} external tools available.`);

      const dynamicTools = [...TOOLS_SCHEMA];
      for (const mt of mcpTools) {
        dynamicTools.push({
          name: mt.name,
          description: mt.description,
          parameters: mt.inputSchema,
        });
      }

      const activeProfile = configManager.getActiveProfile();
      const provider =
        activeProfile?.provider || process.env.DEFAULT_PROVIDER || "openai";
      const model =
        activeProfile?.model || process.env[`${provider.toUpperCase()}_MODEL`];

      const promptManager = (await import("../engine/promptManager")).default;
      const tacticalHistory = vulnerabilityMemory.getRecommendedMethod(target) 
        ? `- Tactical History: ${vulnerabilityMemory.getRecommendedMethod(target)}` 
        : "- No prior history for this target.";
      const techniques = promptInjectionLab.listTechniques().map((t) => t.value).join(", ");
      
      const contextInfo = `
${tacticalHistory}
- Available Techniques: ${techniques}
- Active Mission Target: ${target}
- Current Goal: ${extraContext || "Security Audit"}
      `.trim();

      let agentPrompt = promptManager.getPrompt("agent")
        .replace(/{{target}}/g, target)
        .replace(/{{context}}/g, contextInfo);

      let messages: any[] = [
        {
          role: "system",
          content: agentPrompt,
        },
        {
          role: "user",
          content: `Begin the autonomous audit of ${target}. Base your strategy on this recon data: ${JSON.stringify(githubContext.metadata)}`,
        },
      ];

      let turn = 1;
      const MAX_TURNS = 9999;
      let missionComplete = false;
      let finalReport = "";
      const browserMissionState: BrowserMissionState = {
        interactiveEnabled: true,
      };

      while (turn <= MAX_TURNS && !missionComplete) {
        onLog(
          `[System] Turn ${turn}: Swarm intelligence engaged...`,
        );
        onThought?.(
          `Turn ${turn}: reviewing prior evidence, choosing the next highest-value action, and checking whether enough evidence exists to conclude safely.`,
        );

        let turnContent = "";
        let result: any = null;
        let turnError = null;

        // Turn Retry Logic
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            // @ts-ignore - analyzeWithProvider signature updated in providerUtils.ts
            result = await (analyzeWithProvider as any)(
              {
                provider,
                model,
                messages,
                tools: dynamicTools,
                stream: true,
              },
              (chunk: string) => {
                turnContent += chunk;
                onChunk(chunk);
              },
              (thought: string) => {
                onThought?.(thought);
              },
            );
            if (result) {
              turnError = null;
              break;
            }
          } catch (e: any) {
            turnError = e;
            onLog(`[Warning] Turn ${turn} attempt ${attempt} failed: ${e.message}. Retrying...`);
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }

        if (turnError || (!result && !turnContent)) {
          onLog(`[Error] Turn ${turn} failed after retries. Skipping to next tactical phase...`);
          turn++;
          continue;
        }

        const aiResponse = result?.text || turnContent;
        if (!aiResponse) {
          onLog(
            "[System] No response from Swarm Intelligence. Retrying turn...",
          );
          turn++;
          continue;
        }

        const toolCalls = parseToolCalls(aiResponse);
        onThought?.(summarizeAssistantStep(aiResponse, toolCalls));

        // Add assistant's thought to history (with tool_calls if present)
        if (toolCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: aiResponse,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          });
        } else {
          messages.push({ role: "assistant", content: aiResponse });
        }

        // Context Reinforcement: Ensure AI stays focused on the primary objective
        if (
          toolCalls.some((tc) => Object.keys(tc.arguments).length === 0) ||
          turn % 5 === 0
        ) {
          messages.push({
            role: "user",
            content: `MISSION UPDATE:
- GOAL: ${extraContext || "Security Audit"}
- STATUS: Ongoing (Turn ${turn})
Execute your next strategic action based on this goal. Ensure all tool parameters are complete.`,
          });
        }

        // --- Loop Prevention ---
        const lastAction = messages[messages.length - 1];
        const isRepeatedEmptyCall = toolCalls.length > 0 && 
                                   toolCalls.every(c => Object.keys(c.arguments).length === 0) &&
                                   lastAction?.role === "tool" && lastAction?.content?.includes("Error: 'command' argument is required");
        
        if (isRepeatedEmptyCall) {
          onLog("[System] Detecting repetitive empty tool calls. Injecting strategic intervention...");
          messages.push({
            role: "user",
            content: "SYSTEM ALERT: You are stuck in a loop calling tools with empty arguments {}. This is unacceptable. STOP and rethink your strategy. You MUST provide valid arguments for the tools you choose. If you don't know what command to run, use 'ls' or 'dir' to explore, or check help files. DO NOT send {} again."
          });
          turn++;
          continue;
        }

        let toolExecutionOccurred = false;

        // --- Hybrid Tool Registry (Local + MCP) ---
        const localRegistry = this.getToolRegistry(target, browserMissionState, onLog);
        const uniqueToolCalls = toolCalls.filter((call, index, self) => 
          index === self.findIndex((t) => 
            t.name === call.name && JSON.stringify(t.arguments) === JSON.stringify(call.arguments)
          )
        );

        const toolCallsToExecute = uniqueToolCalls;
        if (toolCallsToExecute.length > 0) {
          toolExecutionOccurred = true;
          onLog(`[System] Turn ${turn}: Initiating parallel swarm execution for ${toolCallsToExecute.length} unique operations...`);

          const pLimit = (await import("p-limit")).default;
          const limit = pLimit(5);

          const toolResults = await Promise.all(
            toolCallsToExecute.map((tc) =>
              limit(async () => {
                const toolName = tc.name;
                const toolArgs = tc.arguments;
                const toolId = tc.id;

                onLog(`[Worker] Executing ${toolName}...`);
                
                try {
                  const toolFn = localRegistry[toolName];
                  if (toolFn) {
                    const result = await toolFn(toolArgs);
                    return { id: toolId, name: toolName, result };
                  }
                  
                  // Fallback to MCP Swarm
                  const { McpManager: mcp } = await import("../src/runtime/mcp/manager");
                  const result = await mcp.callTool(toolName, toolArgs);
                  return { id: toolId, name: toolName, result };
                } catch (e: any) {
                  return { id: toolId, name: toolName, error: e.message };
                }
              })
            )
          );

          for (const res of toolResults) {
            const { id, name, result, error } = res;
            
            if (error) {
              onLog(`[Error] Tool ${name} failed: ${truncateForDisplay(error, 180)}`);
              messages.push({
                role: "tool",
                tool_call_id: id,
                content: `Error: ${error}`,
              });
              continue;
            }

            const resultSummary = summarizeToolResult(result);
            const resultStr = typeof result === "string" ? result : JSON.stringify(result);
            
            onLog(`[System] Tool Result Received (${name}): ${resultSummary}`);
            messages.push({
              role: "tool",
              tool_call_id: id,
              content: resultStr,
            });

            // Special Logic: Browser Status
            if (
              browserMissionState.interactiveEnabled &&
              (name === "browser_action" || name === "fetch_url" || name === "browse_url")
            ) {
              const browserStatus = humanBrowser.getStatus();
              if (!browserStatus.available) {
                browserMissionState.interactiveEnabled = false;
                browserMissionState.disableReason = browserStatus.reason;
                onLog(`[System] Browser automation disabled: ${browserStatus.reason}`);
                messages.push({
                  role: "user",
                  content: `SYSTEM: Browser automation is now DISABLED (${browserStatus.reason}). Use fetch_url or non-browser tools.`,
                });
              }
            }

            // Special Logic: Final Report
            if (name === "deliver_final_report") {
              finalReport = resultStr;
              missionComplete = true;
              onLog(`[System] Final tactical dossier synthesized.`);
            }
          }
        }

        if (!toolExecutionOccurred) {
          onThought?.(
            `No tool was executed on this turn, so the model either responded directly or failed to choose an action path.`,
          );
        }

        // Mission complete check moved into tool loop for immediate exit

        turn++;
      }

      if (!missionComplete && turn > MAX_TURNS) {
        onLog(
          "[System] Maximum turns reached. Forcing final intelligence summary...",
        );
        onThought?.(
          "Maximum turn limit reached. Synthesizing all gathered evidence into a final tactical summary.",
        );

        const summaryResult = await analyzeWithProvider({
          provider,
          model,
          messages: [
            ...messages,
            {
              role: "user",
              content:
                "CRITICAL: Turn limit reached. Synthesize all findings from the previous turns into a FINAL MISSION DOSSIER now. Do not call any more tools.",
            },
          ],
          tools: TOOLS_SCHEMA,
          stream: false,
        });

        finalReport = summaryResult.text;
      }

      onLog("[System] Mission Complete. Finalizing tactical dossier...");
      if (finalReport) {
        onChunk(`\n\n## FINAL MISSION DOSSIER\n\n${finalReport}`);
      }
      watchdog.stop();
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Swarm mission failed");
      onLog(`[Fatal] Mission Aborted: ${(error as Error).message}`);
    }
  }
}

export const agent = new SwarmCommander();
export default SwarmCommander;
