const { hashPassword, verifyPassword, signToken, verifyToken } = require("./auth");
const { SUBJECTS, load, save, publicUser, documentDto } = require("./store");

const MAX_UPLOAD = 4 * 1024 * 1024;

function json(status, data) {
  return { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(data) };
}

function getToken(headers) {
  const header = headers.authorization || headers.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function requireUser(headers) {
  const payload = verifyToken(getToken(headers));
  if (!payload || !payload.id) return { error: json(401, { error: "Sign in required" }) };
  const user = load().users.find((u) => u.id === payload.id);
  if (!user) return { error: json(401, { error: "Account not found" }) };
  return { user };
}

function parseJson(raw) {
  if (raw == null) return {};
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) return raw;
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function parseMultipart(buffer, contentType) {
  const m = /boundary=([^;]+)/i.exec(contentType || "");
  if (!m) return { fields: {}, file: null };
  const boundary = Buffer.from("--" + m[1].replace(/^"|"$/g, ""));
  const fields = {};
  let file = null;
  let start = 0;
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  while (start < buf.length) {
    const idx = buf.indexOf(boundary, start);
    if (idx === -1) break;
    const next = buf.indexOf(boundary, idx + boundary.length);
    if (next === -1) break;
    let part = buf.subarray(idx + boundary.length, next);
    if (part[0] === 13 && part[1] === 10) part = part.subarray(2);
    if (part.length >= 2 && part[part.length - 2] === 13) part = part.subarray(0, part.length - 2);
    const split = part.indexOf(Buffer.from("\r\n\r\n"));
    if (split === -1) { start = next; continue; }
    const rawHeaders = part.subarray(0, split).toString("utf8");
    const body = part.subarray(split + 4);
    const nameMatch = /name="([^"]+)"/.exec(rawHeaders);
    const fileMatch = /filename="([^"]*)"/.exec(rawHeaders);
    if (fileMatch && fileMatch[1]) file = { filename: fileMatch[1], buffer: body };
    else if (nameMatch) fields[nameMatch[1]] = body.toString("utf8");
    start = next;
  }
  return { fields, file };
}

function thumbFor(subject) {
  return { Physics: "physics", Chemistry: "chem", Mathematics: "math", Biology: "bio", History: "hist" }[subject] || "lit";
}

async function handleApi({ method, pathname, searchParams, headers, rawBody }) {
  if (method === "OPTIONS") return { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS" }, body: "" };
  if (method === "GET" && pathname === "/api/health") return json(200, { ok: true, app: "PadhaiMode", vercel: !!process.env.VERCEL });
  if (method === "GET" && pathname === "/api/meta") return json(200, { subjects: SUBJECTS, grades: [6, 7, 8, 9, 10] });

  if (method === "POST" && pathname === "/api/auth/signup") {
    const body = parseJson(rawBody);
    const name = String(body.name || "").trim() || String(body.email || "").split("@")[0];
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !email.includes("@")) return json(400, { error: "Valid email required" });
    if (password.length < 6) return json(400, { error: "Password must be at least 6 characters" });
    const store = load();
    if (store.users.some((u) => u.email === email)) return json(409, { error: "Email already registered" });
    const user = { id: store.nextUser++, name, email, password_hash: hashPassword(password), role: "student", verified: false };
    store.users.push(user); save();
    return json(201, { token: signToken({ id: user.id, email: user.email }), user: publicUser(user) });
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = parseJson(rawBody);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = load().users.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.password_hash)) return json(401, { error: "Invalid email or password" });
    return json(200, { token: signToken({ id: user.id, email: user.email }), user: publicUser(user) });
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    const auth = requireUser(headers); if (auth.error) return auth.error;
    return json(200, { user: publicUser(auth.user) });
  }

  if (method === "GET" && pathname === "/api/documents") {
    const q = (searchParams.get("q") || "").toLowerCase();
    const grades = (searchParams.get("grades") || "").split(",").filter(Boolean).map(Number);
    const subjects = (searchParams.get("subjects") || "").split(",").filter(Boolean);
    let rows = load().documents.filter((d) => d.status === "Public");
    rows = rows.filter((r) => (!grades.length || grades.includes(r.grade)) && (!subjects.length || subjects.includes(r.subject)) && (!q || r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)));
    rows.sort((a, b) => b.views - a.views);
    return json(200, { total: rows.length, documents: rows.map(documentDto) });
  }

  if (method === "GET" && pathname === "/api/uploads") {
    const auth = requireUser(headers); if (auth.error) return auth.error;
    const rows = load().documents.filter((d) => d.user_id === auth.user.id).sort((a, b) => b.id - a.id).map(documentDto);
    return json(200, { documents: rows, stats: { uploads: rows.length, views: rows.reduce((a, b) => a + b.views, 0), downloads: rows.reduce((a, b) => a + b.downloads, 0) } });
  }

  const docMatch = pathname.match(/^\/api\/documents\/(\d+)$/);
  if (docMatch && method === "GET") {
    const store = load();
    const row = store.documents.find((d) => d.id === Number(docMatch[1]));
    if (!row) return json(404, { error: "Not found" });
    const payload = verifyToken(getToken(headers));
    if (row.status !== "Public" && (!payload || payload.id !== row.user_id)) return json(403, { error: "This note is not public" });
    row.views += 1; save();
    return json(200, { document: documentDto(row) });
  }
  if (docMatch && method === "PATCH") {
    const auth = requireUser(headers); if (auth.error) return auth.error;
    const store = load();
    const row = store.documents.find((d) => d.id === Number(docMatch[1]));
    if (!row) return json(404, { error: "Not found" });
    if (row.user_id !== auth.user.id && auth.user.role !== "educator") return json(403, { error: "Not allowed" });
    const body = parseJson(rawBody);
    if (["Public", "Private", "Pending"].includes(body.status)) row.status = body.status;
    if (body.title) row.title = String(body.title).trim();
    save();
    return json(200, { document: documentDto(row) });
  }
  if (docMatch && method === "DELETE") {
    const auth = requireUser(headers); if (auth.error) return auth.error;
    const store = load();
    const idx = store.documents.findIndex((d) => d.id === Number(docMatch[1]));
    if (idx === -1) return json(404, { error: "Not found" });
    if (store.documents[idx].user_id !== auth.user.id) return json(403, { error: "Not allowed" });
    store.documents.splice(idx, 1); save();
    return json(200, { ok: true });
  }

  const dlMatch = pathname.match(/^\/api\/documents\/(\d+)\/download$/);
  if (dlMatch && method === "GET") {
    const store = load();
    const row = store.documents.find((d) => d.id === Number(dlMatch[1]));
    if (!row) return json(404, { error: "Not found" });
    const payload = verifyToken(getToken(headers));
    if (row.status !== "Public" && (!payload || payload.id !== row.user_id)) return json(403, { error: "This note is not public" });
    row.downloads += 1; save();
    const name = String(row.original_name || "notes.txt").replace(/"/g, "");
    return { status: 200, headers: { "Content-Type": row.mime || "text/plain; charset=utf-8", "Content-Disposition": "attachment; filename=\"" + name + "\"" }, body: row.content || (row.title + "\n\nUploaded on PadhaiMode.\n") };
  }

  if (method === "POST" && pathname === "/api/documents") {
    const auth = requireUser(headers); if (auth.error) return auth.error;
    const contentType = headers["content-type"] || headers["Content-Type"] || "";
    let title, subject, grade, content, original_name, mime;
    if (contentType.includes("multipart/form-data")) {
      const parsed = parseMultipart(rawBody, contentType);
      title = String(parsed.fields.title || "").trim();
      subject = SUBJECTS.includes(parsed.fields.subject) ? parsed.fields.subject : "Physics";
      grade = Number(parsed.fields.grade || 10);
      if (parsed.file && parsed.file.filename) {
        if (parsed.file.buffer.length > MAX_UPLOAD) return json(400, { error: "File too large (max 4MB on Vercel)" });
        original_name = parsed.file.filename; mime = "application/octet-stream"; content = parsed.file.buffer.toString("utf8");
      }
    } else {
      const body = parseJson(rawBody);
      title = String(body.title || "").trim();
      subject = SUBJECTS.includes(body.subject) ? body.subject : "Physics";
      grade = Number(body.grade || 10);
      content = String(body.content || ""); original_name = "notes.txt"; mime = "text/plain";
    }
    if (!title) return json(400, { error: "Title required" });
    if (![6, 7, 8, 9, 10].includes(grade)) return json(400, { error: "Grade must be 6-10" });
    const store = load();
    const doc = { id: store.nextDoc++, user_id: auth.user.id, title, subject, grade, status: "Pending", views: 0, downloads: 0, rating: 4.5, thumb: thumbFor(subject), content: content || (title + "\n\nUploaded by " + auth.user.name + " on PadhaiMode.\n"), original_name: original_name || "notes.txt", mime: mime || "text/plain" };
    store.documents.push(doc); save();
    return json(201, { document: documentDto(doc) });
  }

  if (method === "GET" && pathname === "/api/quizzes") {
    const quizzes = load().quizzes.map((q) => ({ id: q.id, title: q.title, subject: q.subject, grade: q.grade, difficulty: q.difficulty, minutes: q.minutes, questions: q.questions.length }));
    return json(200, { quizzes });
  }

  const quizMatch = pathname.match(/^\/api\/quizzes\/(\d+)$/);
  if (quizMatch && method === "GET") {
    const quiz = load().quizzes.find((q) => q.id === Number(quizMatch[1]));
    if (!quiz) return json(404, { error: "Quiz not found" });
    return json(200, { quiz: { id: quiz.id, title: quiz.title, subject: quiz.subject, grade: quiz.grade, difficulty: quiz.difficulty, minutes: quiz.minutes, questions: quiz.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })) } });
  }

  const submitMatch = pathname.match(/^\/api\/quizzes\/(\d+)\/submit$/);
  if (submitMatch && method === "POST") {
    const auth = requireUser(headers); if (auth.error) return auth.error;
    const store = load();
    const quiz = store.quizzes.find((q) => q.id === Number(submitMatch[1]));
    if (!quiz) return json(404, { error: "Quiz not found" });
    const body = parseJson(rawBody);
    const answers = body.answers || {};
    let correct = 0;
    const review = quiz.questions.map((q) => { const chosen = Number(answers[q.id]); const ok = chosen === q.answer; if (ok) correct += 1; return { id: q.id, correct: ok, answer: q.answer, chosen }; });
    store.attempts.push({ id: store.nextAttempt++, user_id: auth.user.id, quiz_id: quiz.id, score: correct, total: quiz.questions.length }); save();
    return json(200, { score: correct, total: quiz.questions.length, percent: Math.round((correct / quiz.questions.length) * 100), review });
  }

  return json(404, { error: "Unknown API route" });
}

async function readNodeBody(req, limit = MAX_UPLOAD + 200000) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too_large")); req.destroy(); return; } chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = { handleApi, readNodeBody, json };
