# AGENTS.md
# REDLOCK AuditorAi - OpenCode Agent Guide

---

## ✅ Non-Negotiable Rules

**Always run `bun run check` before finishing. NO exceptions.**
Use `bun x tsc --noEmit file.ts` for single files.

---

## Runtime & Stack
- **Runtime: Bun only. Never use node, tsx, npm install.**
- TypeScript strict mode, ESM modules
- Core frameworks: Elysia, Ink, Playwright

---

## Priority Entrypoints
Always modify these first before anything else:
```
index.ts              Main CLI entry
server/index.ts       API server
server/agent.ts       Agent runtime
cli/index.tsx         Terminal UI
```

## Active Working Directories
```
src/      Core libraries
engine/   Security scanning logic
server/   HTTP services & agents
cli/      Terminal interface
tools/    Automation tools
lab/      Research & testing
```

---

## Commands
```bash
# Install
bun install

# Run
bun start            # CLI
bun run server       # API server
bun run tui          # Terminal UI
bun run dev          # Development mode
bun run lab          # Training lab

# Verify
bun run check        # Full typecheck (MANDATORY)
bun file.ts          # Run any TS file directly
```

---

## Architecture Rules
### Configuration
- **Never hardcode**: model names, API URLs, headers, keys
- Use `src/config/configManager.ts`, `keyPool.ts`, `modelCatalog.ts`
- All config lives in `src/config/` or `server/` only

### Network Tools
- Use Playwright (Chromium) for browser automation
- All outgoing requests MUST use `stealthEngine.getTacticalHeaders()`
- Proxy rotation is required via `keyPool`
- Always add timeouts to all blocking operations

### Code Style
- 2 space indent
- NO `any` type at module boundaries
- Wrap all network/filesystem calls in try/catch
- Use `src/runtime/logger.ts` for all logging
- Avoid emojis in logs
- `import pLimit from "p-limit"` for concurrency

---

## Critical Gotchas
1. `server/shadowProxy.ts` is a MITM proxy - don't break CONNECT tunneling
2. Singleton exports cause state leaks - export classes instead
3. Node.js http headers are always lowercase
4. http-proxy requires explicit error handlers or it crashes the whole process
5. Never commit `.env` or any API keys

> Last updated: 2026-04-23
