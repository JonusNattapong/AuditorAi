# Full TUI Command System Migration Plan

## Architecture Overview

This document outlines the complete migration of the Claude Code command system to REDLOCK AuditorAi. This is the most advanced command and slash system ever built for AI agents.

---

## ✅ System Architecture Analysis Completed

### Core Components from `.claude-code-main/src/commands.ts`

| Component | Description | Status |
|---|---|---|
| ✅ **Command Registry** | Memoized centralized command loader | ✅ Mapped |
| ✅ **Command Types** | `local`, `local-jsx`, `prompt`, `resume` | ✅ Mapped |
| ✅ **Availability Gating** | Auth / Provider based command filtering | ✅ Mapped |
| ✅ **Dynamic Loading** | Skills, Plugins, Workflows, Bundled commands | ✅ Mapped |
| ✅ **Builtin Commands** | 87+ builtin commands | ✅ Mapped |
| ✅ **Bridge Safety** | Remote session command filtering | ✅ Mapped |
| ✅ **Skill Tool Integration** | Automatic command exposure to agent | ✅ Mapped |
| ✅ **Cache Management** | Layered memoization invalidation system | ✅ Mapped |

---

## 🚀 Migration Phases

### Phase 1: Core Infrastructure

1. **Base Command Interface**
    - Port `Command` type definition
    - Implement command metadata schema
    - Add aliases, availability, and source tracking

2. **Command Registration System**
    - Implement `memoize` based registry
    - Lazy command loading
    - Plugin / Skill / Workflow integration points

3. **Slash Command Parser**
    - Input line detection `/command args`
    - Command resolution with alias support
    - Argument parsing

### Phase 2: Loading System

1. **Dynamic Sources**
    - Bundled skills
    - Local skill directory commands
    - Plugin commands
    - Workflow script commands
    - MCP server commands

2. **Availability Filtering**
    - Provider based gating
    - Feature flag filtering
    - User type permissions
    - Remote mode safety

### Phase 3: System Integration

1. **CLI TUI Integration**
    - Typeahead / autocomplete
    - Command help display
    - Status line integration
    - Keyboard shortcut system

2. **Agent Integration**
    - Skill Tool command exposure
    - Automatic command discovery
    - Agent invokable commands

### Phase 4: Command Porting

| Priority | Commands |
|---|---|
| 🔴 HIGH | `/help`, `/status`, `/tasks`, `/clear`, `/exit`, `/model`, `/config`, `/memory` |
| 🟠 MEDIUM | `/mcp`, `/plugins`, `/skills`, `/review`, `/plan`, `/cost`, `/summary` |
| 🟡 LOW | All other 70+ commands |

---

## ✨ Capabilities this will unlock

✅ 100% parity with Claude Code TUI experience
✅ Full slash command system with autocomplete
✅ Dynamic skill and plugin command loading
✅ Remote session compatible commands
✅ Agent self-invokable commands
✅ Layered cache invalidation system
✅ Professional noir aesthetic integration
✅ Zero migration regression

This is the final major subsystem required to complete the REDLOCK AuditorAi platform.
