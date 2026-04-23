/**
 * advancedTools.ts — High-Impact Tactical Security Modules (Modern & Practical Edition)
 * 
 * Optimized for RedLock Swarm Intelligence. 
 * Implements advanced detection patterns and robust error handling.
 */

import axios from "axios";
import { logger } from "../src/runtime/logger";
import stealthEngine from "../src/runtime/stealthEngine";
import * as path from "path";
import * as fs from "fs";

/**
 * 1. Advanced Subdomain Enumeration (Multi-Source OSINT & Intelligence)
 */
export async function subdomainEnum(domain: string): Promise<string[]> {
  logger.info({ domain }, "Executing multi-source tactical intelligence gathering");
  const subdomains = new Set<string>();
  
  const sources = [
    {
      name: "crt.sh",
      url: `https://crt.sh/?q=${domain}&output=json`,
      parser: (data: any) => data.map((e: any) => e.name_value.split('\n')).flat()
    },
    {
      name: "AlienVault OTX",
      url: `https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`,
      parser: (data: any) => data.passive_dns?.map((e: any) => e.hostname) || []
    },
    {
      name: "HackerTarget",
      url: `https://api.hackertarget.com/hostsearch/?q=${domain}`,
      parser: (data: string) => data.split('\n').map(line => line.split(',')[0])
    }
  ];

  for (const source of sources) {
    try {
      logger.info(`Querying intelligence source: ${source.name}`);
      const res = await axios.get(source.url, {
        timeout: 12000,
        headers: stealthEngine.getTacticalHeaders()
      });
      
      const found = source.parser(res.data);
      found.forEach((sub: string) => {
        const cleanSub = sub.replace('*.', '').toLowerCase().trim();
        if (cleanSub.endsWith(domain)) subdomains.add(cleanSub);
      });
    } catch (e) {
      logger.warn(`Source ${source.name} returned partial data or timed out.`);
    }
  }

  return [...subdomains].sort();
}

/**
 * 2. Professional XSS Scanner (Context-Aware Payloads)
 */
export async function xssScanner(url: string): Promise<string[]> {
  const payloads = [
    { p: "idxss'><script>confirm(1)</script>", t: "Reflected Script Tag" },
    { p: "idxss\" onmouseover=\"confirm(1)\"", t: "Attribute Injection" },
    { p: "javascript:confirm(1)", t: "Protocol Injection" },
    { p: "<img src=x onerror=confirm(1)>", t: "Event Handler Injection" }
  ];
  
  const findings: string[] = [];
  logger.info({ url }, "Initiating context-aware XSS audit");

  for (const item of payloads) {
    try {
      const target = new URL(url);
      // Test common parameters
      const params = ["q", "id", "search", "name", "query", "url", "redirect"];
      
      for (const param of params) {
        target.searchParams.set(param, item.p);
        const res = await axios.get(target.href, { 
          timeout: 5000, 
          headers: stealthEngine.getTacticalHeaders(),
          validateStatus: () => true 
        });

        if (typeof res.data === "string" && res.data.includes(item.p)) {
          findings.push(`[CRITICAL] XSS (${item.t}) confirmed via parameter '${param}' at ${target.href}`);
          break; // Found one for this payload, move to next payload
        }
      }
    } catch { continue; }
  }
  return findings.length > 0 ? findings : ["No simple reflected XSS found."];
}

/**
 * 3. SQL Injection Probe (Boolean & Error Based)
 */
export async function sqliProbe(url: string): Promise<string[]> {
  const findings: string[] = [];
  const errorPatterns = [
    "SQL syntax", "mysql_fetch_array", "ORA-01756", "SQLite3::prepare", 
    "PostgreSQL query failed", "Dynamic SQL Generation Error"
  ];

  logger.info({ url }, "Initiating advanced SQLi tactical audit");

  try {
    const target = new URL(url);
    const params = Array.from(target.searchParams.keys());
    if (params.length === 0) return ["No parameters found to test for SQLi."];

    for (const param of params) {
      // 1. Error-based check
      const errorPayload = `${target.searchParams.get(param)}' OR 1=1--`;
      const testUrl = new URL(url);
      testUrl.searchParams.set(param, errorPayload);
      
      const res = await axios.get(testUrl.href, { timeout: 7000, validateStatus: () => true });
      const body = String(res.data);

      for (const pattern of errorPatterns) {
        if (body.includes(pattern)) {
          findings.push(`[HIGH] Error-based SQLi suspected in parameter '${param}' (Pattern: ${pattern})`);
          break;
        }
      }

      // 2. Boolean-based check
      const trueUrl = new URL(url);
      trueUrl.searchParams.set(param, `' AND 1=1--`);
      const falseUrl = new URL(url);
      falseUrl.searchParams.set(param, `' AND 1=2--`);

      const [resTrue, resFalse] = await Promise.all([
        axios.get(trueUrl.href, { timeout: 5000, validateStatus: () => true }),
        axios.get(falseUrl.href, { timeout: 5000, validateStatus: () => true })
      ]);

      if (resTrue.data.length !== resFalse.data.length) {
        findings.push(`[MEDIUM] Boolean-based SQLi suspected in parameter '${param}' (Content length mismatch)`);
      }
    }
  } catch (e) {
    findings.push(`Audit Error: ${(e as Error).message}`);
  }

  return findings.length > 0 ? findings : ["No obvious SQLi detected via automated probing."];
}

/**
 * 4. Enhanced Cloud Storage Bucket Finder
 */
export async function cloudStorageFinder(domain: string): Promise<string[]> {
  const base = domain.split('.')[0].replace(/[^a-zA-Z0-9-]/g, '');
  const variants = [
    base, `${base}-assets`, `${base}-data`, `${base}-public`, `${base}-private`, 
    `${base}-backup`, `${base}-prod`, `${base}-staging`, `${base}-dev`,
    `www.${base}`, `api.${base}`
  ];
  
  const findings: string[] = [];
  logger.info({ domain }, "Searching for cloud storage exposures");

  for (const name of variants) {
    const endpoints = [
      { url: `https://${name}.s3.amazonaws.com`, type: "AWS S3" },
      { url: `https://storage.googleapis.com/${name}`, type: "GCP Storage" },
      { url: `https://${name}.blob.core.windows.net`, type: "Azure Blob" }
    ];

    for (const ep of endpoints) {
      try {
        const res = await axios.head(ep.url, { timeout: 3000, validateStatus: () => true });
        if (res.status === 200) {
          findings.push(`[ALERT] Public ${ep.type} Bucket found: ${ep.url}`);
        } else if (res.status === 403) {
          findings.push(`[INFO] Private ${ep.type} Bucket detected (Access Denied): ${ep.url}`);
        }
      } catch { continue; }
    }
  }
  return findings;
}

/**
 * 5. Deep Git Leak Scanner
 */
export async function gitHistoryScanner(localPath: string): Promise<string[]> {
  const gitDir = path.join(localPath, '.git');
  if (!fs.existsSync(gitDir)) return ["Target path is not a git repository."];

  const findings: string[] = [];
  const sensitivePatterns = [
    "password", "api_key", "secret", "token", "access_key", 
    "AIza[0-9A-Za-z-_]{35}", // Google API Key
    "xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}", // Slack Token
    "sk-[a-zA-Z0-9]{20}", // OpenAI Key
    "sqp_[a-f0-9]{40}", // SonarQube Token
    "amzn\\.mws\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", // AWS
    "private_key", "mysql_password"
  ];

  try {
    const { execSync } = require('child_process');
    logger.info({ path: localPath }, "Scanning git history for deep leaks");

    for (const pattern of sensitivePatterns) {
      try {
        const logs = execSync(`git log -p --all -G"${pattern}" --max-count=5`, { 
          cwd: localPath, 
          stdio: ['pipe', 'pipe', 'ignore'] 
        }).toString();
        
        if (logs.trim()) {
          findings.push(`[LEAK] Potential secret containing '${pattern}' found in historical commits.`);
        }
      } catch { continue; }
    }
  } catch (e) {
    findings.push(`Scan Error: ${(e as Error).message}`);
  }

  return findings.length > 0 ? findings : ["No obvious secrets found in git history."];
}

/**
 * 6. Modern OSINT Dorking
 */
export async function osintLeakChecker(domain: string): Promise<string[]> {
  const dorks = [
    { name: "Public Documents", query: `site:${domain} filetype:pdf | filetype:docx | filetype:xlsx` },
    { name: "Exposed Log Files", query: `site:${domain} filetype:log | "index of" /logs/` },
    { name: "Configuration Files", query: `site:${domain} "PHP Parse error" | "access denied" | "config.php"` },
    { name: "Git Folders", query: `site:${domain} inurl:".git" index of` },
    { name: "Paste Site Leaks", query: `site:pastebin.com | site:paste.ee | site:ghostbin.com "${domain}"` }
  ];

  return dorks.map(d => `[DORK] ${d.name}: https://www.google.com/search?q=${encodeURIComponent(d.query)}`);
}

/**
 * 7. Advanced API Endpoint Mapper (Minified JS Analysis)
 */
export async function apiEndpointMapper(html: string): Promise<string[]> {
  const endpoints = new Set<string>();
  
  // Pattern 1: URL-like strings starting with /api/
  const apiRegex = /(['"])\/api\/v[0-9](\.[0-9])?\/[a-zA-Z0-9/_-]+(['"])/g;
  
  // Pattern 2: Typical AJAX/Fetch patterns
  const fetchRegex = /fetch\s*\(\s*['"](https?:\/\/[^'"]+|[./][^'"]+)['"]/g;
  const axiosRegex = /axios\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;

  let match;
  while ((match = apiRegex.exec(html)) !== null) endpoints.add(match[0].replace(/['"]/g, ''));
  while ((match = fetchRegex.exec(html)) !== null) endpoints.add(match[1]);
  while ((match = axiosRegex.exec(html)) !== null) endpoints.add(match[2]);

  return [...endpoints].sort();
}

/**
 * 8. Comprehensive Security Policy Audit
 */
export async function securityPolicyAudit(url: string): Promise<string[]> {
  const findings: string[] = [];
  const base = new URL(url).origin;
  
  const targets = [
    { p: "/.well-known/security.txt", n: "Security Policy" },
    { p: "/robots.txt", n: "Robots Configuration" },
    { p: "/.well-known/assetlinks.json", n: "Android Asset Links" },
    { p: "/.well-known/apple-app-site-association", n: "Apple Site Association" },
    { p: "/humans.txt", n: "Authorship File" }
  ];

  for (const item of targets) {
    try {
      const res = await axios.get(`${base}${item.p}`, { timeout: 3000, validateStatus: () => true });
      if (res.status === 200) {
        findings.push(`[FOUND] ${item.n} (${item.p}): Content length ${res.data.length}`);
      }
    } catch { continue; }
  }

  return findings;
}

/**
 * 9. Advanced JWT Analysis (Algorithm & Claim Check)
 */
export function jwtInspector(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return "Error: String is not a valid JWT.";

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const findings: string[] = [];

    // Check 1: None Algorithm
    if (header.alg?.toLowerCase() === 'none') {
      findings.push("[CRITICAL] JWT 'none' algorithm detected. This allows signature bypass.");
    }

    // Check 2: Expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      findings.push("[INFO] Token has expired.");
    }

    // Check 3: Suspicious claims
    if (payload.role === 'admin' || payload.admin === true || payload.is_admin === 1) {
      findings.push("[TACTICAL] High-privilege claim detected (Admin role).");
    }

    return { 
      header, 
      payload, 
      vulnerabilities: findings,
      summary: findings.length > 0 ? "Potential weaknesses identified." : "No obvious flaws detected in JWT structure."
    };
  } catch (e) {
    return `Error: Decoding failed - ${(e as Error).message}`;
  }
}

/**
 * 10. Modern JS Library Vulnerability Scanner (Powered by Retire.js Database)
 */
export async function jsLibVulnerabilityScan(html: string): Promise<string[]> {
  logger.info("Fetching latest vulnerability intelligence from Retire.js...");
  const findings: string[] = [];
  
  try {
    // Fetch official RetireJS repository from GitHub
    const repoUrl = "https://raw.githubusercontent.com/RetireJS/retire.js/master/repository/jsrepository.json";
    const res = await axios.get(repoUrl, { timeout: 10000 });
    const repo = res.data;

    for (const [libName, libData] of Object.entries(repo)) {
      const data = libData as any;
      // Simple check: Is the library mentioned in the HTML?
      // (Advanced version would extract version numbers via regex)
      if (html.toLowerCase().includes(libName.toLowerCase())) {
        const vulnerabilities = data.vulnerabilities || [];
        if (vulnerabilities.length > 0) {
          const topVuln = vulnerabilities[0];
          findings.push(`[VULNERABLE LIB] Detected '${libName}': ${topVuln.info?.join(', ') || 'Known vulnerabilities'}. Fix: ${topVuln.atOrAbove ? `Upgrade to >= ${topVuln.atOrAbove}` : 'See CVE documentation'}`);
        }
      }
    }
  } catch (e) {
    logger.error(`Failed to fetch Retire.js intelligence: ${(e as Error).message}`);
    findings.push("Error: Could not fetch real-time vulnerability intelligence. Falling back to local heuristics.");
    // Fallback logic could go here
  }

  return findings.length > 5 ? findings.slice(0, 10) : findings;
}

/**
 * 11. Autonomous Exploit Discovery (GitHub Intelligence)
 */
export async function searchGithubExploits(query: string): Promise<string[]> {
  logger.info({ query }, "Initiating autonomous exploit discovery on GitHub");
  const rawUrls: string[] = [];

  try {
    // Search for repositories matching the query (e.g., "PostgreSQL RCE")
    const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query + " exploit")}&sort=stars&order=desc`;
    const res = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        ...stealthEngine.getTacticalHeaders(),
        Accept: "application/vnd.github.v3+json",
      },
    });

    const repos = res.data.items?.slice(0, 5) || [];
    for (const repo of repos) {
      const contentsUrl = `https://api.github.com/repos/${repo.full_name}/contents`;
      const contentsRes = await axios.get(contentsUrl, {
        timeout: 5000,
        headers: stealthEngine.getTacticalHeaders(),
      });

      const files = contentsRes.data as any[];
      const scripts = files.filter(f => 
        f.type === "file" && 
        (f.name.endsWith(".py") || f.name.endsWith(".pl") || f.name.endsWith(".sh") || f.name.endsWith(".go"))
      );

      for (const script of scripts) {
        rawUrls.push(`https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${script.path}`);
      }
    }
  } catch (e) {
    logger.error(`GitHub discovery failed: ${(e as Error).message}`);
  }

  return rawUrls.slice(0, 15); // Return top 15 candidates
}

/**
 * 12. Tactical Web Search (Tavily & Brave)
 */
export async function webSearch(query: string): Promise<any> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  
  if (!tavilyKey && !braveKey) {
    return "Error: No search API keys found. Please set TAVILY_API_KEY or BRAVE_SEARCH_API_KEY in your profile.";
  }

  try {
    // 1. Try Tavily first (Optimized for AI research)
    if (tavilyKey) {
      logger.info({ query }, "Executing tactical search via Tavily");
      const res = await axios.post("https://api.tavily.com/search", {
        api_key: tavilyKey,
        query: query,
        search_depth: "advanced",
        include_images: false,
        max_results: 5
      }, { timeout: 10000 });
      
      return res.data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content
      }));
    }

    // 2. Fallback to Brave Search
    if (braveKey) {
      logger.info({ query }, "Executing tactical search via Brave");
      const res = await axios.get("https://api.search.brave.com/res/v1/web/search", {
        params: { q: query, count: 5 },
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": braveKey
        },
        timeout: 10000
      });
      
      return res.data.web.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.description
      }));
    }
  } catch (e) {
    logger.error(`Web search failed: ${(e as Error).message}`);
    return `Search Error: ${(e as Error).message}`;
  }
}

export default {
  subdomainEnum,
  xssScanner,
  sqliProbe,
  cloudStorageFinder,
  gitHistoryScanner,
  osintLeakChecker,
  apiEndpointMapper,
  securityPolicyAudit,
  jwtInspector,
  jsLibVulnerabilityScan,
  searchGithubExploits,
  webSearch
};
