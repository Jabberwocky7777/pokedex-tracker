"use strict";

const express = require("express");
const http    = require("http");
const fs      = require("fs");
const path    = require("path");
const { WebSocketServer } = require("ws");

const TOKEN    = process.env.SYNC_TOKEN || "";
const APP_USER = process.env.APP_USER || "";
const APP_PASS = process.env.APP_PASSWORD || "";
const PORT     = parseInt(process.env.PORT || "3001", 10);
const DATA_DIR = process.env.DATA_DIR || "/data";
const DATA_FILE = path.join(DATA_DIR, "sync.json");

if (!TOKEN) {
  console.warn("[sync] WARNING: SYNC_TOKEN is not set — sync is disabled.");
}
if (!APP_USER || !APP_PASS) {
  console.warn("[sync] WARNING: APP_USER / APP_PASSWORD not set — login endpoint is disabled.");
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeData(payload) {
  const tmp = path.join(DATA_DIR, `sync-${Date.now()}.json.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(payload), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "4mb" }));

// CORS for standalone development only (nginx proxies in production)
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});
app.options("*", (_req, res) => res.status(204).end());

// POST /api/login → validate credentials, return SYNC_TOKEN on success
app.post("/api/login", (req, res) => {
  if (!APP_USER || !APP_PASS || !TOKEN) {
    return res.status(503).json({ error: "Login not configured on this server" });
  }
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (username !== APP_USER || password !== APP_PASS) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  res.json({ ok: true, token: TOKEN });
});

// GET /health → no auth, for health checks and login screen state detection
app.get("/health", (_req, res) => res.json({
  ok: true,
  loginEnabled: Boolean(APP_USER && APP_PASS && TOKEN),
  syncEnabled: Boolean(TOKEN),
}));

// ── HTTP server (shared with WebSocket) ──────────────────────────────────────

const httpServer = http.createServer(app);

// ── WebSocket server ──────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer });

function validateToken(req) {
  const auth = (req.headers["authorization"] || "").trim();
  if (auth === `Bearer ${TOKEN}` && TOKEN !== "") return true;
  // Browser WebSocket API can't set headers — accept token via query param fallback
  const urlParams = new URL(req.url || "", `http://localhost`).searchParams;
  const queryToken = urlParams.get("token") || "";
  return queryToken === TOKEN && TOKEN !== "";
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

wss.on("connection", (ws, req) => {
  if (!validateToken(req)) {
    send(ws, { type: "error", message: "Unauthorized" });
    ws.close(4401, "Unauthorized");
    return;
  }

  // Send current snapshot immediately on connect
  const saved = readData();
  if (saved) {
    send(ws, { type: "snapshot", data: saved.data, savedAt: saved.savedAt });
  } else {
    send(ws, { type: "no-data" });
  }

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (msg.type === "pull") {
      const current = readData();
      if (current) {
        send(ws, { type: "snapshot", data: current.data, savedAt: current.savedAt });
      } else {
        send(ws, { type: "no-data" });
      }
    } else if (msg.type === "push") {
      if (!msg.data || typeof msg.data !== "object") {
        send(ws, { type: "error", message: "Missing data payload" });
        return;
      }
      const savedAt = new Date().toISOString();
      try {
        writeData({ data: msg.data, savedAt });
      } catch (err) {
        console.error("[sync] Failed to write data:", err);
        send(ws, { type: "error", message: "Failed to save data" });
        return;
      }
      // Broadcast to all other connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === client.OPEN) {
          send(client, { type: "snapshot", data: msg.data, savedAt });
        }
      });
      send(ws, { type: "snapshot", data: msg.data, savedAt });
    } else {
      send(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
    }
  });

  ws.on("error", (err) => console.error("[sync] WS client error:", err.message));
});

// ── Start ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(DATA_DIR, { recursive: true });

httpServer.listen(PORT, () => {
  console.log(`[sync] listening on :${PORT}`);
  console.log(`[sync] data file: ${DATA_FILE}`);
  console.log(`[sync] auth: ${TOKEN ? "enabled" : "disabled (no token set)"}`);
  console.log(`[sync] login: ${APP_USER && APP_PASS ? `enabled (user: ${APP_USER})` : "disabled"}`);
});
