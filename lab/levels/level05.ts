import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 8105;

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Level 05: CSRF Cross Site Request Forgery (password change)
// Vulnerability: No CSRF token validation, no Origin/Referer checks

app.get('/', (req, res) => {
  // Logged in as admin by default for demo
  res.cookie('session', 'admin_logged_in');
  
  res.send(`
    <h1>Level 05: Password Change</h1>
    <p>You are logged in as admin. Change your password:</p>
    
    <form method="POST" action="/changepw">
      <input type="password" name="newpassword" placeholder="New password" required><br>
      <button type="submit">Change Password</button>
    </form>
  `);
});

app.post('/changepw', (req, res) => {
  const session = req.cookies.session;
  const newPassword = req.body.newpassword;
  
  // VULNERABLE: NO CSRF PROTECTION
  // No CSRF token, no SameSite cookie attribute, no origin checks
  if (session === 'admin_logged_in') {
    res.send(`
      <h2>✅ Password changed successfully!</h2>
      <p>New password set to: <code>${newPassword}</code></p>
      <p>Flag: LAB{csrf_does_not_require_user_interaction}</p>
    `);
  } else {
    res.send('Not logged in');
  }
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 05: Cross Site Request Forgery                       ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: No CSRF tokens or origin validation         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 5,
  name: "CSRF Cross Site Request Forgery (password change)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
