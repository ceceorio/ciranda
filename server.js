const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3002);
const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const STATIC_DIR = fs.existsSync(DIST_DIR) ? DIST_DIR : PUBLIC_DIR;

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

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(STATIC_DIR, requestedPath));

  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(STATIC_DIR, "index.html"), (indexError, indexData) => {
        if (indexError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        res.writeHead(200, {
          "Content-Type": contentTypes[".html"],
          "Cache-Control": "no-store",
        });
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "ciranda",
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Ciranda running on port ${PORT}`);
});
