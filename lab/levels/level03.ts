import express from 'express';

const app = express();
const PORT = 8103;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Level 03: Reflected + Stored XSS (guestbook)
// Vulnerability: No output encoding, user input rendered directly in HTML

let guestbook: string[] = [];

app.get('/', (req, res) => {
  // VULNERABLE 1: Reflected XSS via name parameter
  const name = req.query.name || 'Guest';
  
  res.send(`
    <h1>Level 03: Guestbook XSS</h1>
    <h3>Hello ${name}!</h3>
    
    <form method="POST" action="/post">
      <textarea name="message" placeholder="Leave a message..." rows="4" cols="50" required></textarea><br>
      <button type="submit">Post Message</button>
    </form>
    
    <hr>
    <h3>Messages:</h3>
    <ul>
      ${guestbook.map(msg => `<li>${msg}</li>`).join('')}
    </ul>
  `);
});

app.post('/post', (req, res) => {
  const message = req.body.message;
  
  // VULNERABLE 2: Stored XSS - no sanitization before storage/output
  guestbook.push(message);
  
  res.redirect('/');
});

app.get('/reset', (req, res) => {
  guestbook = [];
  res.redirect('/');
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 03: Reflected + Stored XSS                           ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: No output encoding, raw user input rendered ║
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('  Flag is: LAB{xss_can_both_reflect_and_persist}');
});
}

// Export for lab_server
export const info = {
  level: 3,
  name: "Reflected + Stored XSS (guestbook)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
