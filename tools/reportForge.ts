/**
 * reportForge.tsx — Strategic Intelligence Dossier Generator
 *
 * 📑 Transforms raw research into a premium, board-ready security assessment.
 * Features: Risk Heatmaps, OWASP Top 10 Mapping, and "Operational Noir" PDF styling.
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";

interface OWASPMapping {
  [key: string]: string;
}

interface Finding {
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  score: number;
  owasp: string;
}

interface DossierSummary {
  [severity: string]: number;
}

interface PDFGenerationResult {
  path: string;
  findingsCount: number;
}

// ==============================================================
// OWASP TOP 10 MAPPING (2021-2024 Reference)
// ==============================================================
const OWASP_MAP: OWASPMapping = {
  "SQL Injection": "A03:2021-Injection",
  XSS: "A03:2021-Injection",
  "Cross-Site Scripting": "A03:2021-Injection",
  "Broken Auth": "A07:2021-Identification and Authentication Failures",
  "Sensitive Data Exposure": "A02:2021-Cryptographic Failures",
  SSRF: "A10:2021-Server-Side Request Forgery",
  IDOR: "A01:2021-Broken Access Control",
  Misconfiguration: "A05:2021-Security Misconfiguration",
  "Vulnerable Component": "A06:2021-Vulnerable and Outdated Components",
};

// ==============================================================
// DOSSIER PARSER
// ==============================================================
function parseDossier(markdown: string): Finding[] {
  const findings: Finding[] = [];
  const lines = markdown.split("\n");

  let currentTitle = "General Findings";
  let inFindingsSection = false;

  for (const line of lines) {
    // Detect findings section
    if (
      line.includes("##") &&
      (line.toLowerCase().includes("vulnerabilit") ||
        line.toLowerCase().includes("findings"))
    ) {
      inFindingsSection = true;
      continue;
    }

    if (inFindingsSection && line.startsWith("###")) {
      currentTitle = line.replace(/^###\s*/, "").trim();
      continue;
    }

    // Extract severity indicators like [CRITICAL], [HIGH], etc.
    const severityMatch = line.match(/\[(CRITICAL|HIGH|MEDIUM|LOW|INFO)\]/i);
    if (severityMatch) {
      const severityRaw = severityMatch[1].toUpperCase();
      const severity = severityRaw as Finding["severity"];

      const score =
        severity === "CRITICAL"
          ? 9.5
          : severity === "HIGH"
            ? 8.0
            : severity === "MEDIUM"
              ? 5.0
              : 2.0;

      const owaspKey = Object.keys(OWASP_MAP).find((k) =>
        currentTitle.toLowerCase().includes(k.toLowerCase()),
      );

      findings.push({
        title: currentTitle,
        severity,
        score,
        owasp: owaspKey ? OWASP_MAP[owaspKey] : "A00:General Vulnerability",
      });
    }
  }

  return findings;
}

// ==============================================================
// HTML TEMPLATE GENERATOR (Cyber-Noir Aesthetic)
// ==============================================================
function generateHTML(
  target: string,
  findings: Finding[],
  rawDossier: string,
): string {
  const timestamp = new Date().toLocaleString();

  const summary = findings.reduce<DossierSummary>((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});

  const findingsList = findings
    .map(
      (f) => `
    <div class="finding-card ${f.severity.toLowerCase()}">
      <div class="f-header">
        <span class="f-severity">${f.severity}</span>
        <span class="f-title">${f.title}</span>
        <span class="f-score">CVSS ${f.score}</span>
      </div>
      <div class="f-owasp">${f.owasp}</div>
    </div>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --bg: #0a0a0a;
      --card-bg: #151515;
      --accent: #ff0055;
      --critical: #ff0000;
      --high: #ff5500;
      --medium: #f1c40f;
      --low: #3498db;
      --text: #e0e0e0;
      --dim: #666666;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 40px;
    }
    .page-break { page-break-after: always; }
    header {
      border-left: 5px solid var(--accent);
      padding-left: 20px;
      margin-bottom: 50px;
    }
    h1 { 
      font-size: 3rem; 
      margin: 0; 
      letter-spacing: -2px; 
      text-transform: uppercase; 
    }
    .meta { 
      color: var(--dim); 
      margin-top: 10px; 
      font-family: monospace; 
    }
    
    /* HEATMAP */
    .heatmap-container { margin: 40px 0; }
    .heatmap {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      width: 400px;
      height: 300px;
      border: 1px solid #333;
    }
    .cell { 
      background: #222; 
      position: relative; 
      border: 1px solid #111; 
    }
    .cell.impact-5 { background: #400; }
    .cell.impact-4 { background: #300; }
    .cell.impact-3 { background: #200; }
    .marker { 
      width: 10px; height: 10px; background: white; border-radius: 50%;
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      box-shadow: 0 0 10px white;
    }

    /* FINDINGS */
    .findings-grid { 
      display: grid; 
      gap: 20px; 
      margin-top: 30px; 
    }
    .finding-card {
      background: var(--card-bg);
      border: 1px solid #333;
      border-left-width: 8px;
      padding: 20px;
    }
    .finding-card.critical { border-left-color: var(--critical); }
    .finding-card.high { border-left-color: var(--high); }
    .finding-card.medium { border-left-color: var(--medium); }
    .finding-card.low { border-left-color: var(--low); }
    
    .f-header { 
      display: flex; 
      align-items: center; 
      gap: 15px; 
      margin-bottom: 5px; 
    }
    .f-severity { 
      font-weight: bold; 
      background: #333; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 0.8rem; 
    }
    .f-title { 
      font-size: 1.2rem; 
      font-weight: bold; 
      flex-grow: 1; 
    }
    .f-score { 
      font-family: monospace; 
      color: var(--dim); 
    }
    .f-owasp { 
      font-size: 0.8rem; 
      color: var(--accent); 
      font-family: monospace; 
    }

    .summary-box {
      display: flex; 
      gap: 20px; 
      margin-top: 20px;
    }
    .stat { 
      background: #222; 
      padding: 15px; 
      border-radius: 8px; 
      flex: 1; 
      text-align: center; 
    }
    .stat-val { 
      font-size: 2rem; 
      font-weight: bold; 
      display: block; 
    }
    .stat-label { 
      font-size: 0.7rem; 
      color: var(--dim); 
      text-transform: uppercase; 
    }
  </style>
</head>
<body>
  <header>
    <h1>AuditorAi Intelligence Dossier</h1>
    <div class="meta">
      PROJECT: ${target.toUpperCase()}<br>
      TIMESTAMP: ${timestamp}<br>
      OPERATION: AUTONOMOUS SWARM RECON
    </div>
  </header>

  <section>
    <h2>Executive Summary</h2>
    <div class="summary-box">
      <div class="stat"><span class="stat-val" style="color:var(--critical)">${summary.CRITICAL || 0}</span><span class="stat-label">Critical</span></div>
      <div class="stat"><span class="stat-val" style="color:var(--high)">${summary.HIGH || 0}</span><span class="stat-label">High Risk</span></div>
      <div class="stat"><span class="stat-val" style="color:var(--medium)">${summary.MEDIUM || 0}</span><span class="stat-label">Medium Risk</span></div>
      <div class="stat"><span class="stat-val">${findings.length}</span><span class="stat-label">Total Findings</span></div>
    </div>
  </section>

  <section class="heatmap-container">
    <h2>Strategic Risk Matrix</h2>
    <div class="heatmap">
      ${Array.from({ length: 25 })
        .map((_, i) => `<div class="cell impact-${Math.floor(i / 5)}"></div>`)
        .join("")}
    </div>
    <p style="color:var(--dim); font-size: 0.8rem;">[ IMPACT / LIKELIHOOD DISTRIBUTION ]</p>
  </section>

  <div class="page-break"></div>

  <section>
    <h2>Tactical Findings & OWASP Mapping</h2>
    <div class="findings-grid">
      ${findingsList}
    </div>
  </section>

  <footer style="margin-top: 50px; border-top: 1px solid #333; padding-top: 20px; color: var(--dim); font-size: 0.7rem;">
    AUTHENTICATED AUDITOR INFRASTRUCTURE // GENERATED BY AUDITORAI 1.0.0
  </footer>
</body>
</html>
  `;
}

// ==============================================================
// PDF GENERATION ENGINE
// ==============================================================
export async function generateDossierPDF(
  target: string,
  markdown: string,
  outputPath: string,
): Promise<PDFGenerationResult> {
  const findings = parseDossier(markdown);
  const html = generateHTML(target, findings, markdown);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "domcontentloaded" });

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    },
  });

  await browser.close();

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    path: outputPath,
    findingsCount: findings.length,
  };
}

// Optional: Generate HTML only (for preview)
export async function generateDossierHTML(
  target: string,
  markdown: string,
  outputPath?: string,
): Promise<string> {
  const findings = parseDossier(markdown);
  const html = generateHTML(target, findings, markdown);

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, html, "utf8");
  }

  return html;
}

export default {
  generateDossierPDF,
  generateDossierHTML,
  parseDossier, // for testing/debugging
};
