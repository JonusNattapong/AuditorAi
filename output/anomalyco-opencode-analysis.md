---
# Reverse Engineer — Analysis Export
# Repo: anomalyco/opencode
# Branch: dev
# Type: repository
# Path: /
# Date: 2026-04-05T13:20:35.872Z
---
─────┐
│                         OpenCode Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   CLI/CLI   │    │  Desktop    │    │   Web UI    │             │
│  │   Entry     │    │   App       │    │   (Zed)     │             │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │
│         │                  │                  │                     │
│         └──────────────────┼──────────────────┘                     │
│                            ▼                                        │
│                ┌───────────────────────┐                            │
│                │   TUI Core (packages  │                            │
│                │      /console)        │                            │
│                └───────────┬───────────┘                            │
│                            ▼                                        │
│                ┌───────────────────────┐                            │
│                │    State Manager      │                            │
│                │   (Zustand-like)     │                            │
│                └───────────┬───────────┘                            │
│                            ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Core Services Layer                          ││
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   ││
│  │  │   LSP      │ │   AI       │ │   File     │ │   Shell    │   ││
│  │  │   Manager  │ │   Engine   │ │   System   │ │   Handler  │   ││
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                            ▼                                        │
│                ┌───────────────────────┐                            │
│                │    Agent System      │                            │
│                │   (build/plan/general)│                           │
│                └───────────┬───────────┘                            │
│                            ▼                                        │
│                ┌───────────────────────┐                            │
│                │   External APIs      │                            │
│                │  (OpenAI/Claude/Gemini)│                          │
│                └───────────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Interactions

1. **Entry Points**: มี 3 entry points หลัก - CLI (main), Desktop App, และ Web/ Zed extension
2. **TUI Core**: เป็น core หลักที่รับผิดชอบการแสดงผลบน Terminal
3. **State Management**: ใช้รูปแบบที่คล้ายกับ Zustand สำหรับจัดการ application state
4. **Core Services**: ประกอบด้วย LSP Manager, AI Engine, File System, และ Shell Handler
5. **Agent System**: ระบบ Agent หลักที่มี 3 modes - build (full-access), plan (read-only), และ general (search/tasks)

---

## 3. เอนทิตีหลักและโมเดลข้อมูล (Core Entities & Data Models)

### 3.1 Agent State Schema

```typescript
interface AgentState {
  id: string;
  name: 'build' | 'plan' | 'general';
  mode: 'active' | 'idle' | 'thinking';
  context: AgentContext;
  permissions: PermissionSet;
}

interface AgentContext {
  currentTask: string | null;
  workingDirectory: string;
  openFiles: string[];
  recentChanges: FileChange[];
  conversationHistory: Message[];
}

interface PermissionSet {
  canEditFiles: boolean;
  canRunBash: boolean;
  canUseNetwork: boolean;
  maxFileSize: number; // in bytes
}
```

### 3.2 File System Entity

```typescript
interface FileEntity {
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
  lastModified: number;
  permissions: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
}

interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete' | 'rename';
  oldPath?: string;
  timestamp: number;
  diff?: string;
}
```

### 3.3 LSP Types

```typescript
interface LSPDocument {
  uri: string;
  languageId: string;
  version: number;
  content: string;
}

interface LSPDiagnostic {
  range: Range;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  code?: string | number;
  source?: string;
}

interface LSPCompletionItem {
  label: string;
  kind: CompletionKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
}
```

### 3.4 Message/Conversation Schema

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  toolCallId: string;
  output: string;
  error?: string;
}
```

### 3.5 Project Configuration

```typescript
interface OpenCodeConfig {
  version: string;
  model: ModelConfig;
  agent: AgentConfig;
  lsp: LSPConfig;
  plugins: string[];
  theme: string;
  keybindings: Record<string, string>;
}

interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'local';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}
```

---

## 4. ฟังก์ชันหลักและ Flow การทำงาน (Key Functionality & Logic Flow)

### 4.1 Main Execution Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     Startup Sequence                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Initialize CLI arguments                                       │
│         │                                                          │
│         ▼                                                          │
│  2. Load config from opencode.jsonc                               │
│         │                                                          │
│         ▼                                                          │
│  3. Initialize TUI (create terminal window)                       │
│         │                                                          │
│         ▼                                                          │
│  4. Connect to LSP servers                                        │
│         │                                                          │
│         ▼                                                          │
│  5. Initialize AI Engine with config                              │
│         │                                                          │
│         ▼                                                          │
│  6. Start Agent (default: build mode)                             │
│         │                                                          │
│         ▼                                                          │
│  7. Enter REPL loop                                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Message Processing Pipeline

```
User Input
     │
     ▼
┌─────────────────┐
│ Input Parser   │ ← Parse commands, mentions (@agent), flags
└────────┬────────      │
    └────────────┘  └──────────────┘
```

### 4.4 Key Features Implementation

#### Feature 1: Agent Switching
- กด Tab เพื่อสลับระหว่าง build และ plan agent
- build agent = full permissions
- plan agent = read-only, ต้องขออนุญาตก่อนรัน bash

#### Feature 2: File Editing
- รองรับ edit commands หลายรูปแบบ
- มีการ validate ก่อน apply changes
- รองรับ undo/redo

#### Feature 3: LSP Integration
- Auto-detect language servers จาก project
- รองรับหลาย languages พร้อมกัน
- Provide diagnostics, completions, go-to-definition

#### Feature 4: Terminal Integration
- Execute shell commands
- Stream output แบบ real-time
- Handle interactive commands (git, npm, etc.)

---

## 5. การตัดสินใจทางเทคนิคและ Patterns (Technical Decisions & Patterns)

### 5.1 Design Patterns Observed

**Pattern 1: Service Locator**
- ใช้สำหรับเข้าถึง core services (LSP, AI, FileSystem, Shell)
- ทำให้สามารถ swap implementations ได้ง่าย

**Pattern 2: Event-Driven Architecture**
- ใช้ event emitter สำหรับ communication ระหว่าง components
- เช่น file changes, LSP diagnostics, AI responses

**Pattern 3: Command Pattern**
- ห่อหุ้ม user commands เป็น objects
- ทำให้สามารถ undo/redo, log, และ validate ได้

**Pattern 4: Finite State Machine**
- ใช้สำหรับ Agent states (idle, thinking, active)
- ชัดเจนว่า state ไหนทำอะไรได้

### 5.2 Framework & Runtime Choices

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Runtime | Bun | Fast startup, native TS support, good for CLI |
| State Management | Custom (Zustand-like) | Lightweight, TypeScript-friendly |
| UI Framework | Custom TUI + React | Terminal rendering + component reusability |
| LSP Client | vscode-languagesclient | Mature, well-tested |
| AI SDK | Custom abstraction | Provider-agnostic |

### 5.3 Key Technical Decisions

1. **Client/Server Separation**: แยก core logic ออกจาก TUI ทำให้สามารถ ควบคุมจาก remote ได้

2. **Agent Architecture**: มี 3 agents แยกกัน ทำให้ ปรับแต่ง behavior ได้ตาม use case

3. **Streaming Responses**: ใช้ streaming สำหรับ AI responses ให้ UX ดีขึ้น

4. **Configuration Format**: ใช้ JSONC (JSON with comments) สำหรับ config files

5. **Plugin System**: รองรับ custom plugins สำหรับ theming และ functionality extension

---

## 6. การบูรณาการและ Dependencies (Integration & Dependencies)

### 6.1 External Dependencies

**Core Dependencies:**
- `bun` - Runtime และ package manager
- `@anthropic-ai/sdk` - Claude API client
- `openai` - OpenAI API client
- `vscode-languagesclient` - LSP protocol implementation
- `xterm` - Terminal emulator component
- `react` และ `react-dom` - UI components

**CLI Tools:**
- `boxen` - Terminal UI components
- `chalk` - Terminal colors
- `ora` - Terminal spinners
- `inquirer` - Interactive prompts

**Development Tools:**
- `typescript` - Type safety
- `vitest` - Testing framework
- `biome` - Linting and formatting
- `knip` - Unused code detection

### 6.2 Third-Party APIs

```
┌─────────────────────────────────────────────────────────────────────┐
│                      API Integrations                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Anthropic API   │  │   OpenAI API    │  │  Google AI API   │ │
│  │   (Claude)       │  │   (GPT-4)       │  │   (Gemini)       │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                     │            │
│           └─────────────────────┼─────────────────────┘            │
│                                 ▼                                   │
│                    ┌───────────────────────┐                       │
│                    │   AI Abstraction     │                       │
│                    │      Layer           │                       │
│                    └───────────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Infrastructure Requirements

- **Node.js/Bun Runtime**: ต้องมี Bun ติดตั้ง
- **Terminal**: รองรับ ANSI codes (most modern terminals)
- **File System**: Standard fs operations
- **Git**: สำหรับ version control integration

---

## 7. แผนปฏิบัติการที่สามารถดำเนินการได้ (Actionable Implementation Plan)

### Phase 1: Project Setup (Week 1)

1. **Initialize Monorepo Structure**
   - สร้าง root package.json พร้อม workspaces
   - ตั้งค่า TypeScript config (tsconfig.json)
   - ตั้งค่า Bun เป็น package manager
   - สร้าง folder structure ตาม packages/

2. **Setup Core Dependencies**
   - Install React, React DOM
   - Install Terminal libraries (xterm, boxen)
   - Install AI SDKs (anthropic, openai)
   - Install LSP client

3. **Configure Development Tools**
   - Setup Vitest สำหรับ testing
   - Setup Biome สำหรับ linting
   - Setup Husky สำหรับ git hooks
   - Configure Prettier

### Phase 2: Core Infrastructure (Week 2)

4. **Build State Management System**
   - สร้าง Zustand-like store
   - Implement agent state
   - สร้าง file state
   - สร้าง UI state

5. **Implement Service Locator**
   - สร้าง service container
   - Register core services
   - Implement dependency injection

6. **Build Configuration System**
   - Parse opencode.jsonc
   - Schema validation
   - Environment variable handling

### Phase 3: TUI Foundation (Week 3)

7. **Create Terminal UI Components**
   - Setup xterm.js
   - Build layout system (panels, splits)
   - Implement command palette
   - Create status bar

8. **Build Input/Output Handling**
   - Implement REPL loop
   - Handle keyboard shortcuts
   - Manage cursor position
   - Handle text selection

### Phase 4: AI Integration (Week 4)

9. **Build AI Abstraction Layer**
   - Create provider interface
   - Implement Anthropic adapter
   - Implement OpenAI adapter
   - Add streaming support

10. **Implement Agent System**
    - Build Agent base class
    - Create build agent (full permissions)
    - Create plan agent (read-only)
    - Create general agent (search)

11. **Tool System**
    - Define tool interface
    - Implement file tools (read, write, edit)
    - Implement shell tool
    - Implement search tool
    - Add permission checking

### Phase 5: LSP Integration (Week 5)

12. **LSP Client Implementation**
    - Setup language server protocol
    - Auto-detect LSP servers
    - Implement diagnostics
    - Implement completions

13. **File Watching**
    - Monitor file changes
    - Update LSP documents
    - Handle save events

### Phase 6: Advanced Features (Week 6)

14. **Plugin System**
    - Define plugin interface
    - Theme loader
    - Custom command registration

15. **Git Integration**
    - Detect git repo
    - Show git status
    - Handle git commands

16. **Desktop App Features**
    - Window management
    - Menu bar
    - System tray (optional)

### Phase 7: Testing & Polish (Week 7-8)

17. **E2E Testing**
    - Setup Playwright
    - Write critical path tests
    - Automate UI testing

18. **Performance Optimization**
    - Optimize startup time
    - Reduce memory usage
    - Improve streaming responsiveness

19. **Documentation & Examples**
    - Write README
    - Create example configs
    - Document plugin API

---

### Priority Order for Implementation

| Priority | Component | Rationale |
|----------|-----------|-----------|
| 1 | Project Setup | Foundation for everything |
| 2 | State Management | Required for all features |
| 3 | TUI Basics | Core user interface |
| 4 | AI Integration | Main value proposition |
| 5 | Tool System | How AI interacts with code |
| 6 | LSP | Developer experience |
| 7 | Polish | Final improvements |

---

### Testing Strategy

1. **Unit Tests**: ทดสอบ individual functions และ classes
2. **Integration Tests**: ทดสอบ service interactions
3. **E2E Tests**: ทดสอบ user workflows ด้วย Playwright
4. **Manual Testing**: ใช้สำหรับ UI/UX และ edge cases

### Key Configuration Files to Recreate

- `opencode.jsonc` - Main configuration
- `.opencode/agent/*.md` - Agent instructions
- `.opencode/command/*.md` - Command definitions
- `.opencode/plugins/*.json` - Plugin configs

---

นี่คือพิมพ์เขียวที่สมบูรณ์สำหรับการสร้างระบบ OpenCode จากศูนย์ โดยสามารถนำไปใช้เป็นแนวทางในการพัฒนาได้