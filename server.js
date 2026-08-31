const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { handleApi, readNodeBody } = require("./lib/handler");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, "public");

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".txt": "text/plain; charset=utf-8",
  }[ext] || "application/octet-stream";
}

function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  res.writeHead(200, { "Content-Type": mimeFor(file) });
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    if (url.pathname.startsWith("/api/")) {
      const rawBody = req.method === "GET" || req.method === "HEAD" ? Buffer.alloc(0) : await readNodeBody(req);
      const result = await handleApi({
        method: req.method,
        pathname: url.pathname,
        searchParams: url.searchParams,
        headers: req.headers,
        rawBody,
      });
      res.writeHead(result.status, result.headers || {});
      res.end(result.body);
      return;
    }
    if (!serveStatic(res, url.pathname)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  } catch (err) {
    if (err.message === "too_large") {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request too large" }));
      return;
    }
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Server error" }));
    }
  }
});

server.listen(PORT, () => {
  console.log("PadhaiMode running on http://localhost:" + PORT);
  console.log("Demo student  adhrit@padhaimode.app / student123");
  console.log("Demo educator priya@padhaimode.app / teacher123");
});
