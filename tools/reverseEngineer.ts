/**
 * ReverseEngineer.ts - Binary Intelligence & Reverse Engineering Module
 * 
 * Conducts deep analysis of PE (Windows) and ELF (Linux) binaries.
 * Detects packed executables, dangerous imports, and hardcoded secrets.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { logger } from "../src/runtime/logger";

interface BinaryInfo {
  format: "PE" | "ELF" | "UNKNOWN";
  architecture: string;
  bits: 32 | 64;
  entryPoint: string;
  sections: Section[];
  imports: string[];
  exports: string[];
  strings: string[];
  vulnerabilities: VulnerabilityHint[];
  hasDebugSymbols: boolean;
  isPacked: boolean;
  fileSize: number;
  compileTimestamp: number | null;
}

interface Section {
  name: string;
  address: string;
  size: number;
  permissions: string;
  entropy: number;
}

interface VulnerabilityHint {
  type: string;
  description: string;
  confidence: number;
  location: string;
}

export class ReverseEngineer {
  private filePath: string;
  private buffer: Buffer;

  constructor(filePath: string) {
    this.filePath = filePath;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Target binary not found: ${filePath}`);
    }
    this.buffer = fs.readFileSync(filePath);
  }

  public analyze(): BinaryInfo {
    logger.info({ file: path.basename(this.filePath) }, "Starting binary intelligence analysis");

    const info: BinaryInfo = {
      format: this.detectFormat(),
      architecture: "unknown",
      bits: 64,
      entryPoint: "0x0",
      sections: [],
      imports: [],
      exports: [],
      strings: [],
      vulnerabilities: [],
      hasDebugSymbols: false,
      isPacked: false,
      fileSize: this.buffer.length,
      compileTimestamp: null
    };

    if (info.format === "PE") {
      this.parsePEHeader(info);
    } else if (info.format === "ELF") {
      this.parseELFHeader(info);
    }

    info.strings = this.extractStrings();
    info.vulnerabilities = this.scanForVulnerabilities(info);
    info.isPacked = this.detectPacking(info);

    logger.info({ format: info.format, size: info.fileSize }, "Binary analysis complete");
    return info;
  }

  private detectFormat(): "PE" | "ELF" | "UNKNOWN" {
    if (this.buffer[0] === 0x7F && this.buffer[1] === 0x45 && this.buffer[2] === 0x4C && this.buffer[3] === 0x46) {
      return "ELF";
    }
    if (this.buffer[0] === 0x4D && this.buffer[1] === 0x5A) {
      return "PE";
    }
    return "UNKNOWN";
  }

  private parsePEHeader(info: BinaryInfo) {
    try {
      const peOffset = this.buffer.readUInt32LE(0x3C);
      info.bits = this.buffer.readUInt16LE(peOffset + 4) === 0x8664 ? 64 : 32;
      info.entryPoint = `0x${this.buffer.readUInt32LE(peOffset + 40).toString(16)}`;
      info.compileTimestamp = this.buffer.readUInt32LE(peOffset + 8);
      info.architecture = info.bits === 64 ? "x86_64" : "x86";
      
      const debugDir = this.buffer.readUInt32LE(peOffset + 144);
      info.hasDebugSymbols = debugDir !== 0;
    } catch (e) {
      logger.warn("Failed to parse PE headers fully");
    }
  }

  private parseELFHeader(info: BinaryInfo) {
    try {
      info.bits = this.buffer[4] === 2 ? 64 : 32;
      info.entryPoint = info.bits === 64 
        ? `0x${this.buffer.readBigUInt64LE(24).toString(16)}`
        : `0x${this.buffer.readUInt32LE(24).toString(16)}`;
      info.architecture = info.bits === 64 ? "x86_64" : "x86";
    } catch (e) {
      logger.warn("Failed to parse ELF headers fully");
    }
  }

  private extractStrings(): string[] {
    const strings: string[] = [];
    let current = "";

    for (let i = 0; i < this.buffer.length; i++) {
      const c = this.buffer[i];
      if (c >= 0x20 && c <= 0x7E) {
        current += String.fromCharCode(c);
      } else {
        if (current.length >= 6) {
          strings.push(current);
        }
        current = "";
      }
    }

    return [...new Set(strings)].sort();
  }

  private detectPacking(info: BinaryInfo): boolean {
    const packedSignatures = [
      "UPX", "ASPack", "FSG", "PESpin", "VMProtect",
      "Themida", "Enigma", "MPRESS", "yoda's Protector"
    ];

    for (const sig of packedSignatures) {
      if (this.buffer.includes(sig)) {
        logger.warn({ signature: sig }, "Packed binary detected");
        return true;
      }
    }

    return false;
  }

  private scanForVulnerabilities(info: BinaryInfo): VulnerabilityHint[] {
    const vulnerabilities: VulnerabilityHint[] = [];

    const dangerousFunctions = [
      { name: "strcpy", risk: "Buffer overflow", confidence: 0.7 },
      { name: "strcat", risk: "Buffer overflow", confidence: 0.7 },
      { name: "gets", risk: "Buffer overflow", confidence: 0.9 },
      { name: "system", risk: "Command injection", confidence: 0.8 },
      { name: "popen", risk: "Command injection", confidence: 0.8 },
      { name: "ShellExecute", risk: "Command injection", confidence: 0.7 },
    ];

    for (const func of dangerousFunctions) {
      if (this.buffer.includes(func.name)) {
        vulnerabilities.push({
          type: func.risk,
          description: `Imported dangerous function: ${func.name}`,
          confidence: func.confidence,
          location: "Import Table"
        });
      }
    }

    const credentialPatterns = [
      /password/i, /secret/i, /api.*key/i, /token/i, /credential/i
    ];

    for (const pattern of credentialPatterns) {
      for (const str of info.strings) {
        if (pattern.test(str)) {
          vulnerabilities.push({
            type: "Hardcoded Credential Pattern",
            description: `Potential secret found in strings: ${str.substring(0, 40)}...`,
            confidence: 0.5,
            location: "Static Strings"
          });
          break;
        }
      }
    }

    return vulnerabilities;
  }

  public generateReport(): string {
    const info = this.analyze();
    
    let report = `[ MISSION: BINARY ANALYSIS DOSSIER ]\n`;
    report += `------------------------------------\n`;
    report += `TARGET: ${path.basename(this.filePath)}\n`;
    report += `FORMAT: ${info.format} (${info.bits}-bit ${info.architecture})\n`;
    report += `ENTRY:  ${info.entryPoint}\n`;
    report += `SIZE:   ${info.fileSize} bytes\n`;
    report += `PACKED: ${info.isPacked ? "YES (INTERFERENCE DETECTED)" : "NO"}\n`;
    report += `DEBUG:  ${info.hasDebugSymbols ? "PRESENT" : "STRIPPED"}\n\n`;

    report += `[ TACTICAL FINDINGS ]\n`;
    if (info.vulnerabilities.length === 0) {
      report += `No immediate vulnerability patterns identified.\n`;
    } else {
      for (const vuln of info.vulnerabilities) {
        report += `! [${Math.round(vuln.confidence * 100)}%] ${vuln.type}: ${vuln.description}\n`;
      }
    }

    report += `\n[ STRING ANALYSIS - TOP 15 ]\n`;
    for (let i = 0; i < Math.min(15, info.strings.length); i++) {
      report += `  > ${info.strings[i]}\n`;
    }

    return report;
  }
}

export default ReverseEngineer;
