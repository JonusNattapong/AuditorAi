import express from 'express';

const app = express();
const PORT = 8102;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Level 02: Classic SQL injection (search field)
// Vulnerability: Direct string concatenation of user input into SQL query

// Simulated database
const products = [
  { id: 1, name: 'Laptop', price: 999, secret: null },
  { id: 2, name: 'Phone', price: 699, secret: null },
  { id: 3, name: 'Tablet', price: 299, secret: null },
  { id: 99, name: 'FLAG', price: 0, secret: 'LAB{classic_sql_injection_found}' }
];

app.get('/', (req, res) => {
  res.send(`
    <h1>Level 02: SQL Injection Search</h1>
    <form method="GET" action="/search">
      <input type="text" name="q" placeholder="Search products..." required>
      <button type="submit">Search</button>
    </form>
  `);
});

app.get('/search', (req, res) => {
  const query = req.query.q as string;
  
  // VULNERABLE: Direct user input concatenated into "SQL" query
  // Payload example: ' OR 1=1 --
  const sql = `SELECT * FROM products WHERE name LIKE '%${query}%'`;
  
  // Simulate SQL execution
  let results: any[] = [];
  try {
    // Very naive SQL parser simulation that demonstrates exact vulnerability
    if (query.includes("' OR '1'='1") || query.includes("' OR 1=1")) {
      results = products;
    } else {
      results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) && !p.secret
      );
    }
  } catch (e) {
    results = [];
  }

  res.send(`
    <h2>Search Results for: ${query}</h2>
    <code>Executed query: ${sql}</code>
    <ul>
      ${results.map(p => `<li>${p.name} - $${p.price} ${p.secret ? `<b>FLAG: ${p.secret}</b>` : ''}</li>`).join('')}
    </ul>
    <a href="/">Back</a>
  `);
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 02: Classic SQL Injection                            ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: Unsanitized input in SQL query              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 2,
  name: "Classic SQL injection (search field)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
