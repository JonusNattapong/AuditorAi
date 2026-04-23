import express from 'express';

const app = express();
const PORT = 8101;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Level 01: Loose comparison bypass (auth login form)
// Vulnerability: Using == loose comparison allows type coercion bypass

const validUser = {
  username: 'admin',
  password: 'super_secret_1234'
};

app.get('/', (req, res) => {
  res.send(`
    <h1>Level 01: Loose Comparison Login</h1>
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required><br>
      <input type="password" name="password" placeholder="Password" required><br>
      <button type="submit">Login</button>
    </form>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // VULNERABLE: Loose comparison == allows type coercion attacks
  // For example: password=[] will coerce to empty string, password=[0] == 0, etc.
  if (username == validUser.username && password == validUser.password) {
    res.send('<h2>✅ Login successful! Flag: LAB{loose_comparison_bypassed}</h2>');
  } else {
    res.send('<h2>❌ Invalid credentials</h2><a href="/">Try again</a>');
  }
});

// Export for lab_server
export const info = {
  level: 1,
  name: "Loose Comparison Login",
  difficulty: 2,
  vulnerability: "Loose comparison (==) allows type coercion bypass in authentication.",
  exploit_hint: "Try sending a payload where the password is an empty array or a boolean true.",
  mitigation: "Always use strict comparison (===) and validate input types.",
  solution: "Send a JSON body with { \"username\": \"admin\", \"password\": true } or similar type coercion tricks."
};

export const router = app;

if (typeof require !== 'undefined' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 01: Loose Comparison Bypass                          ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: == loose type coercion in authentication    ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}
