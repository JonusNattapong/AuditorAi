/**
 * REDLOCK-101 WEB SECURITY LAB SERVER (MASTER CONTROLLER)
 * ระบบ Dashboard กลางสำหรับบริหารจัดการเลเวลฝึกเจาะระบบ
 */

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import httpProxy from "http-proxy";
import chalk from "chalk";
import os from "os";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// ดึงข้อมูล Metadata จาก levels.json
const LEVELS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "levels.json"), "utf8"),
);

const app = express();
const proxy = httpProxy.createProxyServer({});
const PORT = 8100;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// หน้าหลัก Dashboard
app.get("/", (req: Request, res: Response) => {
  let levelRows = LEVELS.map(
    (level) => `
        <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 15px; color: #94a3b8;">${level.id}</td>
            <td style="padding: 15px; font-weight: bold; color: #f8fafc;">${level.name}</td>
            <td style="padding: 15px;"><span style="background: #1e293b; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #38bdf8;">${level.category}</span></td>
            <td style="padding: 15px; color: #f59e0b;">Port ${level.port}</td>
            <td style="padding: 15px;">
                <a href="http://localhost:${level.port}" target="_blank" 
                   style="background: #f59e0b; color: #000; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 13px;">
                   LAUNCH LEVEL →
                </a>
            </td>
        </tr>
    `,
  ).join("");

  res.send(`
    <html>
    <head>
        <title>REDLOCK-101 Security Lab Dashboard</title>
        <style>
            body { background: #020617; color: #f8fafc; font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
            .header { border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 40px; }
            h1 { color: #f59e0b; margin: 0; font-size: 2.5rem; letter-spacing: -0.025em; }
            table { width: 100%; border-collapse: collapse; background: #0f172a; border-radius: 8px; overflow: hidden; }
            th { text-align: left; background: #1e293b; padding: 15px; color: #94a3b8; font-size: 14px; text-transform: uppercase; }
            .status-banner { background: #1e293b; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 30px; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>REDLOCK AUDITORAI TRAINING LAB</h1>
            <p style="color: #94a3b8;">Autonomous Security Intelligence Training Environment</p>
        </div>

        <div class="status-banner">
            <strong>SYSTEM READY:</strong> Master Controller running at port ${PORT}. 
            <p style="font-size: 14px; margin-top: 5px; color: #cbd5e1;">
                แต่ละเลเวลจะทำงานแยกกันบน Port ของตัวเอง เพื่อนสามารถรันเลเวลที่ต้องการด้วยคำสั่ง <code>bun lab/levels/levelXX.ts</code>
            </p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Challenge Name</th>
                    <th>Category</th>
                    <th>Endpoint</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${levelRows}
            </tbody>
        </table>

        <div style="margin-top: 40px; text-align: center; color: #475569; font-size: 12px;">
            REDLOCK AuditorAi Lab System v2.0 | Sunset Noir Edition
        </div>
    </body>
    </html>
    `);
});

// หน้า Guide รวม
app.get("/guide", (req: Request, res: Response) => {
  res.send(
    "<h1>Lab Guide is coming soon in English and Thai.</h1><a href='/'>Back</a>",
  );
});

app.listen(PORT, () => {
  console.log(
    chalk.bold.hex("#f59e0b")("\n========================================="),
  );
  console.log(chalk.bold.hex("#f59e0b")("REDLOCK-101 MASTER CONTROLLER LIVE"));
  console.log(
    chalk.bold.hex("#f59e0b")("========================================="),
  );
  console.log(`Dashboard: ${chalk.cyan(`http://localhost:${PORT}`)}`);
  console.log(`Ready to manage ${LEVELS.length} mission levels.`);
  console.log(
    chalk.dim("\n  Hint: Run levels individually for optimal isolation."),
  );
  console.log(
    chalk.bold.hex("#f59e0b")("=========================================\n"),
  );
});
