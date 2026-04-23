import express from 'express';

const app = express();
const PORT = 8107;

app.use(express.urlencoded({ extended: true }));

// Level 07: Input Filter Bypass (WAF simulation)
// Vulnerability: Weak blacklist filters that can be bypassed with encoding

app.get('/', (req, res) => {
  res.send(`
    <h1>Level 07: WAF Filter Bypass</h1>
    <form method="POST" action="/check">
      <input type="text" name="input" placeholder="Enter payload" required>
      <button type="submit">Submit</button>
    </form>
  `);
});

app.post('/check', (req, res) => {
  let input = req.body.input;
  
  // VULNERABLE: Naive blacklist filtering. Easily bypassed with obfuscation.
  const blocked = ['script', 'alert', 'javascript', 'onerror', 'onload', '<', '>'];
  
  for (const bad of blocked) {
    if (input.toLowerCase().includes(bad)) {
      return res.send('<h2>❌ Blocked by WAF</h2><a href="/">Try again</a>');
    }
  }
  
  // If WAF bypassed, render input directly
  res.send(`
    <h2>✅ Input allowed!</h2>
    <p>Your input: ${input}</p>
    <p>Flag: LAB{waf_blacklists_are_always_bypassable}</p>
  `);
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 07: Input Filter Bypass                              ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: Weak blacklist WAF simulation               ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 7,
  name: "Input Filter Bypass (WAF simulation)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
