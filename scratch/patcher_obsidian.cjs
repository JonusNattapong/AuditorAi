const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "server", "agent.ts");
let content = fs.readFileSync(filePath, "utf8");

// Update write_result to include Obsidian Frontmatter on first write
const oldWrite = `          const next =
            writeMode === "replace" ? args.content : current + args.content;
          fs.writeFileSync(resultDraftPath, next, "utf8");`;

const newWrite = `          let finalBody = args.content;
          if (writeMode === "replace" && !args.content.startsWith("---")) {
            const date = new Date().toISOString();
            const frontmatter = \`---
title: Security Audit Report
status: in-progress
created: \${date}
tags: [audit, security, redlock]
---
\`;
            finalBody = frontmatter + args.content;
          }
          const next = writeMode === "replace" ? finalBody : current + args.content;
          fs.writeFileSync(resultDraftPath, next, "utf8");`;

content = content.replace(oldWrite, newWrite);

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully patched server/agent.ts for Obsidian Frontmatter");
