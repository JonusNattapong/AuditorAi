import * as http from "http";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import { createProxyServer } from "http-proxy";
import chalk from "chalk";

import exploitForge, { ObfuscationMethod } from "../engine/exploitForge";

export class ShadowProxy {
  private proxy: ReturnType<typeof createProxyServer>;
  private server: http.Server | null = null;
  private targetHost: string = "";
  private mutationMethods: ObfuscationMethod[] | null = null;
  private logStream: fs.WriteStream | null = null;
  private logFilePath: string = "shadowproxy.log";

  constructor() {
    this.proxy = createProxyServer({ secure: false, changeOrigin: true });

    // Prevent uncaught exception process crash
    this.proxy.on("error", (err, req, res) => {
      console.log(chalk.red(`[Shadow Proxy] Proxy Error: ${err.message}`));
      if (res instanceof http.ServerResponse && !res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad Gateway");
      } else if (res instanceof net.Socket) {
        res.end();
      }
    });

    this.targetHost = "";
  }

  /**
   * Starts the MITM proxy server
   * @param port - The port to listen on
   * @param targetDomain - The specific host to intercept and mutate
   * @param logFile - Path to log file (default: shadowproxy.log)
   */
  public start(port: number = 8080, targetDomain: string = "", logFile?: string): void {
    // Prevent double start / server leak
    if (this.server) {
      this.stop();
    }

    this.targetHost = targetDomain;

    // Initialize logging
    if (logFile) {
      this.logFilePath = logFile;
    }
    this.logStream = fs.createWriteStream(this.logFilePath, { flags: "a" });

    // Preload mutation sequence once at startup
    this.mutationMethods = exploitForge.getMutationSequence();

    this.server = http.createServer(
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        const hostHeader = req.headers.host || "";
        const isTarget =
          this.targetHost.length === 0 || hostHeader.includes(this.targetHost);

        // Log incoming request
        const timestamp = new Date().toISOString();
        const method = req.method || "UNKNOWN";
        const url = req.url || "";
        const logEntry = `[${timestamp}] REQUEST ${method} ${url} (Host: ${hostHeader})\n`;
        this.logStream?.write(logEntry);

        // Inject custom headers for targeted requests
        if (isTarget) {
          req.headers["x-chalk.redlock-intercepted"] = "true";
          req.headers["x-chalk.redlock-timestamp"] = timestamp;
        }

        if (isTarget) {
          console.log(chalk.red(`[Shadow Proxy] Intercepting Target: ${req.url}`));

          // Inject exploit string into query params on the fly
          try {
            // Use a dummy base for relative URLs
            const baseUrl = `http://${hostHeader}`;
            const u = new URL(req.url || "/", baseUrl);
            let mutated = false;

            if (this.mutationMethods && this.mutationMethods.length > 0) {
              const randomMethod =
                this.mutationMethods[
                  Math.floor(Math.random() * this.mutationMethods.length)
                ];
              const crafted = exploitForge.craft(
                "{{SHADOW_PROXY_RFI_TEST}}",
                "Cognitive Alignment Wrapper",
                randomMethod,
              );

              // Iterate through search params and mutate the first available one
              const params = Array.from(u.searchParams.keys());
              for (const key of params) {
                if (!mutated) {
                  u.searchParams.set(key, crafted.payload);
                  mutated = true;
                  console.log(chalk.yellow(`   Auto-Mutated param '${key}' using [${randomMethod}]`));
                  break;
                }
              }

              // If no query params exist, add one
              if (!mutated) {
                u.searchParams.set("_shadow_probe", crafted.payload);
                mutated = true;
                console.log(chalk.yellow(`   Added probe param using [${randomMethod}]`));
              }
            }

            if (mutated) {
              req.url = u.pathname + u.search;
              req.headers["x-chalk.redlock-shadow"] = "active";
            }
          } catch (e) {
            console.log(chalk.gray(`[Shadow Proxy] Mutation skipped: ${e instanceof Error ? e.message : "Unknown error"}`));
          }
        } else {
          console.log(chalk.dim(`[Shadow Proxy] Passthrough: ${req.url}`));
        }

        try {
          const rawUrl = req.url || "";
          let targetUrl: string;

          if (rawUrl.startsWith("http")) {
            const parsed = new URL(rawUrl);
            // Preserve full path + query instead of just origin
            targetUrl = parsed.origin;
            req.url = parsed.pathname + parsed.search;
          } else {
            targetUrl = `http://${hostHeader}`;
          }

          this.proxy.web(req, res, { target: targetUrl });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown routing error";
          console.log(chalk.red(`[Shadow Proxy] Routing Error: ${message}`));
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Bad Gateway");
          }
        }
      },
    );

    // Handle HTTPS CONNECT tunneling
    this.server.on("connect", (req, socket, head) => {
      const [host, port] = req.url!.split(":");

      // Direct tunnel for HTTPS
      const targetSocket = net.connect(Number(port) || 443, host, () => {
        socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        targetSocket.write(head);
        targetSocket.pipe(socket);
        socket.pipe(targetSocket);
      });

      targetSocket.on("error", () => {
        socket.end();
      });

      socket.on("error", () => {
        targetSocket.end();
      });
    });

    // Handle response mutation and logging
    (this.proxy as any).on("proxyRes", (proxyRes: any, req: any, res: any) => {
      const timestamp = new Date().toISOString();
      const method = req.method || "UNKNOWN";
      const url = req.url || "";
      const statusCode = proxyRes.statusCode || 0;

      // Log response
      const logEntry = `[${timestamp}] RESPONSE ${method} ${url} -> ${statusCode}\n`;
      this.logStream?.write(logEntry);

      // Log response headers
      const headers = JSON.stringify(proxyRes.headers || {}).substring(0, 500);
      this.logStream?.write(`  Headers: ${headers}\n\n`);
    });

    this.server.listen(port, () => {
      console.log(chalk.red.bold(`\nShadow Proxy (AI-MITM Mode) active on http://127.0.0.1:${port}`));

      if (this.targetHost) {
        console.log(chalk.yellow(`Scope Locked to: ${this.targetHost}`));
      } else {
        console.log(chalk.yellow(`Scope: GLOBAL (Intercepting everything)`));
      }

      console.log(chalk.gray(`Point your browser's proxy settings to this address to begin interception.\n`));
    });
  }

  /**
   * Gracefully stops the proxy server
   */
  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.mutationMethods = null;
      console.log(chalk.gray(`[Shadow Proxy] Stopped`));
    }
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
      console.log(chalk.gray(`[Shadow Proxy] Log file closed`));
    }
  }
}

// Export class instead of singleton for isolated instances
export default ShadowProxy;
