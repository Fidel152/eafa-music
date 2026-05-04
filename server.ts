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
      accessName TEXT,
      role TEXT DEFAULT 'member',
      voiceType TEXT,
      instrument TEXT,
      active INTEGER DEFAULT 1,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      avatarUrl TEXT,
      phoneNumber TEXT,
      lastSeen DATETIME
    );
  `);

  // Migrations for existing tables
  try { db.exec("ALTER TABLE members ADD COLUMN avatarUrl TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE members ADD COLUMN phoneNumber TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE members ADD COLUMN lastSeen DATETIME"); } catch(e) {}
  try { db.exec("ALTER TABLE members ADD COLUMN accessName TEXT"); } catch(e) {}

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS rehearsals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date DATETIME NOT NULL,
      location TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      rehearsalId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      status TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      targetId TEXT NOT NULL,
      targetType TEXT NOT NULL,
      memberId TEXT NOT NULL,
      memberName TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      parentId TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      senderId TEXT NOT NULL,
      receiverId TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      fileUrl TEXT,
      read INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted INTEGER DEFAULT 0
    );
  `);

  // Bootstrap Admin "Christian Delfi" if not exists
  const adminName = "Christian Delfi";
  const existingAdmin = db.prepare("SELECT * FROM members WHERE fullName = ?").get(adminName);
  if (!existingAdmin) {
    db.prepare("INSERT INTO members (id, fullName, role) VALUES (?, ?, ?)").run("admin-001", adminName, "admin");
    console.log(`Admin ${adminName} created!`);
  }

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", membersCount: db.prepare("SELECT count(*) as count FROM members").get() });
  });

  // API Routes
  
  // Auth (Restrictive login)
  app.post("/api/auth/login", (req, res) => {
    const { name: rawName } = req.body;
    if (!rawName) return res.status(400).json({ error: "Nom requis" });

    const name = rawName.trim();

    // Try finding by accessName first, then fullName (case-insensitive search)
    let user = db.prepare("SELECT * FROM members WHERE LOWER(accessName) = LOWER(?)").get(name) as any;
    if (!user) {
      user = db.prepare("SELECT * FROM members WHERE LOWER(fullName) = LOWER(?)").get(name) as any;
    }
    
    if (!user) {
      return res.status(401).json({ error: "Accès refusé : vous n'êtes pas membre de la chorale ou votre clé d'accès est incorrecte." });
    }

    res.json({ success: true, user: { id: user.id, displayName: user.fullName, role: user.role } });
  });

  // Members
  app.get("/api/members", (req, res) => {
    const members = db.prepare("SELECT * FROM members ORDER BY fullName ASC").all() as any[];
    res.json(members.map(m => ({ ...m, active: m.active === 1 })));
  });

  app.post("/api/members", (req, res) => {
    console.log("POST /api/members body:", req.body);
    try {
      const { fullName, accessName, role, voiceType, instrument, avatarUrl, phoneNumber } = req.body;
      const id = Date.now().toString();
      db.prepare("INSERT INTO members (id, fullName, accessName, role, voiceType, instrument, avatarUrl, phoneNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, fullName, accessName || null, role || 'member', voiceType || null, instrument || null, avatarUrl || null, phoneNumber || null);
      console.log("Member created successfully:", id);
      res.json({ id, fullName, accessName, role, voiceType, instrument, avatarUrl, phoneNumber, active: true });
    } catch (error: any) {
      console.error("Error creating member:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/members/:id", (req, res) => {
    db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/members/:id", (req, res) => {
    console.log(`PUT /api/members/${req.params.id} body:`, req.body);
    try {
      const existing = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id) as any;
      if (!existing) {
        return res.status(404).json({ error: "Membre non trouvé" });
      }

      const { 
        fullName = existing.fullName, 
        accessName = existing.accessName, 
        role = existing.role, 
        voiceType = existing.voiceType, 
        instrument = existing.instrument, 
        active = existing.active === 1, 
        avatarUrl = existing.avatarUrl, 
        phoneNumber = existing.phoneNumber, 
        lastSeen = existing.lastSeen 
      } = req.body;

      db.prepare("UPDATE members SET fullName = ?, accessName = ?, role = ?, voiceType = ?, instrument = ?, active = ?, avatarUrl = ?, phoneNumber = ?, lastSeen = ? WHERE id = ?")
        .run(fullName, accessName, role, voiceType, instrument, active ? 1 : 0, avatarUrl, phoneNumber, lastSeen, req.params.id);
      
      console.log("Member updated successfully:", req.params.id);
      res.json({ id: req.params.id, fullName, accessName, role, voiceType, instrument, active });
    } catch (error: any) {
      console.error("Error updating member:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Rehearsals
  app.get("/api/rehearsals", (req, res) => {
    const data = db.prepare("SELECT * FROM rehearsals ORDER BY date ASC").all();
    res.json(data);
  });

  app.post("/api/rehearsals", (req, res) => {
    const { title, description, date, location } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO rehearsals (id, title, description, date, location) VALUES (?, ?, ?, ?, ?)")
      .run(id, title, description, date, location);
    res.json({ id, title, date });
  });

  app.delete("/api/rehearsals/:id", (req, res) => {
    db.prepare("DELETE FROM rehearsals WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Attendance
  app.get("/api/attendance/:rehearsalId", (req, res) => {
    const data = db.prepare("SELECT * FROM attendance WHERE rehearsalId = ?").all();
    res.json(data);
  });

  app.post("/api/attendance", (req, res) => {
    const { rehearsalId, memberId, status } = req.body;
    const id = Date.now().toString();
    const existing = db.prepare("SELECT id FROM attendance WHERE rehearsalId = ? AND memberId = ?").get(rehearsalId, memberId) as any;
    
    if (existing) {
      db.prepare("UPDATE attendance SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(status, existing.id);
      res.json({ id: existing.id, status });
    } else {
      db.prepare("INSERT INTO attendance (id, rehearsalId, memberId, status) VALUES (?, ?, ?, ?)")
        .run(id, rehearsalId, memberId, status);
      res.json({ id, status });
    }
  });

  // Comments
  app.get("/api/comments/:targetId", (req, res) => {
    const data = db.prepare("SELECT * FROM comments WHERE targetId = ? ORDER BY createdAt ASC").all();
    res.json(data);
  });

  app.post("/api/comments", (req, res) => {
    const { targetId, targetType, memberId, memberName, content, parentId } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO comments (id, targetId, targetType, memberId, memberName, content, parentId) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, targetId, targetType, memberId, memberName, content, parentId);
    res.json({ id, content });
  });

  app.delete("/api/comments/:id", (req, res) => {
    db.prepare("DELETE FROM comments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Messages
  app.get("/api/messages/:userId", (req, res) => {
    const data = db.prepare("SELECT * FROM messages WHERE senderId = ? OR receiverId = ? ORDER BY createdAt DESC").all(req.params.userId, req.params.userId) as any[];
    res.json(data.map(m => ({ ...m, read: m.read === 1, deleted: m.deleted === 1 })));
  });

  app.get("/api/messages/thread/:userId/:otherId", (req, res) => {
    const data = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) 
      ORDER BY createdAt ASC
    `).all(req.params.userId, req.params.otherId, req.params.otherId, req.params.userId) as any[];
    res.json(data.map(m => ({ ...m, read: m.read === 1, deleted: m.deleted === 1 })));
  });

  app.post("/api/messages", (req, res) => {
    const { senderId, receiverId, content, type, fileUrl } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO messages (id, senderId, receiverId, content, type, fileUrl) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, senderId, receiverId, content, type || 'text', fileUrl);
    res.json({ id, content });
  });

  app.put("/api/messages/:id/read", (req, res) => {
    db.prepare("UPDATE messages SET read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/messages/mark-read", (req, res) => {
    const { userId, senderId } = req.body;
    db.prepare("UPDATE messages SET read = 1 WHERE receiverId = ? AND senderId = ?").run(userId, senderId);
    res.json({ success: true });
  });

  app.delete("/api/messages/:id", (req, res) => {
    db.prepare("UPDATE messages SET deleted = 1, content = 'Message supprimé' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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

  // Delete instrument
  app.delete("/api/instruments/:id", (req, res) => {
    db.prepare("DELETE FROM instruments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Update instrument
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
