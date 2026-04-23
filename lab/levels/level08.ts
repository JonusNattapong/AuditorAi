import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 8108;

app.use(cookieParser());

// Level 08: Unsafe Object Deserialization (user session cookie)
// Vulnerability: Deserializing untrusted user input with eval()

app.get('/', (req, res) => {
  if (!req.cookies.user) {
    // Set default serialized user cookie
    const user = { username: 'guest', role: 'user' };
    res.cookie('user', Buffer.from(JSON.stringify(user)).toString('base64'));
  }

  // VULNERABLE: Deserialize user cookie directly
  let userData;
  try {
    const raw = Buffer.from(req.cookies.user, 'base64').toString();
    // UNSAFE: Using eval() for deserialization allows RCE
    userData = eval('(' + raw + ')');
  } catch (e) {
    userData = { username: 'guest', role: 'user' };
  }

  if (userData.role === 'admin') {
    res.send(`<h1>✅ Welcome Admin!</h1><p>Flag: LAB{unsafe_deserialization_is_rce}</p>`);
  } else {
    res.send(`
      <h1>Level 08: User Session</h1>
      <p>Logged in as: ${userData.username}</p>
      <p>Role: ${userData.role}</p>
      <p>Only admins can see the flag.</p>
    `);
  }
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 08: Unsafe Object Deserialization                    ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: eval() based cookie deserialization         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 8,
  name: "Unsafe Object Deserialization (user session cookie)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
