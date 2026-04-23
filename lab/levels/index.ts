import chalk from "chalk";
import os from "os";
import fs from "fs";
import path from "path";

const LEVELS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "levels.json"), "utf8"),
);

async function main() {
  console.clear();

  console.log(`
  ███╗   ███╗██╗██████╗ ██╗   ██╗    ██╗      █████╗ ██████╗ 
  ████╗ ████║██║██╔══██╗██║   ██║    ██║     ██╔══██╗██╔══██╗
  ██╔████╔██║██║██████╔╝██║   ██║    ██║     ███████║██████╔╝
  ██║╚██╔╝██║██║██╔══██╗██║   ██║    ██║     ██╔══██║██╔══██╗
  ██║ ╚═╝ ██║██║██████╔╝╚██████╔╝    ███████╗██║  ██║██████╔╝
  ╚═╝     ╚═╝╚═╝╚═════╝  ╚═════╝     ╚══════╝╚═╝  ╚═╝╚═════╝ 
  `);

  console.log(
    chalk.red.bold("\n  ✅ RedLock Integrated Security Training Lab\n"),
  );

  for (const level of LEVELS) {
    console.log(
      `  [${level.id}] Port ${chalk.yellow(level.port)} | ${chalk.cyan(level.category.padEnd(18))} | ${level.name}`,
    );
  }

  console.log(
    `\n  🚀 Run individual level: ${chalk.green(`npx tsx lab/levels/levelXX.ts`)}`,
  );
  console.log(
    `  🔥 Run all levels at once: ${chalk.green(`npx tsx lab/index.ts`)}`,
  );
  console.log(`\n`);
}

main();
