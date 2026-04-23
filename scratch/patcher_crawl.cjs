const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server', 'agent.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ensure util is imported or require'd
if (!content.includes('const util = require("util")')) {
    content = content.replace('import { exec } from "child_process";', 'import { exec } from "child_process";\nconst util = require("util");\nconst execAsync = util.promisify(exec);');
}

// 2. Wrap the crawl_url block
const oldCrawl = `            const output = execSync(\`python "\${scriptPath}"\`, {
              encoding: "utf8",
              env: {
                ...process.env,
                PYTHONUTF8: "1"
              }
            });`;

const newCrawl = `            const { stdout: output } = await execAsync(\`python "\${scriptPath}"\`, {
              encoding: "utf8",
              env: {
                ...process.env,
                PYTHONUTF8: "1"
              }
            });`;

content = content.replace(oldCrawl, newCrawl);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched server/agent.ts (crawl_url)');
