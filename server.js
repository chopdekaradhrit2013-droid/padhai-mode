const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { db, publicUser, documentDto, UPLOAD_DIR, DATA_DIR } = require("./lib/db");
const { hashPassword, verifyPassword, signToken, verifyToken } = require("./lib/auth");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const MAX_UPLOAD = 12 * 1024 * 1024;
const ALLOWED_EXT = new Set([".txt", ".md", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"]);
const SUBJECTS = ["English Language","English Literature","Physics","Chemistry","Biology","Mathematics","Hindi","Marathi","History","Geography"];

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const type = typeof body === "string" && !headers["Content-Type"] ? "text/plain; charset=utf-8" : (headers["Content-Type"] || "application/json; charset=utf-8");
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...headers });
  res.end(payload);
}
function json(res, status, data) { send(res, status, data); }

function readBody(req, limit = 2000000) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too_large")); req.destroy(); return; } chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".txt":"text/plain; charset=utf-8",".md":"text/markdown; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".pdf":"application/pdf"}[ext] || "application/octet-stream";
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return json(res, 403, { error: "Forbidden" });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  res.writeHead(200, { "Content-Type": mimeFor(file) });
  fs.createReadStream(file).pipe(res);
  return true;
}

function getToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function requireUser(req, res) {
  const payload = verifyToken(getToken(req));
  if (!payload || !payload.id) { json(res, 401, { error: "Sign in required" }); return null; }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.id);
  if (!user) { json(res, 401, { error: "Account not found" }); return null; }
  return user;
}

function thumbFor(subject) {
  return { Physics:"physics", Chemistry:"chem", Mathematics:"math", Biology:"bio", History:"hist" }[subject] || "lit";
}

function parseMultipart(buffer, contentType) {
  const m = /boundary=([^;]+)/i.exec(contentType || "");
  if (!m) throw new Error("no_boundary");
  const boundary = Buffer.from("--" + m[1].replace(/^"|"$/g, ""));
  const fields = {}; let file = null; let start = 0;
  while (start < buffer.length) {
    const idx = buffer.indexOf(boundary, start);
    if (idx === -1) break;
    const next = buffer.indexOf(boundary, idx + boundary.length);
    if (next === -1) break;
    let part = buffer.subarray(idx + boundary.length, next);
    if (part[0] === 13 && part[1] === 10) part = part.subarray(2);
    if (part.length >= 2 && part[part.length - 2] === 13) part = part.subarray(0, part.length - 2);
    const split = part.indexOf(Buffer.from("\r\n\r\n"));
    if (split === -1) { start = next; continue; }
    const rawHeaders = part.subarray(0, split).toString("utf8");
    const body = part.subarray(split + 4);
    const nameMatch = /name="([^"]+)"/.exec(rawHeaders);
    const fileMatch = /filename="([^"]*)"/.exec(rawHeaders);
    const name = nameMatch ? nameMatch[1] : "";
    if (fileMatch && fileMatch[1]) file = { filename: path.basename(fileMatch[1]), buffer: body };
    else fields[name] = body.toString("utf8");
    start = next;
  }
  return { fields, file };
}

function docJoin() {
  return "SELECT d.*, u.name AS educator_name, u.verified AS educator_verified, u.role AS educator_role FROM documents d JOIN users u ON u.id = d.user_id";
}

async function handleApi(req, res, url) {
  const method = req.method;
  const pathname = url.pathname;
  if (method === "GET" && pathname === "/api/health") return json(res, 200, { ok: true, app: "PadhaiMode" });
  if (method === "GET" && pathname === "/api/meta") return json(res, 200, { subjects: SUBJECTS, grades: [6,7,8,9,10] });

  if (method === "POST" && pathname === "/api/auth/signup") {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const name = String(body.name || "").trim() || String(body.email || "").split("@")[0];
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !email.includes("@")) return json(res, 400, { error: "Valid email required" });
    if (password.length < 6) return json(res, 400, { error: "Password must be at least 6 characters" });
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return json(res, 409, { error: "Email already registered" });
    const info = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')").run(name, email, hashPassword(password));
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(info.lastInsertRowid));
    return json(res, 201, { token: signToken({ id: user.id, email: user.email }), user: publicUser(user) });
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !verifyPassword(password, user.password_hash)) return json(res, 401, { error: "Invalid email or password" });
    return json(res, 200, { token: signToken({ id: user.id, email: user.email }), user: publicUser(user) });
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    const user = requireUser(req, res); if (!user) return;
    return json(res, 200, { user: publicUser(user) });
  }

  if (method === "PATCH" && pathname === "/api/profile") {
    const user = requireUser(req, res); if (!user) return;
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(String(body.name || user.name).trim(), user.id);
    return json(res, 200, { user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
  }

  if (method === "GET" && pathname === "/api/documents") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const grades = (url.searchParams.get("grades") || "").split(",").filter(Boolean).map(Number);
    const subjects = (url.searchParams.get("subjects") || "").split(",").filter(Boolean);
    let rows = db.prepare(docJoin() + " WHERE d.status = 'Public' ORDER BY d.views DESC").all();
    rows = rows.filter((r) => (!grades.length || grades.includes(r.grade)) && (!subjects.length || subjects.includes(r.subject)) && (!q || r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)));
    return json(res, 200, { total: rows.length, page: 1, documents: rows.map(documentDto) });
  }

  if (method === "GET" && pathname === "/api/uploads") {
    const user = requireUser(req, res); if (!user) return;
    const rows = db.prepare(docJoin() + " WHERE d.user_id = ? ORDER BY d.id DESC").all(user.id).map(documentDto);
    return json(res, 200, { documents: rows, stats: { uploads: rows.length, views: rows.reduce((a,b)=>a+b.views,0), downloads: rows.reduce((a,b)=>a+b.downloads,0) } });
  }

  const docMatch = pathname.match(/^\/api\/documents\/(\d+)$/);
  if (docMatch && method === "GET") {
    const row = db.prepare(docJoin() + " WHERE d.id = ?").get(Number(docMatch[1]));
    if (!row) return json(res, 404, { error: "Not found" });
    const userPayload = verifyToken(getToken(req));
    if (row.status !== "Public" && (!userPayload || userPayload.id !== row.user_id)) return json(res, 403, { error: "This note is not public" });
    db.prepare("UPDATE documents SET views = views + 1 WHERE id = ?").run(row.id);
    row.views += 1;
    return json(res, 200, { document: documentDto(row) });
  }
  if (docMatch && method === "PATCH") {
    const user = requireUser(req, res); if (!user) return;
    const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(Number(docMatch[1]));
    if (!row) return json(res, 404, { error: "Not found" });
    if (row.user_id !== user.id && user.role !== "educator") return json(res, 403, { error: "Not allowed" });
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const status = ["Public","Private","Pending"].includes(body.status) ? body.status : row.status;
    const title = body.title ? String(body.title).trim() : row.title;
    db.prepare("UPDATE documents SET status = ?, title = ? WHERE id = ?").run(status, title, row.id);
    return json(res, 200, { document: documentDto(db.prepare(docJoin() + " WHERE d.id = ?").get(row.id)) });
  }
  if (docMatch && method === "DELETE") {
    const user = requireUser(req, res); if (!user) return;
    const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(Number(docMatch[1]));
    if (!row) return json(res, 404, { error: "Not found" });
    if (row.user_id !== user.id) return json(res, 403, { error: "Not allowed" });
    if (row.filename && !String(row.filename).startsWith("seed/")) {
      const full = path.join(UPLOAD_DIR, row.filename);
      if (full.startsWith(UPLOAD_DIR) && fs.existsSync(full)) fs.unlinkSync(full);
    }
    db.prepare("DELETE FROM documents WHERE id = ?").run(row.id);
    return json(res, 200, { ok: true });
  }

  const dlMatch = pathname.match(/^\/api\/documents\/(\d+)\/download$/);
  if (dlMatch && method === "GET") {
    const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(Number(dlMatch[1]));
    if (!row) return json(res, 404, { error: "Not found" });
    const userPayload = verifyToken(getToken(req));
    if (row.status !== "Public" && (!userPayload || userPayload.id !== row.user_id)) return json(res, 403, { error: "This note is not public" });
    const full = path.join(UPLOAD_DIR, row.filename || "");
    if (!row.filename || !full.startsWith(UPLOAD_DIR) || !fs.existsSync(full)) return json(res, 404, { error: "File missing" });
    db.prepare("UPDATE documents SET downloads = downloads + 1 WHERE id = ?").run(row.id);
    res.writeHead(200, { "Content-Type": row.mime || mimeFor(full), "Content-Disposition": "attachment; filename=\"" + String(row.original_name || "notes.txt").replace(/"/g, "") + "\"" });
    fs.createReadStream(full).pipe(res);
    return;
  }

  if (method === "POST" && pathname === "/api/documents") {
    const user = requireUser(req, res); if (!user) return;
    const raw = await readBody(req, MAX_UPLOAD + 1000000);
    const parsed = parseMultipart(raw, req.headers["content-type"]);
    const fields = parsed.fields; const file = parsed.file;
    const title = String(fields.title || "").trim();
    const subject = SUBJECTS.includes(fields.subject) ? fields.subject : "Physics";
    const grade = Number(fields.grade || 10);
    if (!title) return json(res, 400, { error: "Title required" });
    if (![6,7,8,9,10].includes(grade)) return json(res, 400, { error: "Grade must be 6-10" });
    let filename, original = "notes.txt", mime = "text/plain";
    if (file && file.filename) {
      const ext = path.extname(file.filename).toLowerCase() || ".txt";
      if (!ALLOWED_EXT.has(ext)) return json(res, 400, { error: "File type not allowed" });
      if (file.buffer.length > MAX_UPLOAD) return json(res, 400, { error: "File too large (max 12MB)" });
      original = file.filename; filename = user.id + "-" + Date.now() + ext;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
      mime = mimeFor(filename);
    } else {
      filename = user.id + "-" + Date.now() + ".txt";
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), title + "\n\nUploaded by " + user.name + " on PadhaiMode.\n");
    }
    const info = db.prepare("INSERT INTO documents (user_id, title, subject, grade, status, filename, original_name, mime, thumb) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?)").run(user.id, title, subject, grade, filename, original, mime, thumbFor(subject));
    return json(res, 201, { document: documentDto(db.prepare(docJoin() + " WHERE d.id = ?").get(Number(info.lastInsertRowid))) });
  }

  if (method === "GET" && pathname === "/api/quizzes") {
    const rows = db.prepare("SELECT q.*, COUNT(qs.id) AS question_count FROM quizzes q LEFT JOIN questions qs ON qs.quiz_id = q.id GROUP BY q.id ORDER BY q.id").all();
    return json(res, 200, { quizzes: rows.map((q) => ({ id: q.id, title: q.title, subject: q.subject, grade: q.grade, difficulty: q.difficulty, minutes: q.minutes, questions: q.question_count })) });
  }
  const quizMatch = pathname.match(/^\/api\/quizzes\/(\d+)$/);
  if (quizMatch && method === "GET") {
    const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(Number(quizMatch[1]));
    if (!quiz) return json(res, 404, { error: "Quiz not found" });
    const questions = db.prepare("SELECT id, prompt, options_json FROM questions WHERE quiz_id = ?").all(quiz.id).map((q) => ({ id: q.id, prompt: q.prompt, options: JSON.parse(q.options_json) }));
    return json(res, 200, { quiz: { id: quiz.id, title: quiz.title, subject: quiz.subject, grade: quiz.grade, difficulty: quiz.difficulty, minutes: quiz.minutes, questions } });
  }
  const submitMatch = pathname.match(/^\/api\/quizzes\/(\d+)\/submit$/);
  if (submitMatch && method === "POST") {
    const user = requireUser(req, res); if (!user) return;
    const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(Number(submitMatch[1]));
    if (!quiz) return json(res, 404, { error: "Quiz not found" });
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const answers = body.answers || {};
    const questions = db.prepare("SELECT id, answer_index FROM questions WHERE quiz_id = ?").all(quiz.id);
    let correct = 0;
    const review = questions.map((q) => { const chosen = Number(answers[q.id]); const ok = chosen === q.answer_index; if (ok) correct += 1; return { id: q.id, correct: ok, answer: q.answer_index, chosen }; });
    db.prepare("INSERT INTO attempts (user_id, quiz_id, score, total) VALUES (?, ?, ?, ?)").run(user.id, quiz.id, correct, questions.length);
    return json(res, 200, { score: correct, total: questions.length, percent: Math.round((correct / questions.length) * 100), review });
  }
  if (method === "GET" && pathname === "/api/attempts") {
    const user = requireUser(req, res); if (!user) return;
    return json(res, 200, { attempts: db.prepare("SELECT a.*, q.title FROM attempts a JOIN quizzes q ON q.id = a.quiz_id WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 20").all(user.id) });
  }
  return json(res, 404, { error: "Unknown API route" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    if (url.pathname.startsWith("/api/")) { await handleApi(req, res, url); return; }
    if (!serveStatic(req, res, url.pathname)) json(res, 404, { error: "Not found" });
  } catch (err) {
    if (err.message === "too_large") return json(res, 413, { error: "Request too large" });
    console.error(err);
    if (!res.headersSent) json(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log("PadhaiMode running on http://localhost:" + PORT);
  console.log("Database: " + DATA_DIR);
  console.log("Demo student  adhrit@padhaimode.app / student123");
  console.log("Demo educator priya@padhaimode.app / teacher123");
});
