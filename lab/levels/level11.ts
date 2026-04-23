import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 8111;

app.use(express.urlencoded({ extended: true }));

// 💥 VULNERABILITY: UNRESTRICTED FILE UPLOAD
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    // ❌ NO FILE TYPE CHECK. ALLOWS .JS, .PHP, .ASPX
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send(`
  <h1>Level 11: Unrestricted File Upload</h1>
  <h3>Upload your avatar image</h3>
  <form method="POST" action="/upload" enctype="multipart/form-data">
    <input type="file" name="avatar">
    <button type="submit">Upload</button>
  </form>
  `);
});

app.post("/upload", upload.single("avatar"), (req, res) => {
  res.send(`
  <h2>✅ File uploaded successfully!</h2>
  <p>Your avatar: <a href="/uploads/${req.file.originalname}">/uploads/${req.file.originalname}</a></p>
  <br><a href="/">Back</a>
  `);
});

if (typeof require !== "undefined" && require.main === module) {
  app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 11: Unrestricted File Upload                         ║
║  Running on http://localhost:${PORT}                          ║
║  Vulnerability: No file extension validation                ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
}

// Export for lab_server
export const info = {
  level: 11,
  name: "Unrestricted File Upload",
  difficulty: 3,
  vulnerability: "Security vulnerability for education.",
  exploit_hint: "Check the source code for clues.",
  mitigation: "Follow security best practices.",
  solution: "Analyze and exploit the vulnerability."
};

export const router = app;
