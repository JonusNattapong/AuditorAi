# REDLOCK AuditorAi v3.0.0

## Autonomous Security Intelligence & Swarm Orchestration Platform

REDLOCK AuditorAi is a professional-grade autonomous intelligence platform designed for advanced security research, red teaming, and systematic vulnerability discovery. The system leverages a decentralized swarm architecture, enabling AI agents to conduct independent reconnaissance, analysis, and strategic reporting with full operational autonomy.

> **TACTICAL ADVISORY**
> This platform is engineered for elite security research and authorized auditing.
> Full agent autonomy is enabled. Operate with extreme precision.

---

## ✅ Latest 2026 Upgrade

✅ **Complete Swarm Autonomy System implemented**
✅ **Background Workers with Task Persistence**
✅ **Parallel Execution Engine with p-limit**
✅ **Strict Orchestration Protocol (Zero Ambiguity)**
✅ **Full TUI Command System / Slash Commands**
✅ **Cron Scheduler & Remote Session Teleport**
✅ **Watchdog Monitoring & Process Recovery**
✅ **Zero Summary Laziness Guarantee**
✅ **MITM Shadow Proxy with Active Request Mutation**
✅ **AI-Powered Payload Forge Engine**
✅ **HTTPS CONNECT Tunnel Support**

---

## Core Capabilities

- **JSON-Driven Intelligence**: Completely decoupled architecture. AI providers, model metadata, tactical tools, and stealth profiles are managed through a centralized, data-centric JSON infrastructure.
- **Predictive Fuzzing Engine**: Stack-aware path detection that fingerprints target technologies and predicts hidden endpoints based on deep developer habit analysis.
- **Tactical Stealth Engine**: Advanced anti-detection layer with identity rotation, randomized User-Agent profiling, and tactical header injection. Supports multi-proxy orchestration for WAF evasion.
- **Cyber-Noir Intelligence Dossiers**: Automated generation of premium, board-ready security assessments featuring Risk Heatmaps, OWASP mapping, and technical evidence.
- **Autonomous Swarm Controller**: Multi-provider orchestration allowing for cross-validation and parallel execution across OpenAI, Anthropic, Gemini, and Local models (Ollama/LM Studio).
- **Vision-Assisted Recon**: High-fidelity visual UI analysis to detect logic flaws and sensitive data exposure invisible to traditional crawlers.
- **Unrestricted System Agent**: Full shell execution, filesystem management, and persistent memory across missions.
- **Human-Mimetic Automation**: Playwright-powered browser automation with bezier-curve mouse movement and natural interaction patterns to bypass modern bot detection.

---

## Agent Arsenal (Swarm Tools)

| Tool | Capability |
|---|---|
| `run_command` | Native shell execution (PowerShell/Bash) with zero restrictions. |
| `fetch_url` | Stealth resource retrieval and content extraction. |
| `crawl_url` | Deep semantic web crawling via Crawl4AI. |
| `browser_action` | Interactive browser control (Navigate, Click, Type, Capture). |
| `security_recon` | DNS, Port, Header, SSL, Wayback, and Secret scanning suite. |
| `craft_exploit` | AI-assisted payload engineering and obfuscation. |
| `vision_analysis` | Visual UI auditing and OCR-based intelligence gathering. |
| `memory_read_write` | Persistent state synchronization across the agent swarm. |
| `obsidian_sync` | Intelligence vaulting and report synchronization with Obsidian. |

---

## Intelligence Vaulting & Reporting

AuditorAi features native integration with **Obsidian**, allowing the swarm to build a persistent, interconnected security knowledge base (Vault) in real-time.

- **Automated Dossiers**: Strategic reports are formatted in clean Markdown, ready for Obsidian's graph view.
- **Evidence Vaulting**: All tool outputs, screenshots, and findings are automatically categorized and cross-linked.
- **Braintrust Sync**: Synchronize mission intelligence across your personal knowledge base for long-term vulnerability tracking.

---

## Technical Architecture

- **Runtime**: [Bun](https://bun.sh) (High-performance TS/JS runtime)
- **API Engine**: [ElysiaJS](https://elysiajs.com) (End-to-end type-safe web framework)
- **Intelligence Orchestration**: Data-driven Swarm Controller
- **Stealth Automation**: Playwright with custom anti-detection protocols
- **Reporting**: Strategic PDF generation engine
- **Configuration**: Unified JSON System (`src/config/providers.json`, `server/tools.json`)

---

## Installation & Deployment

### 1. Initialization

```bash
bun install
```

### 2. Configuration

AuditorAi uses a centralized configuration system. Edit `src/config/providers.json` to manage AI gateways and `src/config/stealth_config.json` for anti-detection parameters. Persistent profiles can be managed via `src/config/configManager.ts`.

### 3. Execution Commands

| Command | Mode |
|---|---|
| `bun start` | Main Mission Bootstrap |
| `bun run tui` | Operational HUD (Terminal UI) |
| `bun run web` | API & Tactical Dashboard |
| `bun run check` | Full System Type Validation |
| `bun run lab` | Integrated Training Lab |

---

## Integrated Training Lab

The platform includes a dedicated security lab featuring 13 real-world vulnerability scenarios for training and mission validation, covering everything from SQLi and XSS to Logic Flaws and JWT Forgery.

```bash
bun lab/index.ts
```

---

## Compliance and Liability

This platform is intended for authorized security auditing, educational research, and defensive system hardening only. Unauthorized malicious use is strictly prohibited. The authors bear no responsibility for any actions performed using this software.

---

**Operational Precision. Swarm Intelligence. Zero Summary Laziness. Full Autonomy.**
