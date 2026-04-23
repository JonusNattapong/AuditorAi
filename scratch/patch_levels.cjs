const fs = require('fs');
const path = require('path');

const levelsDir = 'lab/levels';
const files = fs.readdirSync(levelsDir).filter(f => f.startsWith('level') && f.endsWith('.ts') && f !== 'index.ts');

files.forEach(file => {
    let content = fs.readFileSync(path.join(levelsDir, file), 'utf8');
    if (content.includes('export const info')) {
        console.log(`Skipping ${file} (Already patched)`);
        return;
    }

    const levelNum = file.match(/\d+/)[0];
    const nameMatch = content.match(/Level \d+: (.*)/i);
    let name = nameMatch ? nameMatch[1].replace(/<\/h1>|║|╔|═|╚/g, '').trim() : 'Level ' + levelNum;
    name = name.split('\n')[0].trim(); // Take only first line if multiple

    const info = `
// Export for lab_server
export const info = {
  level: ${parseInt(levelNum)},
  name: "${name}",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
`;

    // Wrap listen call
    content = content.replace(/app\.listen\(PORT, \(\) => \{/g, 'if (typeof require !== "undefined" && require.main === module) {\n  app.listen(PORT, () => {');
    
    // Attempt to find the end of the listen block to close the if statement
    // Simple approach: append at the end if it looks like it ends with });
    if (content.trim().endsWith('});')) {
       content = content.trim() + '\n}\n' + info;
    } else {
       // If it doesn't end with });, it might be more complex, but most levels do
       content = content + '\n' + info;
    }

    fs.writeFileSync(path.join(levelsDir, file), content);
    console.log(`✅ Patched ${file}`);
});
