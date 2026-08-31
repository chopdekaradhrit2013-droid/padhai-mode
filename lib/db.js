const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { hashPassword } = require("./auth");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
const SEED_DIR = path.join(UPLOAD_DIR, "seed");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(SEED_DIR, { recursive: true });

function openDatabase() {
  const dirs = [
    process.env.DATA_DIR,
    path.join(__dirname, "..", "data"),
    path.join(os.tmpdir(), "padhai-mode-data"),
  ].filter(Boolean);
  let lastErr;
  for (const dir of dirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, "padhai.db");
      const database = new DatabaseSync(file);
      database.exec("PRAGMA journal_mode = DELETE;");
      database.exec("PRAGMA foreign_keys = ON;");
      database.exec("CREATE TABLE IF NOT EXISTS _boot (id INTEGER PRIMARY KEY, v TEXT);");
      const ins = database.prepare("INSERT INTO _boot (v) VALUES (?)");
      for (let i = 0; i < 50; i++) ins.run("probe-" + i);
      database.exec("DROP TABLE IF EXISTS _boot;");
      return { database, dir };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Unable to open SQLite database");
}

const opened = openDatabase();
const db = opened.database;
const DATA_DIR = opened.dir;

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  views INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 4.6,
  filename TEXT,
  original_name TEXT,
  mime TEXT,
  thumb TEXT NOT NULL DEFAULT 'lit',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL,
  answer_index INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function seedNote(filename, body) {
  const full = path.join(SEED_DIR, filename);
  if (!fs.existsSync(full)) fs.writeFileSync(full, body, "utf8");
}

function seed() {
  if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n === 0) {
    const insertUser = db.prepare("INSERT INTO users (name, email, password_hash, role, verified) VALUES (?, ?, ?, ?, ?)");
    const educators = [
      ["Priya S.", "priya@padhaimode.app", "teacher123", "educator"],
      ["Rahul K.", "rahul@padhaimode.app", "teacher123", "educator"],
      ["Ananya M.", "ananya@padhaimode.app", "teacher123", "educator"],
      ["Adhrit", "adhrit@padhaimode.app", "student123", "student"],
    ];
    for (const [name, email, pass, role] of educators) {
      insertUser.run(name, email, hashPassword(pass), role, role === "educator" ? 1 : 0);
    }
  }

  seedNote("motion-force.txt", "Class 10 Physics — Motion & Force\n\nNewton's laws, F = ma.\n");
  seedNote("poem-analysis.txt", "Grade 9 English Literature — Poem Analysis\n");
  seedNote("cell-structure.txt", "Class 8 Biology — Cell Structure\n");
  seedNote("trigonometry.txt", "Class 10 Mathematics — Trigonometry\n");
  seedNote("chemical-reactions.txt", "Class 9 Chemistry — Chemical Reactions\n");
  seedNote("medieval-india.txt", "Class 7 History — Medieval India\n");

  const priya = db.prepare("SELECT id FROM users WHERE email = ?").get("priya@padhaimode.app").id;
  const rahul = db.prepare("SELECT id FROM users WHERE email = ?").get("rahul@padhaimode.app").id;
  const ananya = db.prepare("SELECT id FROM users WHERE email = ?").get("ananya@padhaimode.app").id;
  const adhrit = db.prepare("SELECT id FROM users WHERE email = ?").get("adhrit@padhaimode.app").id;

  if (db.prepare("SELECT COUNT(*) AS n FROM documents").get().n === 0) {
    const insertDoc = db.prepare(`INSERT INTO documents (user_id, title, subject, grade, status, views, downloads, rating, filename, original_name, mime, thumb) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const docs = [
      [priya, "Class 10 Physics – Motion & Force Notes", "Physics", 10, "Public", 1240, 402, 4.8, "seed/motion-force.txt", "motion-force.txt", "text/plain", "physics"],
      [rahul, "Grade 9 English Literature – Poem Analysis Guide", "English Literature", 9, "Public", 980, 311, 4.9, "seed/poem-analysis.txt", "poem-analysis.txt", "text/plain", "lit"],
      [ananya, "Class 8 Biology – Cell Structure Notes", "Biology", 8, "Public", 760, 210, 4.7, "seed/cell-structure.txt", "cell-structure.txt", "text/plain", "bio"],
      [priya, "Class 10 Mathematics – Trigonometry Workbook", "Mathematics", 10, "Public", 1510, 540, 4.6, "seed/trigonometry.txt", "trigonometry.txt", "text/plain", "math"],
      [rahul, "Class 9 Chemistry – Chemical Reactions", "Chemistry", 9, "Public", 688, 188, 4.5, "seed/chemical-reactions.txt", "chemical-reactions.txt", "text/plain", "chem"],
      [ananya, "Class 7 History – Medieval India", "History", 7, "Public", 420, 95, 4.4, "seed/medieval-india.txt", "medieval-india.txt", "text/plain", "hist"],
      [adhrit, "Class 10 Physics – Motion & Force", "Physics", 10, "Public", 320, 124, 4.5, "seed/motion-force.txt", "motion-force.txt", "text/plain", "physics"],
      [adhrit, "Class 9 Chemistry – Chemical Reactions", "Chemistry", 9, "Pending", 188, 92, 4.2, "seed/chemical-reactions.txt", "chemical-reactions.txt", "text/plain", "chem"],
      [adhrit, "Class 10 Mathematics – Trigonometry", "Mathematics", 10, "Private", 450, 201, 4.6, "seed/trigonometry.txt", "trigonometry.txt", "text/plain", "math"],
      [adhrit, "Class 8 Biology – Cell Structure", "Biology", 8, "Public", 210, 78, 4.4, "seed/cell-structure.txt", "cell-structure.txt", "text/plain", "bio"],
      [adhrit, "Class 7 History – Medieval India", "History", 7, "Pending", 95, 41, 4.1, "seed/medieval-india.txt", "medieval-india.txt", "text/plain", "hist"],
      [adhrit, "Class 10 English Literature – Poetry Analysis", "English Literature", 10, "Public", 278, 153, 4.7, "seed/poem-analysis.txt", "poem-analysis.txt", "text/plain", "lit"],
    ];
    for (const row of docs) insertDoc.run(...row);
  }

  if (db.prepare("SELECT COUNT(*) AS n FROM quizzes").get().n > 0) return;
  const insertQuiz = db.prepare("INSERT INTO quizzes (title, subject, grade, difficulty, minutes) VALUES (?, ?, ?, ?, ?)");
  const insertQ = db.prepare("INSERT INTO questions (quiz_id, prompt, options_json, answer_index) VALUES (?, ?, ?, ?)");
  function addQuiz(meta, questions) {
    const info = insertQuiz.run(meta.title, meta.subject, meta.grade, meta.difficulty, meta.minutes);
    for (const q of questions) insertQ.run(Number(info.lastInsertRowid), q.prompt, JSON.stringify(q.options), q.answer);
  }
  addQuiz({ title: "Motion & Force Sprint", subject: "Physics", grade: 10, difficulty: "Medium", minutes: 25 }, [
    { prompt: "What is the SI unit of force?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: 1 },
    { prompt: "Newton's second law is best written as:", options: ["F = mv", "F = ma", "F = m/a", "F = a/m"], answer: 1 },
    { prompt: "An object in uniform motion has:", options: ["Zero velocity", "Changing speed", "Zero net force", "Increasing mass"], answer: 2 },
    { prompt: "Momentum of a body is:", options: ["m + v", "m / v", "m × v", "v / m"], answer: 2 },
  ]);
  addQuiz({ title: "Cell Structure Check", subject: "Biology", grade: 8, difficulty: "Easy", minutes: 18 }, [
    { prompt: "The control centre of the cell is the:", options: ["Ribosome", "Nucleus", "Vacuole", "Cell wall"], answer: 1 },
    { prompt: "Which organelle is called the powerhouse of the cell?", options: ["Mitochondria", "Golgi body", "Lysosome", "Chloroplast"], answer: 0 },
    { prompt: "Plant cells have a cell wall made of:", options: ["Chitin", "Peptidoglycan", "Cellulose", "Keratin"], answer: 2 },
  ]);
  addQuiz({ title: "Trigonometry Board Pattern", subject: "Mathematics", grade: 10, difficulty: "Hard", minutes: 45 }, [
    { prompt: "sin²θ + cos²θ equals:", options: ["0", "1", "tanθ", "2"], answer: 1 },
    { prompt: "tanθ is equal to:", options: ["cosθ / sinθ", "sinθ / cosθ", "1 / sinθ", "1 / cosθ"], answer: 1 },
    { prompt: "If sinθ = 3/5, then cosθ (acute) is:", options: ["4/5", "3/4", "5/3", "5/4"], answer: 0 },
  ]);
  addQuiz({ title: "Chemical Reactions Rapid", subject: "Chemistry", grade: 9, difficulty: "Medium", minutes: 22 }, [
    { prompt: "2Mg + O2 → 2MgO is a:", options: ["Decomposition", "Combination", "Displacement", "Neutralisation"], answer: 1 },
    { prompt: "A redox reaction involves:", options: ["Only melting", "Oxidation and reduction", "Only filtering", "Only dilution"], answer: 1 },
    { prompt: "Rusting of iron is:", options: ["Physical change only", "Oxidation", "Sublimation", "Neutralisation"], answer: 1 },
  ]);
  addQuiz({ title: "Medieval India Recap", subject: "History", grade: 7, difficulty: "Easy", minutes: 20 }, [
    { prompt: "The first ruler of the Delhi Sultanate was:", options: ["Akbar", "Qutb-ud-din Aibak", "Shivaji", "Ashoka"], answer: 1 },
    { prompt: "Taj Mahal was built by:", options: ["Babur", "Akbar", "Shah Jahan", "Aurangzeb"], answer: 2 },
  ]);
  addQuiz({ title: "Poetry Devices Quiz", subject: "English Literature", grade: 10, difficulty: "Medium", minutes: 15 }, [
    { prompt: "A comparison using 'like' or 'as' is a:", options: ["Metaphor", "Simile", "Alliteration", "Irony"], answer: 1 },
    { prompt: "Repeating starting consonant sounds is:", options: ["Assonance", "Hyperbole", "Alliteration", "Onomatopoeia"], answer: 2 },
  ]);
}

seed();

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role, verified: !!row.verified, createdAt: row.created_at };
}

function documentDto(row) {
  return {
    id: row.id, title: row.title, subject: row.subject, grade: row.grade, status: row.status,
    views: row.views, downloads: row.downloads, rating: row.rating, thumb: row.thumb,
    filename: row.filename, originalName: row.original_name, mime: row.mime, createdAt: row.created_at,
    educator: row.educator_name, educatorId: row.user_id, verified: !!row.educator_verified,
    role: row.educator_role === "educator" ? "Verified Educator" : "Student",
  };
}

module.exports = { db, publicUser, documentDto, UPLOAD_DIR, DATA_DIR };
