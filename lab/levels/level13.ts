import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 8113;
const JWT_SECRET = "redlock_lab_2026_jwt_secret_1337";

app.use(express.json());

app.get("/", (req, res) => {
  // Create regular user token
  const token = jwt.sign({ username: "guest", role: "user" }, JWT_SECRET);

  res.send(`
  <h1>Level 13: JWT Signature Forgery</h1>
  <p>Your guest token: <code>${token}</code></p>
  <p>Hint: Use <b>none</b> algorithm attack</p>

  <form action="/admin" method="GET">
    <input name="token" placeholder="Enter admin JWT token" size="80">
    <button type="submit">Access Admin Panel</button>
  </form>
  `);
});

app.get("/admin", (req, res) => {
  const { token } = req.query as { token: string };

  try {
    // 💥 VULNERABILITY: ACCEPTS 'none' SIGNATURE ALGORITHM
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256", "none"], // ❌ ALLOWS NONE ALGORITHM
    }) as any;

    if (decoded.role === "admin") {
      return res.send(`
      <h1>✅ Admin Panel Accessed!</h1>
      <h2>Flag: LAB{jwt_none_algorithm_exploited_successfully}</h2>
      `);
    }

    res.send("<h2>❌ You are not admin</h2><a href='/'>Go back</a>");
  } catch (err: any) {
    res.send(
      `<h2>❌ Invalid token</h2><pre>${err.message}</pre><a href='/'>Go back</a>`,
    );
  }
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 13: JWT Signature Forgery                            ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: Accepts unsigned 'none' algorithm           ║
╚══════════════════════════════════════════════════════════════╝
  `);
  });
}

// Export for lab_server
export const info = {
  level: 13,
  name: "JWT Signature Forgery",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability.",
};

export const router = app;
