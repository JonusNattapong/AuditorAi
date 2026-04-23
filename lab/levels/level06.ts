import express from 'express';

const app = express();
const PORT = 8106;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Level 06: Time-based blind SQL injection (order system)
// Vulnerability: ORDER BY clause injection with conditional delay

const orders = [
  { id: 1, item: 'Keyboard', status: 'shipped' },
  { id: 2, item: 'Mouse', status: 'pending' },
  { id: 3, item: 'Monitor', status: 'delivered' }
];

app.get('/', (req, res) => {
  res.send(`
    <h1>Level 06: Order System</h1>
    <p>Sort orders by: 
      <a href="/orders?sort=id">ID</a> | 
      <a href="/orders?sort=item">Name</a> | 
      <a href="/orders?sort=status">Status</a>
    </p>
  `);
});

app.get('/orders', async (req, res) => {
  const sort = req.query.sort as string || 'id';
  
  // VULNERABLE: ORDER BY parameter is not sanitized. Blind time-based injection possible.
  // Payload example: sort=id AND SLEEP(5)
  if (sort.toLowerCase().includes('sleep') || sort.includes('AND')) {
    // Simulate SQL delay
    await new Promise(r => setTimeout(r, 5000));
    res.send('✅ Flag: LAB{time_blind_injection_does_not_need_output}');
    return;
  }

  const sorted = [...orders].sort((a, b) => {
    // @ts-ignore
    return a[sort] > b[sort] ? 1 : -1;
  });

  res.send(`
    <h2>Orders</h2>
    <table border="1">
      <tr><th>ID</th><th>Item</th><th>Status</th></tr>
      ${sorted.map(o => `<tr><td>${o.id}</td><td>${o.item}</td><td>${o.status}</td></tr>`).join('')}
    </table>
  `);
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 06: Time-based Blind SQL Injection                   ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: Unsanitized ORDER BY with timing attacks    ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 6,
  name: "Time-based blind SQL injection (order system)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
