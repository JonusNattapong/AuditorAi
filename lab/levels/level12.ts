import express from "express";

const app = express();
const PORT = 8112;

app.use(express.json());

// 💥 VULNERABILITY: RACE CONDITION / TIME OF CHECK TIME OF USE
let userBalance = 1000;

app.post("/withdraw", async (req, res) => {
  const { amount } = req.body;

  // ✅ Check balance
  if (userBalance >= amount) {

    // ❌ ARTIFICIAL DELAY THAT CREATES RACE WINDOW
    await new Promise(r => setTimeout(r, 100));

    // ❌ Subtract amount - not atomic
    userBalance = userBalance - amount;

    return res.json({
      success: true,
      withdrawn: amount,
      remaining: userBalance
    });
  }

  res.json({ success: false, message: "Insufficient balance" });
});

app.get("/balance", (req, res) => {
  res.json({ balance: userBalance });
});

app.get("/", (req, res) => {
  res.send(`
  <h1>Level 12: Race Condition</h1>
  <h3>Current balance: <span id="balance">${userBalance}</span></h3>
  <button onclick="attack()">RUN RACE ATTACK</button>

  <script>
  async function attack() {
    // Send 10 parallel withdraw requests at the same time
    const promises = [];
    for(let i=0; i<10; i++) {
      promises.push(fetch("/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100 })
      }));
    }
    await Promise.all(promises);
    location.reload();
  }
  </script>
  `);
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 12: Race Condition Concurrency                       ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: No database transaction atomicity           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 12,
  name: "Race Condition",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
