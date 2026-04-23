import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpConfigManager, McpServerConfig } from "./config";
import { logger } from "../logger";

interface ConnectedServer {
  client: Client;
  transport: StdioClientTransport;
  config: McpServerConfig;
}

const activeServers = new Map<string, ConnectedServer>();

export const McpManager = {
  async initialize(): Promise<void> {
    const servers = await McpConfigManager.listServers();
    for (const [name, config] of Object.entries(servers)) {
      try {
        await this.connect(name, config);
        logger.info({ server: name }, "MCP Server connected during initialization");
      } catch (e: any) {
        logger.error({ server: name, error: e.message }, "Failed to connect to MCP server");
      }
    }
  },

  async connect(name: string, config: McpServerConfig): Promise<void> {
    if (activeServers.has(name)) return;

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: { ...process.env, ...(config.env || {}) },
    });

    const client = new Client(
      {
        name: "RedLock-Swarm-Commander",
        version: "2.0.0",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    activeServers.set(name, { client, transport, config });
  },

  async disconnect(name: string): Promise<void> {
    const server = activeServers.get(name);
    if (server) {
      await server.transport.close();
      activeServers.delete(name);
    }
  },

  async listTools(): Promise<Array<{ server: string; name: string; description?: string; inputSchema: any }>> {
    const allTools: any[] = [];
    for (const [serverName, server] of activeServers.entries()) {
      try {
        const response = await server.client.listTools();
        for (const tool of response.tools) {
          allTools.push({
            server: serverName,
            name: `${serverName}__${tool.name}`,
            description: tool.description,
            inputSchema: tool.inputSchema,
          });
        }
      } catch (e: any) {
        logger.error({ server: serverName, error: e.message }, "Failed to list tools for MCP server");
      }
    }
    return allTools;
  },

  async callTool(fullName: string, args: any): Promise<any> {
    const [serverName, ...toolNameParts] = fullName.split("__");
    const toolName = toolNameParts.join("__");
    const server = activeServers.get(serverName);

    if (!server) {
      throw new Error(`MCP Server '${serverName}' not connected.`);
    }

    const response = await server.client.callTool({
      name: toolName,
      arguments: args,
    });

    return response.content;
  },

  list(): Array<{ name: string; config: McpServerConfig }> {
    return Array.from(activeServers.entries()).map(([name, server]) => ({
      name,
      config: server.config,
    }));
  },
};
