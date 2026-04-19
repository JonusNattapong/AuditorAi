---
# Reverse Engineer — Analysis Export
# Repo: JonusNattapong/shanom
# Branch: main
# Type: repository
# Path: 
# Date: 2026-04-07T04:23:23.023Z
---
Based on my comprehensive analysis of the codebase, I can now provide the ultimate architectural blueprint system prompt.

---

# SHANOM - AI-POWERED APP SECURITY PLATFORM

## ULTIMATE ARCHITECTURE BLUEPRINT SYSTEM PROMPT

### Project Overview

**Shanom** is an autonomous, white-box AI penetration testing framework that combines static analysis (SAST, SCA, Secrets Detection) with dynamic penetration testing. It leverages a Code Property Graph (CPG) engine and LLM reasoning to validate every finding with a working proof-of-concept exploit.

---

### Repository Structure

```
shanom/
├── apps/
│   ├── cli/                    # CLI application (user interface)
│   │   ├── src/
│   │   │   ├── commands/       # CLI commands (start, stop, logs, etc.)
│   │   │   ├── config/         # Configuration handling
│   │   │   ├── docker.ts       # Docker container management
│   │   │   ├── env.ts          # Environment variable handling
│   │   │   ├── mode.ts         # Local vs NPX mode detection
│   │   │   ├── splash.ts       # Display utilities
│   │   │   └── index.ts        # CLI entry point
│   │   └── infra/             # Infrastructure configs
│   └── worker/                # Core pentest engine
│       ├── src/
│       │   ├── ai/            # AI agent execution (Claude)
│       │   ├── audit/         # Audit logging & metrics
│       │   ├── correlation/   # Static-Dynamic correlation
│       │   ├── cpg/           # Code Property Graph engine
│       │   ├── sast/          # Static analysis modules
│       │   ├── sca/           # Software composition analysis
│       │   ├── secrets/       # Secrets detection
│       │   ├── services/      # Core services (git, prompts, etc.)
│       │   ├── temporal/      # Temporal.io workflow orchestration
│       │   ├── types/         # TypeScript type definitions
│       │   ├── enterprise/    # Enterprise features (RBAC, SSO, multi-tenancy)
│       │   └── utils/         # Utility functions
│       └── prompts/           # AI agent prompts
├── docker-compose.yml         # Infrastructure (Temporal, router)
├── Dockerfile                 # Worker container definition
└── workspaces/              # Scan results and state (local mode)
```

---

### Core Architecture

#### 1. CLI Layer (`apps/cli`)

**Two Execution Modes:**
- **Local Mode**: Run from cloned repo, builds locally, uses `./workspaces/`
- **NPX Mode**: Run via Docker Hub, uses `~/.shanom/`

**Commands:**

| Command | Description |
|---------|-------------|
| `start` | Launch pentest scan (requires --url and --repo) |
| `stop` | Stop all containers |
| `logs` | Tail workflow log for workspace |
| `workspaces` | List all workspaces |
| `status` | Show running workers |
| `setup` | Configure credentials (NPX mode only) |
| `uninstall` | Remove ~/.shanom/ (NPX mode only) |
| `build` | Build worker image (local mode only) |

**Key Files:**
- `apps/cli/src/index.ts` - CLI dispatcher
- `apps/cli/src/commands/start.ts` - Scan launcher with workflow polling
- `apps/cli/src/docker.ts` - Container spawning logic
- `apps/cli/src/mode.ts` - Auto-detects local vs NPX mode

#### 2. Worker Layer (`apps/worker`)

**Execution Pipeline:**

```
Phase 1: Pre-Reconnaissance (sequential)
    ↓
Phase 2: Reconnaissance (sequential)
    ↓
Phase 3-4: Vulnerability Analysis + Exploitation (5 parallel pipelines)
    ├── injection-vuln → injection-exploit
    ├── xss-vuln → xss-exploit
    ├── auth-vuln → auth-exploit
    ├── ssrf-vuln → ssrf-exploit
    └── authz-vuln → authz-exploit
    ↓
Phase 5: Reporting (sequential)
    ├── report (comprehensive)
    ├── report-technical
    ├── report-remediation
    └── report-board
```

**Agent Types (from `apps/worker/src/types/agents.ts`):**
```typescript
const ALL_AGENTS = [
  'pre-recon', 'recon',
  'injection-vuln', 'xss-vuln', 'auth-vuln', 'ssrf-vuln', 'authz-vuln',
  'injection-exploit', 'xss-exploit', 'auth-exploit', 'ssrf-exploit', 'authz-exploit',
  'report', 'report-technical', 'report-remediation', 'report-board'
];
```

**Vulnerability Types:**
- `injection` - SQL, NoSQL, Command, LDAP injection
- `xss` - Reflected, Stored, DOM-based XSS
- `auth` - Authentication flaws
- `ssrf` - Server-Side Request Forgery
- `authz` - Authorization/IDOR issues

---

### Temporal.io Workflow Orchestration

**Workflow File:** `apps/worker/src/temporal/workflows.ts`

**Key Features:**
- **Retry Configuration**: Production (2hr timeout), Testing (fast), Subscription (extended)
- **Resume Capability**: Restore from checkpoint, cross-check deliverables
- **Queryable State**: `getProgress` query for monitoring
- **Graceful Failure**: Pipelines continue if one fails
- **Concurrency Limit**: Configurable parallelism for vuln-exploit pipelines

**Activity Proxies:**
```typescript
// Production: 2hr timeout, 50 retries with backoff
const acts = proxyActivities({ startToCloseTimeout: '2 hours', retry: PRODUCTION_RETRY });

// Testing: Fast retries for pipeline testing
const testActs = proxyActivities({ startToCloseTimeout: '30 minutes', retry: TESTING_RETRY });

// Subscription: Extended for rate limit recovery
const subscriptionActs = proxyActivities({ startToCloseTimeout: '8 hours', retry: SUBSCRIPTION_RETRY });
```

**Activity Input Structure:**
```typescript
interface ActivityInput {
  webUrl: string;
  repoPath: string;
  configPath?: string;
  outputPath?: string;
  pipelineTestingMode?: boolean;
  workflowId: string;
  sessionId: string;
}
```

---

### Static Analysis Modules

#### 1. CPG Engine (`apps/worker/src/cpg/`)
- Builds Code Property Graph (AST + CFG + PDG)
- Data flow analysis for source-to-sink tracking
- LLM reasoning at each node for security properties

**Files:**
- `engine.ts` - Main CPG engine
- `simple-builder.ts` - AST builder
- `data-flow-analyzer.ts` - Flow analysis
- `llm-reasoner.ts` - LLM security reasoning
- `models.ts` - Graph models

#### 2. SAST (`apps/worker/src/sast/`)
- **Point Issues**: Single-location vulnerabilities (weak crypto, hardcoded secrets)
- **Data Flow**: Cross-function vulnerability tracing

#### 3. SCA (`apps/worker/src/sca/`)
- Parse lock files (npm, yarn, pip, poetry, cargo)
- Query CVE databases (NSD, OSV)
- **Reachability Analysis**: Only flag exploitable CVEs

#### 4. Secrets Detection (`apps/worker/src/secrets/`)
- **Layer 1**: Regex patterns (AWS keys, GitHub tokens)
- **Layer 2**: LLM detection for custom formats
- **Layer 3**: Entropy analysis for high-randomness secrets

---

### Dynamic Exploitation

**Exploitation Queue:** Static findings → Dynamic validation → PoC generation

**Correlation Statuses:**
- `CONFIRMED` - Static finding successfully exploited
- `UNCONFIRMED` - Found statically, exploit failed
- `FALSE_POSITIVE` - Pattern matched but not exploitable
- `DYNAMIC_ONLY` - Exploited but not found statically

---

### AI Agent System

**SDK:** `@anthropic-ai/claude-agent-sdk` (via pnpm catalog)

**Key Files:**
- `apps/worker/src/ai/claude-executor.ts` - Claude API interaction
- `apps/worker/src/ai/message-handlers.ts` - Message processing
- `apps/worker/src/ai/progress-manager.ts` - Progress tracking
- `apps/worker/src/ai/models.ts` - Model selection

**Prompts:** `apps/worker/prompts/`
- Vulnerability detection prompts (`vuln-*.txt`)
- Exploitation prompts (`exploit-*.txt`)
- Reporting prompts (`report-*.txt`)
- Reconnaissance (`recon.txt`, `pre-recon-code.txt`)

---

### Session Manager (`apps/worker/src/session-manager.ts`)

**Agent Definitions:**
```typescript
export const AGENTS: Record<AgentName, AgentDefinition> = {
  'pre-recon': { promptTemplate: 'pre-recon-code', modelTier: 'large' },
  recon: { promptTemplate: 'recon' },
  'injection-vuln': { promptTemplate: 'vuln-injection' },
  // ... etc
};
```

**Playwright Session Mapping:**
- Phase 1 (Pre-recon): agent1
- Phase 2 (Recon): agent2
- Phase 3-4 (Vuln+Exploit): 5 parallel agents (agent1-5)
- Phase 5 (Reporting): agent1-3

---

### Services Layer (`apps/worker/src/services/`)

| Service | Purpose |
|---------|---------|
| `agent-execution.ts` | Execute Claude agent with SDK |
| `container.ts` | Container lifecycle management |
| `git-manager.ts` | Git checkpoint and restore |
| `queue-validation.ts` | Validate exploitation queue |
| `exploitation-checker.ts` | Check if exploit should run |
| `reporting.ts` | Assemble final reports |
| `preflight.ts` | Pre-flight validation checks |
| `config-loader.ts` | Load YAML config files |
| `prompt-manager.ts` | Load and format prompts |

---

### Enterprise Features

**Location:** `apps/worker/src/enterprise/`

- Multi-tenancy (logical, container, VPC isolation)
- RBAC (Admin, Security Engineer, Developer, Viewer)
- SSO/SAML/OIDC authentication
- CI/CD integration (GitHub Actions, GitLab CI, Jenkins)
- Quality gates and audit logging

---

### Infrastructure

**Docker Compose Services:**
```yaml
temporal:     # Workflow engine (port 7233, UI: 8233)
router:      # Optional multi-model router (port 3456)
```

**Environment Variables:**
- `ANTHROPIC_API_KEY` - Required for Claude
- `ANTHROPIC_BASE_URL` - Override for router
- `ANTHROPIC_AUTH_TOKEN` - Router auth token

---

### Output Structure

```
workspaces/{workspace}/
├── session.json              # Session metrics & resume state
├── workflow.log              # Execution log
├── deliverables/
│   ├── comprehensive_security_assessment_report.md
│   ├── technical_pentest_report.md
│   ├── remediation_guidance_report.md
│   ├── board_executive_report.md
│   ├── cpg/
│   │   ├── cpg_security_analysis.md
│   │   └── cpg_findings.json
│   ├── correlation/
│   │   ├── correlation_report.md
│   │   └── unified_findings.sarif
│   └── sca/
│       ├── sca_report.md
│       └── dependency_vulnerabilities.json
```

---

### Configuration

**Config File Format:** YAML (via `smol-toml`)

```yaml
description: "App description"
authentication:
  login_type: form
  login_url: "https://app.com/login"
  credentials:
    username: "test@example.com"
    password: "testpass"
rules:
  avoid:
    - type: path
      url_path: "/logout"
  focus:
    - type: path
      url_path: "/api/"
```

---

### Key Behaviors

1. **Auto-Mode Detection**: CLI detects local vs NPX based on presence of `docker-compose.yml` and `prompts/`
2. **Resume Logic**: Checks `session.json` for completed agents, restores git checkpoint, continues from failure point
3. **Pipeline Testing**: `--pipeline-testing` flag uses minimal prompts for fast iteration
4. **Router Support**: `--router` flag routes through multi-model proxy
5. **Preflight Validation**: Quick sanity checks before expensive agent runs
6. **Graceful Pipeline Failure**: If one vuln→exploit pipeline fails, others continue

---

### Development Commands

```bash
pnpm install          # Install dependencies
pnpm build           # Build all apps
pnpm biome           # Lint code
pnpm biome:fix       # Auto-fix linting
pnpm temporal:start  # Start Temporal worker
./shanom start -u <url> -r <path>  # Run scan
```

---

### Technology Stack

- **Runtime**: Node.js 18+
- **Package Manager**: pnpm 10.33.0
- **Language**: TypeScript 5.9.3
- **Workflow**: Temporal.io 1.11.0
- **AI SDK**: Anthropic Claude Agent SDK 0.2.38
- **Container**: Docker, Docker Compose
- **Linting**: Biome 2.0.0
- **Build**: tsdown (CLI), tsc (Worker)

---

**This is the authoritative architectural blueprint. All future development should align with these patterns and conventions.**