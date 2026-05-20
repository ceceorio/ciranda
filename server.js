const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3002);
const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const rooms = new Map();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      peers: new Map(),
      messages: [],
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId);
}

function roomParticipants(room) {
  return [...room.peers.entries()].map(([id, name]) => ({ id, name }));
}

function cleanOldRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    room.messages = room.messages.filter((message) => now - message.createdAt < 10 * 60_000);
    if (room.peers.size === 0 && now - room.createdAt > 30 * 60_000) {
      rooms.delete(roomId);
    }
  }
}

setInterval(cleanOldRooms, 60_000).unref();

function getStaticDir() {
  const distIndex = path.join(DIST_DIR, "index.html");
  const publicIndex = path.join(PUBLIC_DIR, "index.html");

  if (!fs.existsSync(distIndex)) {
    return PUBLIC_DIR;
  }

  const distTime = fs.statSync(distIndex).mtimeMs;
  const publicTime = fs.statSync(publicIndex).mtimeMs;
  return distTime >= publicTime ? DIST_DIR : PUBLIC_DIR;
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/join") {
    const body = await readBody(req);
    const roomId = String(body.roomId || "").trim().slice(0, 80);
    const peerName = String(body.name || "Pessoa").trim().slice(0, 60);

    if (!roomId) {
      sendJson(res, 400, { error: "Ciranda invalida." });
      return;
    }

    const room = getRoom(roomId);
    const peerId = crypto.randomUUID();
    room.peers.set(peerId, peerName);
    room.messages.push({
      id: crypto.randomUUID(),
      type: "peer-joined",
      from: peerId,
      name: peerName,
      createdAt: Date.now(),
    });

    sendJson(res, 200, {
      peerId,
      peers: room.peers.size,
      participants: roomParticipants(room),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/signal") {
    const body = await readBody(req);
    const roomId = String(body.roomId || "").trim().slice(0, 80);
    const from = String(body.from || "");
    const payload = body.payload;

    if (!roomId || !from || !payload) {
      sendJson(res, 400, { error: "Mensagem invalida." });
      return;
    }

    const room = getRoom(roomId);
    if (!room.peers.has(from)) {
      room.peers.set(from, "Pessoa");
    }

    room.messages.push({
      id: crypto.randomUUID(),
      from,
      payload,
      createdAt: Date.now(),
    });

    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/messages") {
    const roomId = String(url.searchParams.get("roomId") || "").trim().slice(0, 80);
    const peerId = String(url.searchParams.get("peerId") || "");
    const after = String(url.searchParams.get("after") || "");

    if (!roomId || !peerId) {
      sendJson(res, 400, { error: "Consulta invalida." });
      return;
    }

    const room = getRoom(roomId);
    const afterIndex = after ? room.messages.findIndex((message) => message.id === after) : -1;
    const messages = room.messages
      .slice(afterIndex + 1)
      .filter((message) => message.from !== peerId);

    sendJson(res, 200, {
      peers: room.peers.size,
      participants: roomParticipants(room),
      messages,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/leave") {
    const body = await readBody(req);
    const roomId = String(body.roomId || "").trim().slice(0, 80);
    const peerId = String(body.peerId || "");
    const room = rooms.get(roomId);

    if (room && peerId) {
      room.peers.delete(peerId);
      room.messages.push({
        id: crypto.randomUUID(),
        type: "peer-left",
        from: peerId,
        createdAt: Date.now(),
      });
    }

    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Rota nao encontrada." });
}

function serveStatic(req, res, url) {
  const staticDir = getStaticDir();
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(staticDir, requestedPath));

  if (!filePath.startsWith(staticDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(staticDir, "index.html"), (indexError, indexData) => {
        if (indexError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": contentTypes[".html"], "Cache-Control": "no-store" });
        res.end(indexData);
      });
      return;
    }

    const extension = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=3600",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "ciranda",
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Erro interno." });
  }
});

server.listen(PORT, () => {
  console.log(`Ciranda running on port ${PORT}`);
});
