/**
 * smartFuzzer.ts — Autonomous AI-Powered Fuzzing Engine
 * 
 * Implements Stack-Aware Fuzzing:
 * 1. Fingerprints target technology stack
 * 2. Generates context-specific path predictions
 * 3. Executes tactical probing with anti-detection rotation
 */

import axios from "axios";
import pLimit from "p-limit";
import stealthEngine from "../src/runtime/stealthEngine";
import SSRFProbe from "./ssrfProbe";
import { logger } from "../src/runtime/logger";

interface StackSignature {
  name: string;
  category: string;
  confidence: number;
  headers: string[];
  cookies: string[];
  paths: string[];
  patterns: RegExp[];
  developer_habits: {
    common_paths: string[];
    backup_patterns: string[];
    common_admin_names: string[];
    version_exposures: string[];
  };
}

interface StackDetectionResult {
  detected: boolean;
  technologies: TechnologyDetection[];
  confidence: number;
  primary_stack: TechnologyDetection | null;
  raw_signals: string[];
  error?: string;
}

interface TechnologyDetection {
  id: string;
  name: string;
  category: string;
  confidence: number;
  signals: string[];
}

interface PathPredictionResult {
  strategy: string;
  stack_id?: string;
  stack_name?: string;
  total_paths: number;
  confidence: number;
  paths: string[];
}

interface FuzzResult {
  path: string;
  status_code: number;
  content_length: number;
  content_type: string | null;
  confidence: number;
}

interface SmartFuzzResult {
  target: string;
  started_at: string;
  stack_detection: StackDetectionResult | null;
  path_prediction: PathPredictionResult | null;
  found_endpoints: FuzzResult[];
  statistics: {
    total_tested: number;
    found: number;
    errors: number;
    duration_seconds: number;
  };
  summary?: string;
  error?: string;
}

// ==============================================================
// STACK SIGNATURE DATABASE
// ==============================================================
const STACK_SIGNATURES: Record<string, StackSignature> = {
  nextjs: {
    name: "Next.js",
    category: "Full Stack Framework",
    confidence: 0,
    headers: ["x-nextjs-page", "x-nextjs-cache", "x-middleware-prefetch"],
    cookies: ["__next_preview_data", "__prerender_bypass"],
    paths: ["/_next/", "/next-static/", "/api/"],
    patterns: [/\/_next\/static\//, /"buildId":/],
    developer_habits: {
      common_paths: [
        "/.env", "/.env.local", "/.env.development", "/.env.production",
        "/next.config.js", "/next.config.mjs", "/next-env.d.ts",
        "/api/auth", "/api/debug", "/api/graphql", "/admin", "/dashboard",
        "/_next/data/", "/vercel.json", "/.vercel/", "/out/", "/.next/",
      ],
      backup_patterns: [
        "next.config.js.bak", "next.config.js.old", "env.bak", ".env.backup",
        ".env.save", "package.json.bak",
      ],
      common_admin_names: ["admin", "dashboard", "control", "manager", "studio", "cms", "backend"],
      version_exposures: ["/package.json", "/package-lock.json", "/yarn.lock", "/pnpm-lock.yaml"],
    },
  },
  wordpress: {
    name: "WordPress",
    category: "CMS",
    confidence: 0,
    headers: [],
    cookies: ["wordpress_logged_in_", "wp-settings-", "wp_woocommerce_session_"],
    paths: ["/wp-content/", "/wp-includes/", "/wp-admin/"],
    patterns: [/wp-content/, /wp-includes/, /WordPress/, /\/wp-json\//],
    developer_habits: {
      common_paths: [
        "/wp-config.php", "/wp-config.php.bak", "/wp-config.php.old", "/wp-admin/",
        "/wp-login.php", "/wp-json/", "/xmlrpc.php", "/readme.html", "/license.txt",
        "/debug.log", "/phpinfo.php", "/.env", "/.user.ini", "/wp-content/debug.log",
      ],
      backup_patterns: [
        "wp-config.php~", "wp-config.php.save", "wp-config.php.tmp",
        "wp-config.php.orig", "wp-config.php.backup", "wp-config-bak.php",
      ],
      common_admin_names: ["wp-admin", "admin", "login", "wp-login"],
      version_exposures: ["/readme.html", "/wp-includes/version.php"],
    },
  },
  laravel: {
    name: "Laravel",
    category: "PHP Framework",
    confidence: 0,
    headers: ["x-powered-by: Laravel", "set-cookie: XSRF-TOKEN", "laravel_session"],
    cookies: ["laravel_session", "XSRF-TOKEN"],
    paths: ["/public/", "/storage/", "/vendor/"],
    patterns: [/csrf-token/, /laravel_session/, /XSRF-TOKEN/, /\/storage\/app\//],
    developer_habits: {
      common_paths: [
        "/.env", "/.env.example", "/.env.local", "/artisan", "/composer.json",
        "/composer.lock", "/public/index.php", "/storage/logs/laravel.log",
        "/phpinfo.php", "/info.php", "/api/", "/admin", "/nova", "/filament",
        "/backpack", "/voyager",
      ],
      backup_patterns: [
        ".env.bak", ".env.backup", ".env.old", ".env.save", "composer.json.bak", ".env~", ".env.orig",
      ],
      common_admin_names: ["admin", "nova", "filament", "backpack", "voyager", "dashboard"],
      version_exposures: ["/composer.json", "/composer.lock", "/artisan"],
    },
  },
  // ... other signatures kept for logic consistency
};

// ==============================================================
// STACK DETECTION ENGINE
// ==============================================================
async function detectStack(url: string): Promise<StackDetectionResult> {
  const detections: Record<string, any> = {};
  const results: StackDetectionResult = {
    detected: false,
    technologies: [],
    confidence: 0,
    primary_stack: null,
    raw_signals: [],
  };

  try {
    const res = await axios.get(url, {
      validateStatus: () => true,
      timeout: 10000,
      headers: stealthEngine.getTacticalHeaders(),
      maxRedirects: 3,
    });

    for (const [stackId, stack] of Object.entries(STACK_SIGNATURES)) {
      detections[stackId] = { ...stack, confidence: 0, signals: [] };
    }

    // Header detection
    for (const [stackId, stack] of Object.entries(STACK_SIGNATURES)) {
      for (const headerPattern of stack.headers) {
        for (const [headerName, headerValue] of Object.entries(res.headers)) {
          if (`${headerName}: ${headerValue}`.toLowerCase().includes(headerPattern.toLowerCase())) {
            detections[stackId].confidence += 30;
            detections[stackId].signals.push(`Header match: ${headerName}`);
            results.raw_signals.push(`[Signal] ${stack.name}: Header match ${headerName}`);
          }
        }
      }
    }

    // Cookie detection
    if (res.headers["set-cookie"]) {
      const cookies = Array.isArray(res.headers["set-cookie"])
        ? res.headers["set-cookie"].join(" ")
        : res.headers["set-cookie"];

      for (const [stackId, stack] of Object.entries(STACK_SIGNATURES)) {
        for (const cookiePattern of stack.cookies) {
          if (cookies.includes(cookiePattern)) {
            detections[stackId].confidence += 35;
            detections[stackId].signals.push(`Cookie match: ${cookiePattern}`);
            results.raw_signals.push(`[Signal] ${stack.name}: Cookie pattern detected`);
          }
        }
      }
    }

    // HTML pattern detection
    const html = res.data as string;
    for (const [stackId, stack] of Object.entries(STACK_SIGNATURES)) {
      for (const pattern of stack.patterns) {
        if (pattern.test(html)) {
          detections[stackId].confidence += 25;
          detections[stackId].signals.push("HTML pattern match");
          results.raw_signals.push(`[Signal] ${stack.name}: HTML fingerprint found`);
        }
      }
    }

    const sortedDetections = Object.entries(detections)
      .filter(([_, data]) => data.confidence > 0)
      .sort((a, b) => b[1].confidence - a[1].confidence);

    if (sortedDetections.length > 0) {
      results.detected = true;
      results.technologies = sortedDetections.map(([id, data]) => ({
        id,
        name: data.name,
        category: data.category,
        confidence: Math.min(data.confidence, 100),
        signals: data.signals,
      }));
      results.primary_stack = results.technologies[0];
      results.confidence = results.primary_stack.confidence;
    }

    return results;
  } catch (e: any) {
    logger.error(`Stack detection failed: ${e.message}`);
    return { ...results, error: e.message };
  }
}

// ==============================================================
// SMART PATH GENERATOR
// ==============================================================
export function generatePredictedPaths(stackDetection: StackDetectionResult): PathPredictionResult {
  if (!stackDetection.detected || !stackDetection.primary_stack) {
    return {
      strategy: "GENERIC_FALLBACK",
      total_paths: 0,
      confidence: 0,
      paths: [
        "/.env", "/.env.local", "/config.php", "/wp-config.php", "/admin", "/login", "/phpinfo.php", "/.git/", "/robots.txt",
      ],
    };
  }

  const primaryStack = STACK_SIGNATURES[stackDetection.primary_stack.id];
  if (!primaryStack) return { strategy: "FALLBACK", total_paths: 0, confidence: 0, paths: [] };

  const habits = primaryStack.developer_habits;
  const generatedPaths = new Set<string>();

  habits.common_paths.forEach((p) => generatedPaths.add(p));
  habits.backup_patterns.forEach((bak) => {
    generatedPaths.add(`/${bak}`);
    generatedPaths.add(`/${bak}.tmp`);
    generatedPaths.add(`/${bak}.orig`);
  });

  const suffixes = ["", "/", ".php", ".html", ".asp", ".aspx"];
  habits.common_admin_names.forEach((adminName) => {
    suffixes.forEach((suffix) => generatedPaths.add(`/${adminName}${suffix}`));
  });

  const pathList = [...generatedPaths];

  return {
    strategy: `STACK_AWARE: ${primaryStack.name}`,
    stack_id: stackDetection.primary_stack.id,
    stack_name: primaryStack.name,
    total_paths: pathList.length,
    confidence: stackDetection.confidence,
    paths: pathList,
  };
}

// ==============================================================
// AUTONOMOUS FUZZING ENGINE
// ==============================================================
export async function smartFuzz(targetUrl: string, concurrency: number = 10): Promise<SmartFuzzResult> {
  const result: SmartFuzzResult = {
    target: targetUrl,
    started_at: new Date().toISOString(),
    stack_detection: null,
    path_prediction: null,
    found_endpoints: [],
    statistics: {
      total_tested: 0,
      found: 0,
      errors: 0,
      duration_seconds: 0,
    },
  };

  const startTime = Date.now();
  logger.info({ target: targetUrl }, "Starting autonomous smart fuzzing operation");

  try {
    result.stack_detection = await detectStack(targetUrl);
    result.path_prediction = generatePredictedPaths(result.stack_detection);

    const paths = result.path_prediction.paths;
    const baseUrl = new URL(targetUrl).origin;
    const limit = pLimit(concurrency);

    const fuzzTasks = paths.map((path: string) =>
      limit(async () => {
        try {
          const fullUrl = new URL(path, baseUrl).href;
          const res = await axios.head(fullUrl, {
            timeout: 3000,
            validateStatus: () => true,
            headers: stealthEngine.getTacticalHeaders(),
            maxRedirects: 0,
          });

          result.statistics.total_tested++;

          if (res.status >= 200 && res.status < 404 && res.status !== 403) {
            return {
              path,
              status_code: res.status,
              content_length: parseInt(res.headers["content-length"] as string) || 0,
              content_type: (res.headers["content-type"] as string) || null,
              confidence: result.path_prediction!.confidence,
            };
          }
          return null;
        } catch {
          result.statistics.errors++;
          return null;
        }
      })
    );

    const fuzzResults = await Promise.all(fuzzTasks);

    for (const fuzzResult of fuzzResults) {
      if (fuzzResult) {
        result.found_endpoints.push(fuzzResult);
        result.statistics.found++;
      }
    }

    result.statistics.duration_seconds = Math.round((Date.now() - startTime) / 1000);
    result.summary = `Fuzzing complete: Found ${result.found_endpoints.length} endpoints in ${result.statistics.duration_seconds}s.`;

    logger.info(result.summary);
    return result;
  } catch (e: any) {
    logger.error(`Smart fuzzing failed: ${e.message}`);
    result.error = e.message;
    return result;
  }
}

export async function scanSSRF(targetUrl: string, parameterName: string): Promise<any> {
  const probe = new SSRFProbe();
  return await probe.testEndpoint(targetUrl, parameterName);
}

export default {
  STACK_SIGNATURES,
  detectStack,
  generatePredictedPaths,
  smartFuzz,
  scanSSRF,
  SSRFProbe,
};
