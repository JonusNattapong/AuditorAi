/**
 * geminiAuth.ts — Google OAuth 2.0 Login Helper for AuditorAi
 *
 * Handles OAuth2 authorization code flow for Gemini / Google Generative AI.
 */

import http from "http";
import { exec } from "child_process";
import { URL } from "url";
import fs from "fs";
import path from "path";

// Load Auth Config from JSON
const AUTH_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf8"),
);
const GOOGLE = AUTH_CONFIG.google;


/**
 * Starts a temporary local HTTP server to capture the OAuth2 callback.
 */
function startCallbackServer(port: number = GOOGLE.callbackPort): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:${port}`);
        const code = url.searchParams.get("code");

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <h1>✅ Login Successful!</h1>
            <p>You can now close this window and return to the application.</p>
          `);

          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>❌ Login Failed</h1><p>No authorization code received.</p>");
          server.close();
          reject(new Error("No auth code received from Google"));
        }
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`[Auth] Callback server listening on http://localhost:${port}`);
    });

    // Safety timeout
    setTimeout(() => {
      if (server.listening) {
        server.close();
        reject(new Error("OAuth callback timeout"));
      }
    }, 120_000); // 2 minutes
  });
}

/**
 * Opens the user's default browser with the Google OAuth consent screen.
 */
function openBrowser(url: string): void {
  let command: string;

  switch (process.platform) {
    case "win32":
      command = `start "" "${url}"`;
      break;
    case "darwin":
      command = `open "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.error("[Auth] Failed to open browser:", error.message);
      console.log("[Auth] Please manually open this URL:");
      console.log(url);
    }
  });
}

/**
 * Perform the full Google OAuth2 login flow for Gemini.
 */
export async function login(): Promise<{
  status: "success" | "requires_secret";
  code: string;
  manual_instruction?: string;
}> {
  const port = GOOGLE.callbackPort;
  const redirectUri = `http://localhost:${port}`;

  const scope = encodeURIComponent(GOOGLE.scopes.join(" "));

  const authUrl = `${GOOGLE.authUrl}?` +
    `client_id=${GOOGLE.clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent`;

  console.log("\n[Auth] Opening browser for Google Login...");

  openBrowser(authUrl);

  try {
    const code = await startCallbackServer(port);

    return {
      status: "requires_secret",
      code,
      manual_instruction:
        "Authorization code received!\n\n" +
        "You can now exchange this code for an access token.\n" +
        "Recommended: Use `gcloud auth application-default login` for the easiest experience.",
    };
  } catch (err: any) {
    console.error("[Auth] OAuth flow failed:", err.message);
    throw err;
  }
}

// Optional: Export a helper to get a fresh token (if you later add client_secret support)
export async function exchangeCodeForToken(
  code: string,
  clientSecret?: string
): Promise<any> {
  // This can be implemented later when you want full token exchange
  throw new Error("Token exchange not implemented yet. Use gcloud auth instead.");
}

export default {
  login,
};