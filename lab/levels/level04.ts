import express from 'express';

const app = express();
const PORT = 8104;

// Level 04: Insecure Direct Object Reference (user profile pages)
// Vulnerability: Sequential IDs with no authorization checks

const users = [
  { id: 1, username: 'alice', email: 'alice@example.com', isAdmin: false },
  { id: 2, username: 'bob', email: 'bob@example.com', isAdmin: false },
  { id: 3, username: 'charlie', email: 'charlie@example.com', isAdmin: false },
  { id: 1337, username: 'admin', email: 'admin@secret.local', isAdmin: true, flag: 'LAB{idor_allows_access_by_enumeration}' }
];

app.get('/', (req, res) => {
  res.send(`
    <h1>Level 04: User Profiles</h1>
    <p>Public users:</p>
    <ul>
      <li><a href="/profile?id=1">Alice</a></li>
      <li><a href="/profile?id=2">Bob</a></li>
      <li><a href="/profile?id=3">Charlie</a></li>
    </ul>
  `);
});

app.get('/profile', (req, res) => {
  const userId = parseInt(req.query.id as string);
  
  // VULNERABLE: No authorization check. Just look up directly by ID.
  // Attacker can increment IDs to find hidden admin accounts.
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).send('User not found');
  }

  res.send(`
    <h2>Profile: ${user.username}</h2>
    <p>Email: ${user.email}</p>
    ${user.flag ? `<p style="color:red;"><b>✅ FLAG: ${user.flag}</b></p>` : ''}
    <a href="/">Back</a>
  `);
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 04: Insecure Direct Object Reference                 ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: No access control on object lookups         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 4,
  name: "Insecure Direct Object Reference (user profile pages)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
