import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite
  const db = new Database("platform.db");
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      voiceType TEXT,
      instrument TEXT,
      active INTEGER DEFAULT 1,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      lyrics TEXT,
      chords TEXT,
      key TEXT,
      author TEXT,
      audioUrl TEXT,
      addedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      imageUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS instruments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 1,
      condition TEXT,
      imageUrl TEXT,
      lastMaintenance DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Bootstrap Admin "Christian Delfi" if not exists
  const adminName = "Christian Delfi";
  const existingAdmin = db.prepare("SELECT * FROM members WHERE fullName = ?").get(adminName);
  if (!existingAdmin) {
    db.prepare("INSERT INTO members (id, fullName, role) VALUES (?, ?, ?)").run("admin-001", adminName, "admin");
    console.log(`Admin ${adminName} created!`);
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // API Routes
  
  // Auth (Restrictive login)
  app.post("/api/auth/login", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nom requis" });

    // ONLY allow existing members to login
    const user = db.prepare("SELECT * FROM members WHERE fullName = ?").get(name) as any;
    
    if (!user) {
      return res.status(401).json({ error: "Accès refusé : vous n'êtes pas membre de la chorale ou votre nom est incorrect." });
    }

    res.json({ success: true, user: { id: user.id, displayName: user.fullName, role: user.role } });
  });

  // Members
  app.get("/api/members", (req, res) => {
    const members = db.prepare("SELECT * FROM members ORDER BY fullName ASC").all();
    res.json(members);
  });

  app.post("/api/members", (req, res) => {
    const { fullName, role, voiceType, instrument } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO members (id, fullName, role, voiceType, instrument) VALUES (?, ?, ?, ?, ?)")
      .run(id, fullName, role, voiceType, instrument);
    res.json({ id, fullName, role, voiceType, instrument });
  });

  app.delete("/api/members/:id", (req, res) => {
    db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/members/:id", (req, res) => {
    const { fullName, role, voiceType, instrument, active } = req.body;
    db.prepare("UPDATE members SET fullName = ?, role = ?, voiceType = ?, instrument = ?, active = ? WHERE id = ?")
      .run(fullName, role, voiceType, instrument, active ? 1 : 0, req.params.id);
    res.json({ id: req.params.id, fullName, role, voiceType, instrument, active });
  });

  // Songs
  app.get("/api/songs", (req, res) => {
    const songs = db.prepare("SELECT * FROM songs ORDER BY title ASC").all();
    res.json(songs);
  });

  app.post("/api/songs", (req, res) => {
    const { title, category, lyrics, chords, key, author, audioUrl } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO songs (id, title, category, lyrics, chords, key, author, audioUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, title, category, lyrics, chords, key, author, audioUrl);
    res.json({ id, title, category, author });
  });

  app.delete("/api/songs/:id", (req, res) => {
    db.prepare("DELETE FROM songs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/songs/:id", (req, res) => {
    const { title, category, lyrics, chords, key, author, audioUrl } = req.body;
    db.prepare("UPDATE songs SET title = ?, category = ?, lyrics = ?, chords = ?, key = ?, author = ?, audioUrl = ? WHERE id = ?")
      .run(title, category, lyrics, chords, key, author, audioUrl, req.params.id);
    res.json({ id: req.params.id, title });
  });

  // Announcements
  app.get("/api/announcements", (req, res) => {
    const ann = db.prepare("SELECT * FROM announcements ORDER BY createdAt DESC").all();
    res.json(ann);
  });

  app.post("/api/announcements", (req, res) => {
    const { title, content, type, imageUrl } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO announcements (id, title, content, type, imageUrl) VALUES (?, ?, ?, ?, ?)")
      .run(id, title, content, type, imageUrl);
    res.json({ id, title });
  });

  app.delete("/api/announcements/:id", (req, res) => {
    db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/announcements/:id", (req, res) => {
    const { title, content, type, imageUrl } = req.body;
    db.prepare("UPDATE announcements SET title = ?, content = ?, type = ?, imageUrl = ? WHERE id = ?")
      .run(title, content, type, imageUrl, req.params.id);
    res.json({ id: req.params.id, title });
  });

  // Instruments
  app.get("/api/instruments", (req, res) => {
    const inst = db.prepare("SELECT * FROM instruments ORDER BY name ASC").all();
    res.json(inst);
  });

  app.post("/api/instruments", (req, res) => {
    const { name, category, quantity, condition, imageUrl } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO instruments (id, name, category, quantity, condition, imageUrl) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, name, category, quantity, condition, imageUrl);
    res.json({ id, name });
  });

  app.delete("/api/instruments/:id", (req, res) => {
    db.prepare("DELETE FROM instruments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/instruments/:id", (req, res) => {
    const { name, category, quantity, condition, imageUrl } = req.body;
    db.prepare("UPDATE instruments SET name = ?, category = ?, quantity = ?, condition = ?, imageUrl = ? WHERE id = ?")
      .run(name, category, quantity, condition, imageUrl, req.params.id);
    res.json({ id: req.params.id, name });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
