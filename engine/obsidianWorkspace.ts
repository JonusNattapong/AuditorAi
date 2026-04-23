/**
 * ObsidianWorkspace.ts - 100% Local Obsidian Compatible Workspace Engine
 * 
 * All data stays on your device. No cloud. No tracking. No telemetry.
 * Generates standard Markdown files that work directly with the real Obsidian app.
 * Supports wiki links, canvas boards, graph view, properties, tags.
 */

import fs from "fs";
import path from "path";

interface ObsidianNote {
  title: string;
  content: string;
  tags: string[];
  aliases: string[];
  links: string[];
  properties: Record<string, any>;
}

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "text" | "file" | "link";
  text?: string;
  file?: string;
}

interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  color: string;
  label?: string;
}

interface Canvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export class ObsidianWorkspace {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    
    // Create standard Obsidian directory structure
    this.ensureDir("");
    this.ensureDir(".obsidian");
    this.ensureDir("Assets");
    this.ensureDir("Findings");
    this.ensureDir("Evidence");
    this.ensureDir("Targets");
    this.ensureDir("Reports");
    
    this.generateObsidianConfig();
  }

  private ensureDir(dir: string) {
    const fullPath = path.join(this.rootPath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  private generateObsidianConfig() {
    // Generate minimal .obsidian config for full compatibility
    const config = {
      "useMarkdownLinks": false,
      "newLinkFormat": "shortest",
      "defaultViewMode": "source",
      "showFrontmatter": true,
      "propertiesInDocument": "source",
      "attachmentFolderPath": "./Assets"
    };

    fs.writeFileSync(
      path.join(this.rootPath, ".obsidian", "app.json"),
      JSON.stringify(config, null, 2)
    );
  }

  public createNote(note: ObsidianNote): string {
    const frontmatter = [
      "---",
      `aliases: [${note.aliases?.map(a => `"${a}"`).join(", ") || ""}]`,
      `tags: [${note.tags?.map(t => `"${t}"`).join(", ") || ""}]`,
      ...Object.entries(note.properties || {}).map(([k, v]) => `${k}: ${v}`),
      "---",
      "",
      note.content
    ].join("\n");

    const filename = this.sanitizeFilename(note.title) + ".md";
    const filePath = path.join(this.rootPath, filename);
    
    fs.writeFileSync(filePath, frontmatter, "utf8");
    return filePath;
  }

  public createFinding(title: string, severity: string, evidence: string, references: string[] = []): string {
    const content = `
## Severity: ${severity}

${evidence}

## References
${references.map(r => `- [[${r}]]`).join("\n")}
`;

    return this.createNote({
      title,
      content,
      tags: ["finding", severity.toLowerCase()],
      aliases: [],
      links: references,
      properties: {
        severity,
        created: new Date().toISOString()
      }
    });
  }

  public createTarget(targetUrl: string, findings: string[] = []): string {
    const content = `
# Target Analysis

${targetUrl}

## Findings
${findings.map(f => `- [[${f}]]`).join("\n")}
`;

    return this.createNote({
      title: targetUrl.replace(/https?:\/\//, "").replace(/\//g, "_"),
      content,
      tags: ["target"],
      aliases: [targetUrl],
      links: findings,
      properties: {
        url: targetUrl,
        scanned: new Date().toISOString()
      }
    });
  }

  public createCanvas(canvas: Canvas): string {
    const canvasData = {
      nodes: canvas.nodes,
      edges: canvas.edges
    };

    const filename = `Attack_Canvas_${Date.now()}.canvas`;
    const filePath = path.join(this.rootPath, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(canvasData, null, 2), "utf8");
    return filePath;
  }

  public generateAttackCanvas(target: string, findings: string[]): string {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    // Center target node
    nodes.push({
      id: "target",
      x: 800,
      y: 400,
      width: 300,
      height: 120,
      type: "text",
      text: `# TARGET\n\n${target}`
    });

    // Place findings in circle around target
    findings.forEach((finding, i) => {
      const angle = (i / findings.length) * Math.PI * 2;
      const x = 800 + Math.cos(angle) * 450;
      const y = 400 + Math.sin(angle) * 300;

      nodes.push({
        id: `finding_${i}`,
        x,
        y,
        width: 350,
        height: 200,
        type: "file",
        file: finding
      });

      edges.push({
        id: `edge_${i}`,
        fromNode: "target",
        toNode: `finding_${i}`,
        color: "#ef4444",
        label: "VULNERABLE"
      });
    });

    return this.createCanvas({ nodes, edges });
  }

  public addWikiLink(content: string, linkTarget: string): string {
    return content.replace(
      new RegExp(`(${linkTarget})`, "gi"),
      `[[$1]]`
    );
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, "_").substring(0, 200);
  }

  public getPath(): string {
    return this.rootPath;
  }

  /**
   * Read the contents of a specific note
   */
  public readNote(title: string): string {
    const filename = this.sanitizeFilename(title) + ".md";
    const filePath = path.join(this.rootPath, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Note not found: ${title}`);
    }
    return fs.readFileSync(filePath, "utf8");
  }

  /**
   * List all notes in the vault or a specific subfolder
   */
  public listNotes(subfolder: string = ""): string[] {
    const dirPath = path.join(this.rootPath, subfolder);
    if (!fs.existsSync(dirPath)) return [];
    
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith(".md"))
      .map(f => f.replace(".md", ""));
  }

  /**
   * Search for keywords within all notes
   */
  public searchNotes(query: string): Array<{ title: string; preview: string }> {
    const results: Array<{ title: string; preview: string }> = [];
    const notes = this.listNotes();
    const lowerQuery = query.toLowerCase();

    for (const title of notes) {
      const content = this.readNote(title);
      if (title.toLowerCase().includes(lowerQuery) || content.toLowerCase().includes(lowerQuery)) {
        const index = content.toLowerCase().indexOf(lowerQuery);
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 150);
        results.push({
          title,
          preview: content.substring(start, end).replace(/\n/g, " ") + "..."
        });
      }
    }

    return results.slice(0, 20); // Limit to top 20 results
  }
}

export default ObsidianWorkspace;
