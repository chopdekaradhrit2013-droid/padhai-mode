const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { hashPassword } = require("./auth");

const SUBJECTS = [
  "English Language",
  "English Literature",
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Hindi",
  "Marathi",
  "History",
  "Geography",
];

function storePath() {
  if (process.env.STORE_PATH) return process.env.STORE_PATH;
  if (process.env.VERCEL) return path.join(os.tmpdir(), "padhai-store.json");
  const dir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "padhai-store.json");
}

function seedData() {
  const users = [
    { id: 1, name: "Priya S.", email: "priya@padhaimode.app", password_hash: hashPassword("teacher123"), role: "educator", verified: true },
    { id: 2, name: "Rahul K.", email: "rahul@padhaimode.app", password_hash: hashPassword("teacher123"), role: "educator", verified: true },
    { id: 3, name: "Ananya M.", email: "ananya@padhaimode.app", password_hash: hashPassword("teacher123"), role: "educator", verified: true },
    { id: 4, name: "Adhrit", email: "adhrit@padhaimode.app", password_hash: hashPassword("student123"), role: "student", verified: false },
  ];

  const notes = {
    physics: "Class 10 Physics \u2014 Motion & Force\n\nNewton's first law: an object stays at rest or in uniform motion unless a net force acts on it.\nSecond law: F = ma.\nThird law: every action has an equal and opposite reaction.\n",
    lit: "Grade 9 English Literature \u2014 Poem Analysis\n\nLook for imagery, simile, metaphor, alliteration and the poet's tone.\nWrite how each device supports the theme.\n",
    bio: "Class 8 Biology \u2014 Cell Structure\n\nNucleus controls the cell. Mitochondria release energy. Plant cells have a cellulose wall and chloroplasts.\n",
    math: "Class 10 Mathematics \u2014 Trigonometry\n\nsin^2 theta + cos^2 theta = 1\ntan theta = sin theta / cos theta\nFor a right triangle, sin theta = opposite / hypotenuse.\n",
    chem: "Class 9 Chemistry \u2014 Chemical Reactions\n\nCombination: 2Mg + O2 -> 2MgO\nRedox: oxidation and reduction together.\nRusting of iron is oxidation.\n",
    hist: "Class 7 History \u2014 Medieval India\n\nQutb-ud-din Aibak founded the Delhi Sultanate.\nShah Jahan commissioned the Taj Mahal.\n",
  };

  const documents = [
    { id: 1, user_id: 1, title: "Class 10 Physics - Motion & Force Notes", subject: "Physics", grade: 10, status: "Public", views: 1240, downloads: 402, rating: 4.8, thumb: "physics", content: notes.physics, original_name: "motion-force.txt", mime: "text/plain" },
    { id: 2, user_id: 2, title: "Grade 9 English Literature - Poem Analysis Guide", subject: "English Literature", grade: 9, status: "Public", views: 980, downloads: 311, rating: 4.9, thumb: "lit", content: notes.lit, original_name: "poem-analysis.txt", mime: "text/plain" },
    { id: 3, user_id: 3, title: "Class 8 Biology - Cell Structure Notes", subject: "Biology", grade: 8, status: "Public", views: 760, downloads: 210, rating: 4.7, thumb: "bio", content: notes.bio, original_name: "cell-structure.txt", mime: "text/plain" },
    { id: 4, user_id: 1, title: "Class 10 Mathematics - Trigonometry Workbook", subject: "Mathematics", grade: 10, status: "Public", views: 1510, downloads: 540, rating: 4.6, thumb: "math", content: notes.math, original_name: "trigonometry.txt", mime: "text/plain" },
    { id: 5, user_id: 2, title: "Class 9 Chemistry - Chemical Reactions", subject: "Chemistry", grade: 9, status: "Public", views: 688, downloads: 188, rating: 4.5, thumb: "chem", content: notes.chem, original_name: "chemical-reactions.txt", mime: "text/plain" },
    { id: 6, user_id: 3, title: "Class 7 History - Medieval India", subject: "History", grade: 7, status: "Public", views: 420, downloads: 95, rating: 4.4, thumb: "hist", content: notes.hist, original_name: "medieval-india.txt", mime: "text/plain" },
    { id: 7, user_id: 4, title: "Class 10 Physics - Motion & Force", subject: "Physics", grade: 10, status: "Public", views: 320, downloads: 124, rating: 4.5, thumb: "physics", content: notes.physics, original_name: "motion-force.txt", mime: "text/plain" },
    { id: 8, user_id: 4, title: "Class 9 Chemistry - Chemical Reactions", subject: "Chemistry", grade: 9, status: "Pending", views: 188, downloads: 92, rating: 4.2, thumb: "chem", content: notes.chem, original_name: "chemical-reactions.txt", mime: "text/plain" },
    { id: 9, user_id: 4, title: "Class 10 Mathematics - Trigonometry", subject: "Mathematics", grade: 10, status: "Private", views: 450, downloads: 201, rating: 4.6, thumb: "math", content: notes.math, original_name: "trigonometry.txt", mime: "text/plain" },
    { id: 10, user_id: 4, title: "Class 8 Biology - Cell Structure", subject: "Biology", grade: 8, status: "Public", views: 210, downloads: 78, rating: 4.4, thumb: "bio", content: notes.bio, original_name: "cell-structure.txt", mime: "text/plain" },
    { id: 11, user_id: 4, title: "Class 7 History - Medieval India", subject: "History", grade: 7, status: "Pending", views: 95, downloads: 41, rating: 4.1, thumb: "hist", content: notes.hist, original_name: "medieval-india.txt", mime: "text/plain" },
    { id: 12, user_id: 4, title: "Class 10 English Literature - Poetry Analysis", subject: "English Literature", grade: 10, status: "Public", views: 278, downloads: 153, rating: 4.7, thumb: "lit", content: notes.lit, original_name: "poem-analysis.txt", mime: "text/plain" },
  ];

  const quizzes = [
    { id: 1, title: "Motion & Force Sprint", subject: "Physics", grade: 10, difficulty: "Medium", minutes: 25, questions: [
      { id: 1, prompt: "What is the SI unit of force?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: 1 },
      { id: 2, prompt: "Newton's second law is best written as:", options: ["F = mv", "F = ma", "F = m/a", "F = a/m"], answer: 1 },
      { id: 3, prompt: "An object in uniform motion has:", options: ["Zero velocity", "Changing speed", "Zero net force", "Increasing mass"], answer: 2 },
      { id: 4, prompt: "Momentum of a body is:", options: ["m + v", "m / v", "m x v", "v / m"], answer: 2 },
    ]},
    { id: 2, title: "Cell Structure Check", subject: "Biology", grade: 8, difficulty: "Easy", minutes: 18, questions: [
      { id: 5, prompt: "The control centre of the cell is the:", options: ["Ribosome", "Nucleus", "Vacuole", "Cell wall"], answer: 1 },
      { id: 6, prompt: "Which organelle is called the powerhouse of the cell?", options: ["Mitochondria", "Golgi body", "Lysosome", "Chloroplast"], answer: 0 },
      { id: 7, prompt: "Plant cells have a cell wall made of:", options: ["Chitin", "Peptidoglycan", "Cellulose", "Keratin"], answer: 2 },
    ]},
    { id: 3, title: "Trigonometry Board Pattern", subject: "Mathematics", grade: 10, difficulty: "Hard", minutes: 45, questions: [
      { id: 8, prompt: "sin^2 theta + cos^2 theta equals:", options: ["0", "1", "tan theta", "2"], answer: 1 },
      { id: 9, prompt: "tan theta is equal to:", options: ["cos/sin", "sin/cos", "1/sin", "1/cos"], answer: 1 },
      { id: 10, prompt: "If sin theta = 3/5, then cos theta (acute) is:", options: ["4/5", "3/4", "5/3", "5/4"], answer: 0 },
    ]},
    { id: 4, title: "Chemical Reactions Rapid", subject: "Chemistry", grade: 9, difficulty: "Medium", minutes: 22, questions: [
      { id: 11, prompt: "2Mg + O2 -> 2MgO is a:", options: ["Decomposition", "Combination", "Displacement", "Neutralisation"], answer: 1 },
      { id: 12, prompt: "A redox reaction involves:", options: ["Only melting", "Oxidation and reduction", "Only filtering", "Only dilution"], answer: 1 },
      { id: 13, prompt: "Rusting of iron is:", options: ["Physical change only", "Oxidation", "Sublimation", "Neutralisation"], answer: 1 },
    ]},
    { id: 5, title: "Medieval India Recap", subject: "History", grade: 7, difficulty: "Easy", minutes: 20, questions: [
      { id: 14, prompt: "The first ruler of the Delhi Sultanate was:", options: ["Akbar", "Qutb-ud-din Aibak", "Shivaji", "Ashoka"], answer: 1 },
      { id: 15, prompt: "Taj Mahal was built by:", options: ["Babur", "Akbar", "Shah Jahan", "Aurangzeb"], answer: 2 },
    ]},
    { id: 6, title: "Poetry Devices Quiz", subject: "English Literature", grade: 10, difficulty: "Medium", minutes: 15, questions: [
      { id: 16, prompt: "A comparison using like or as is a:", options: ["Metaphor", "Simile", "Alliteration", "Irony"], answer: 1 },
      { id: 17, prompt: "Repeating starting consonant sounds is:", options: ["Assonance", "Hyperbole", "Alliteration", "Onomatopoeia"], answer: 2 },
    ]},
  ];

  return { nextUser: 5, nextDoc: 13, nextAttempt: 1, users, documents, quizzes, attempts: [] };
}

let cache = null;

function load() {
  if (cache) return cache;
  const file = storePath();
  try {
    if (fs.existsSync(file)) {
      cache = JSON.parse(fs.readFileSync(file, "utf8"));
      if (cache && Array.isArray(cache.users) && cache.users.length) return cache;
    }
  } catch {}
  cache = seedData();
  save();
  return cache;
}

function save() {
  try { fs.writeFileSync(storePath(), JSON.stringify(cache)); } catch {}
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, verified: !!user.verified };
}

function documentDto(doc) {
  const store = load();
  const owner = store.users.find((u) => u.id === doc.user_id) || { name: "Educator", role: "educator", verified: true };
  return {
    id: doc.id, title: doc.title, subject: doc.subject, grade: doc.grade, status: doc.status,
    views: doc.views, downloads: doc.downloads, rating: doc.rating, thumb: doc.thumb,
    originalName: doc.original_name, mime: doc.mime, educator: owner.name, educatorId: doc.user_id,
    verified: !!owner.verified, role: owner.role === "educator" ? "Verified Educator" : "Student",
  };
}

module.exports = { SUBJECTS, load, save, publicUser, documentDto, storePath };
