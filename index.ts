#!/usr/bin/env node
import inquirer from "inquirer";
import ora from "ora";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import chalk from "chalk";
const { white, yellow, red, cyan, green, bold, dim } = chalk;
import figures from "figures";
import boxen from "boxen";
import gradient from "gradient-string";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force UTF-8 encoding on Windows for all subprocesses
process.env.PYTHONUTF8 = "1";
process.env.PYTHONIOENCODING = "UTF-8";

async function waitForServer(
  url: string,
  maxWait: number,
  interval: number,
): Promise<boolean> {
  let elapsed = 0;

  while (elapsed < maxWait) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise<void>((r) => setTimeout(r, interval));
    elapsed += interval;
  }

  return false;
}

async function main(): Promise<void> {
  console.clear();

  const logo = `                                                                
▄▄▄▄▄▄▄    ▄▄▄▄▄▄▄ ▄▄▄▄▄▄   ▄▄▄        ▄▄▄▄▄    ▄▄▄▄▄▄▄ ▄▄▄   ▄▄▄ 
███▀▀███▄ ███▀▀▀▀▀ ███▀▀██▄ ███      ▄███████▄ ███▀▀▀▀▀ ███ ▄███▀ 
███▄▄███▀ ███▄▄    ███  ███ ███      ███   ███ ███      ███████   
███▀▀██▄  ███      ███  ███ ███      ███▄▄▄███ ███      ███▀███▄  
███  ▀███ ▀███████ ██████▀  ████████  ▀█████▀  ▀███████ ███  ▀███                                                                 
  `;

  console.log(gradient("#D97757", "#FCAB64", "#D97757")(logo));

  const statusText = "Establishing secure uplink to AuditorAi Swarm...";
  let offset = 0;

  const spinner = ora({
    spinner: "dots",
    color: "yellow",
  }).start();

  // Claude-style Shimmering Gradient Animation
  const shimmerInterval = setInterval(() => {
    const colors = [
      "#D97757",
      "#FCAB64",
      "#A7C957", // Tactical Green highlight
      "#FCAB64",
      "#D97757",
    ];

    // Shift colors for the shimmer effect
    const shiftedColors = [...colors.slice(offset), ...colors.slice(0, offset)];
    // @ts-ignore
    spinner.text = gradient(...shiftedColors)(statusText);
    offset = (offset + 1) % colors.length;
  }, 150);

  await new Promise((resolve) => setTimeout(resolve, 3500));
  clearInterval(shimmerInterval);

  spinner.succeed(chalk.bold.hex("#A7C957")("INTELLIGENCE SWARM SYNCHRONIZED"));
  await new Promise((resolve) => setTimeout(resolve, 800));

  console.clear();
  const sunset = gradient("#D97757", "#FCAB64", "#D97757");
  console.log(sunset("\n  REDLOCK AUDITORAI MISSION CONTROL\n"));

  console.log(
    chalk.hex("#FCAB64")(`  ${figures.tick} `) +
      chalk.white("Intelligence Layer: ") +
      chalk.hex("#D97757")("ACTIVE"),
  );
  console.log(
    chalk.hex("#FCAB64")(`  ${figures.tick} `) +
      chalk.white("Red Team Engine: ") +
      chalk.hex("#D97757")("ENABLED"),
  );
  console.log(
    chalk.hex("#FCAB64")(`  ${figures.tick} `) +
      chalk.white("Stealth Framework: ") +
      chalk.hex("#D97757")("ENGAGED"),
  );
  console.log("\n");

  const { mode } = await inquirer.prompt<{ mode: "tui" | "exit" }>([
    {
      type: "list",
      name: "mode",
      message: chalk.hex("#FCAB64").bold("YOU ARE READY!!!!!!!!: "),
      choices: [
        {
          name:
            chalk.hex("#D97757").bold("[Start] REDLOCK") +
            chalk.dim(" — REDLOCK AuditorAi Autonomous Intelligence Swarm"),
          value: "tui",
        },
        {
          name: chalk.dim("[x] Exit RedLock"),
          value: "exit",
        },
      ],
    },
  ]);

  if (mode === "exit") process.exit(0);

  if (mode === "tui") {
    const isDev = process.argv.includes("--dev");

    console.log(
      chalk.yellow(
        `\n${figures.play} Initializing API Gateway & Worker in ${isDev ? chalk.bold("DEVELOPMENT") : "PRODUCTION"} mode...`,
      ),
    );

    const spawnOptions = (logFile: string) => {
      const fd = fs.openSync(logFile, "a");
      return {
        stdio: ["ignore", fd, fd] as any,
        detached: false,
      };
    };

    // 1. Start API Server
    const serverPath = path.join(__dirname, "server", "index.ts");
    const serverArgs = isDev ? ["--watch", serverPath] : [serverPath];
    const server: ChildProcess = spawn(
      "bun",
      serverArgs,
      spawnOptions(path.join(__dirname, "server_debug.log")),
    );

    server.on("error", (err: Error) => {
      console.error(
        chalk.red(`${figures.cross} Server failed: ${err.message}`),
      );
      process.exit(1);
    });

    // 2. Start Background Worker
    const workerPath = path.join(__dirname, "engine", "worker.ts");
    const workerArgs = isDev ? ["--watch", workerPath] : [workerPath];
    const worker: ChildProcess = spawn(
      "bun",
      workerArgs,
      spawnOptions(path.join(__dirname, "worker_debug.log")),
    );

    worker.on("error", (err: Error) => {
      console.error(
        chalk.red(`${figures.cross} Worker failed: ${err.message}`),
      );
    });

    console.log(
      chalk.cyan(`${figures.info} Waiting for API Gateway to become ready...`),
    );

    const maxWait = 30_000;
    const interval = 1_000;

    const serverReady = await waitForServer(
      "http://localhost:4040/api/health",
      maxWait,
      interval,
    );

    if (!serverReady) {
      console.error(chalk.red(`${figures.cross} API Gateway timeout.`));
      server.kill();
      worker.kill();
      process.exit(1);
    }

    console.log(
      chalk.bold.green(
        `\n${figures.tick} REDLOCK AUDITORAI ENGINE INITIALIZED ${isDev ? "(DEV MODE)" : ""}`,
      ),
    );

    const cliPath = path.join(__dirname, "cli", "index.tsx");
    const cliArgs = isDev ? ["--watch", cliPath] : [cliPath];
    const cli: ChildProcess = spawn("bun", cliArgs, { stdio: "inherit" });

    cli.on("close", (code: number | null) => {
      server.kill();
      worker.kill();
      process.exit(code ?? 0);
    });
  }
}

main().catch((err: Error) => {
  console.error(chalk.red(`${figures.cross} Boot Error: ${err.message}`));
});
