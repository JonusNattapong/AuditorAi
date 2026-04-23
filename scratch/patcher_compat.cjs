const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server', 'agent.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add execSync back as a local import if it's missing but used
if (content.includes('execSync(') && !content.includes('import { execSync }')) {
    content = 'import { execSync } from "child_process";\n' + content;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully restored execSync for compatibility in server/agent.ts');
