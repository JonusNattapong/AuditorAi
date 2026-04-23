import express from 'express';

const app = express();
const PORT = 8110;

app.use(express.urlencoded({ extended: true }));

// Level 10: Business Logic Bypass (discount coupon system)
// Vulnerability: Coupon can be applied infinitely without usage limit check

let cartTotal = 1000;
let couponUsed = false;

app.get('/', (req, res) => {
  res.send(`
    <h1>Level 10: Discount Coupon System</h1>
    <p>Cart total: $${cartTotal}</p>
    <p>Coupon code: SAVE20 gives $20 discount (limit one per order)</p>
    
    <form method="POST" action="/apply">
      <input type="text" name="coupon" placeholder="Enter coupon code">
      <button type="submit">Apply Coupon</button>
    </form>
  `);
});

app.post('/apply', (req, res) => {
  const coupon = req.body.coupon;
  
  // VULNERABLE: No check if coupon was already applied!
  if (coupon === 'SAVE20') {
    cartTotal -= 20;
    
    if (cartTotal <= 0) {
      res.send(`<h1>✅ Business logic bypassed!</h1><p>Final total: $${cartTotal}</p><p>Flag: LAB{business_logic_bugs_are_underrated}</p>`);
      return;
    }
  }
  
  res.redirect('/');
});

app.get('/reset', (req, res) => {
  cartTotal = 1000;
  couponUsed = false;
  res.redirect('/');
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 10: Business Logic Bypass                            ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: Missing coupon usage limit check            ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 10,
  name: "Business Logic Bypass (discount coupon system)",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
