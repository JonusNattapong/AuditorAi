import express from 'express';
import http from 'http';

const app = express();
const PORT = 8109;

app.use(express.urlencoded({ extended: true }));

// Level 09: SSRF Server Side Request Forgery (proxy endpoint)
// Vulnerability: No restrictions on URLs the server will fetch

app.get('/', (req, res) => {
  res.send(`
    <h1>Level 09: URL Preview Proxy</h1>
    <form method="GET" action="/fetch">
      <input type="url" name="url" placeholder="https://example.com" required>
      <button type="submit">Fetch Preview</button>
    </form>
  `);
});

app.get('/fetch', (req, res) => {
  const url = req.query.url as string;
  
  // VULNERABLE: No SSRF protection. Server will fetch ANY url including localhost/internal.
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('169.254')) {
    return res.send(`
      <h2>✅ SSRF detected! You found internal metadata.</h2>
      <p>Flag: LAB{ssrf_can_access_internal_networks}</p>
    `);
  }

  res.send(`<h2>Fetched: ${url}</h2><p>Only local IPs get the flag.</p>`);
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 09: Server Side Request Forgery                      ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: Unrestricted outbound HTTP requests         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 9,
  name: "SSRF Server Side Request Forgery (proxy endpoint)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
