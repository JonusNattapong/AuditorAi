/**
 * VisionBrowser.ts - Advanced Computer Vision Browser Automation
 * 
 * Orchestrates screenshots, UI analysis, and visual vulnerability detection.
 * Leverages Playwright through HumanBrowser and multi-provider Vision Models.
 */

import humanBrowser from "./humanBrowser";
import fs from "fs";
import path from "path";
import axios from "axios";
import keyPool from "../src/providers/keyPool";
import configManager from "../src/config/configManager";
import { logger } from "../src/runtime/logger";

interface VisionAnalysis {
  screenshotPath: string;
  description: string;
  visibleElements: string[];
  buttons: string[];
  inputs: string[];
  links: string[];
  text: string;
  ocrText: string;
  vulnerabilities: string[];
}

export class VisionBrowser {
  private outputDir: string;

  constructor(outputDir: string = "") {
    // Resolve output directory from config or default
    const defaultDir = path.join(process.cwd(), "screenshots");
    this.outputDir = outputDir || configManager.get("SCREENSHOT_DIR") || defaultDir;
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Captures a high-resolution screenshot of the target URL
   */
  public async takeScreenshot(url: string): Promise<string> {
    const { page } = await humanBrowser.initBrowser();
    if (!page) throw new Error("Browser engine failed to initialize");

    logger.info({ url }, "Capturing tactical screenshot");
    
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Wait for dynamic elements to settle
      await new Promise(r => setTimeout(r, 2000));

      const filename = `screenshot_${Date.now()}.png`;
      const outputPath = path.join(this.outputDir, filename);
      
      await page.screenshot({
        path: outputPath,
        fullPage: true,
        type: "png"
      });

      logger.info({ path: outputPath }, "Screenshot captured successfully");
      return outputPath;
    } catch (e) {
      logger.error(`Screenshot capture failed: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Uses AI Vision models to analyze a captured screenshot
   */
  public async analyzeScreenshot(imagePath: string, prompt?: string): Promise<VisionAnalysis> {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Screenshot not found at path: ${imagePath}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const provider = String(configManager.get("DEFAULT_PROVIDER") || "openai");
    const key = keyPool.getNextKey(provider, null);

    if (!key) {
      throw new Error(`No vision-capable API key available for provider: ${provider}`);
    }

    const analysisPrompt = prompt || `
Analyze this web page screenshot for security research. Return a valid JSON object ONLY:
{
  "description": "Comprehensive summary of the page purpose and state",
  "visibleElements": ["list of significant UI components"],
  "buttons": ["visible button labels"],
  "inputs": ["form field labels and types"],
  "links": ["navigation link texts"],
  "text": "essential visible text content",
  "vulnerabilities": ["potential security risks visible, e.g., debug info, exposed secrets, sensitive data"]
}
`;

    const model = String(keyPool.getDefaultModel(provider));
    logger.info({ provider, model }, "Executing AI Vision analysis");

    const payload = {
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: "json_object" }
    };

    try {
      const response = await axios.post(
        `${keyPool.getBaseUrl(provider)}/chat/completions`,
        payload,
        {
          headers: { Authorization: `Bearer ${key.key}` },
          timeout: 90000 // Vision analysis can be slow
        }
      );

      const content = response.data.choices[0].message.content;
      let analysis: VisionAnalysis;
      
      try {
        // Attempt to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        analysis = JSON.parse(jsonStr);
      } catch (e) {
        logger.warn("AI vision response was not valid JSON, using fallback parsing");
        analysis = {
          screenshotPath: imagePath,
          description: content,
          visibleElements: [],
          buttons: [],
          inputs: [],
          links: [],
          text: "",
          ocrText: "",
          vulnerabilities: []
        };
      }

      analysis.screenshotPath = imagePath;
      return analysis;
    } catch (e) {
      logger.error(`Vision analysis API call failed: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * One-stop shop for scanning a URL and analyzing it visually
   */
  public async scanAndAnalyze(url: string): Promise<VisionAnalysis> {
    const screenshotPath = await this.takeScreenshot(url);
    return this.analyzeScreenshot(screenshotPath);
  }

  /**
   * Placeholder for future AI-assisted interaction
   */
  public async clickElementByDescription(description: string): Promise<boolean> {
    logger.info({ description }, "AI-assisted interaction requested (Capability under development)");
    return false;
  }
}

export default VisionBrowser;
