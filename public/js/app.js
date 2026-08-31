const API = "";
const SUBJECTS = ["English Language","English Literature","Physics","Chemistry","Biology","Mathematics","Hindi","Marathi","History","Geography"];
const GRADES = [6,7,8,9,10];
const state = {
  token: localStorage.getItem("pm-token"),
  user: JSON.parse(localStorage.getItem("pm-user") || "null"),
  marketGrades: [10], marketSubjects: ["English Language","English Literature","Biology"], marketQuery: "",
  uploadGrades: [10], uploadSubjects: ["Physics","Mathematics","History"], uploadQuery: "",
  quiz: null, answers: {}
};

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(window._t); window._t = setTimeout(() => el.classList.remove("show"), 2400);
}
async function api(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (state.token) headers.Authorization = "Bearer " + state.token;
  if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(API + path, Object.assign({}, opts, { headers }));
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data;
}
function setSession(token, user) {
  state.token = token; state.user = user;
  if (token) localStorage.setItem("pm-token", token); else localStorage.removeItem("pm-token");
  if (user) localStorage.setItem("pm-user", JSON.stringify(user)); else localStorage.removeItem("pm-user");
}
function initials(name) { return String(name || "P").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c])); }
function statusTag(status) {
  const cls = status === "Public" ? "tag-public" : status === "Pending" ? "tag-pending" : "tag-private";
  return '<span class="tag ' + cls + '">' + status + "</span>";
}
function thumbSVG(kind) {
  const map = {
    physics: '<rect width="320" height="160" fill="#f3efe4"/><text x="18" y="40" fill="#5b4a2a" font-size="12" font-family="Georgia">Motion & Force</text><text x="18" y="78" fill="#1d4ed8" font-size="22" font-family="Georgia">F = ma</text><text x="18" y="110" fill="#334155" font-size="14">v² = u² + 2as</text>',
    lit: '<rect width="320" height="160" fill="#f6f1e4"/><text x="22" y="48" fill="#44403c" font-size="13" font-family="Georgia">Shall I compare thee</text><text x="22" y="70" fill="#44403c" font-size="13" font-family="Georgia">to a summer\'s day?</text><text x="22" y="110" fill="#7c3aed" font-size="12">metaphor · iambic</text>',
    bio: '<rect width="320" height="160" fill="#f4f0e6"/><ellipse cx="210" cy="82" rx="58" ry="46" fill="#fef9c3" stroke="#57534e"/><ellipse cx="210" cy="82" rx="16" ry="12" fill="#86efac"/><text x="18" y="48" fill="#365314" font-size="14" font-family="Georgia">Animal cell</text><text x="18" y="74" fill="#3f3f46" font-size="12">nucleus</text>',
    math: '<rect width="320" height="160" fill="#f3efe6"/><path d="M40 120 L120 40 L200 120 Z" fill="none" stroke="#0f172a" stroke-width="1.6"/><text x="210" y="60" fill="#1d4ed8" font-size="14">sin²θ+cos²θ=1</text><text x="210" y="88" fill="#1d4ed8" font-size="14">tanθ=sinθ/cosθ</text>',
    chem: '<rect width="320" height="160" fill="#f4f0e6"/><text x="18" y="44" fill="#164e63" font-size="14" font-family="Georgia">2Mg + O₂ → 2MgO</text><path d="M210 38 h28 v18 l22 62 h-72 l22-62 z" fill="#e0f2fe" stroke="#0f172a"/>',
    hist: '<rect width="320" height="160" fill="#f1e6d0"/><rect x="70" y="28" width="180" height="110" rx="4" fill="#c4a574"/><rect x="86" y="40" width="148" height="86" fill="#f8efd8"/><text x="98" y="70" fill="#5b3a1a" font-size="13" font-family="Georgia">Medieval India</text><text x="98" y="94" fill="#7c5a32" font-size="12">Delhi Sultanate</text>'
  };
  return '<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">' + (map[kind] || map.lit) + "</svg>";
}

function setAuthTab(tab) {
  document.getElementById("tab-signin").classList.toggle("active", tab === "signin");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  document.getElementById("form-signin").style.display = tab === "signin" ? "block" : "none";
  document.getElementById("form-signup").style.display = tab === "signup" ? "block" : "none";
}
function togglePass(id, btn) {
  const el = document.getElementById(id);
  el.type = el.type === "password" ? "text" : "password";
  btn.textContent = el.type === "password" ? "👁" : "🙈";
}
function showLanding() {
  document.getElementById("page-landing").classList.add("active");
  document.getElementById("page-app").classList.remove("active");
}
function showApp() {
  document.getElementById("page-landing").classList.remove("active");
  document.getElementById("page-app").classList.add("active");
  const av = document.getElementById("top-avatar");
  if (av) av.textContent = initials(state.user && state.user.name);
}
function go(tab) {
  showApp();
  ["documents","uploads","quizzes","profile","take"].forEach((name) => {
    const el = document.getElementById("view-" + name);
    if (el) el.hidden = name !== tab;
  });
  document.querySelectorAll(".nav-pill[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (tab === "documents") renderMarketplace();
  if (tab === "uploads") renderUploads();
  if (tab === "quizzes") renderQuizzes();
  if (tab === "profile") renderProfile();
}
function renderFilters(containerId, selectedGrades, selectedSubjects, onGrade, onSubject, subjectSearchId) {
  const el = document.getElementById(containerId);
  const existing = document.getElementById(subjectSearchId);
  const q = (existing && existing.value || "").toLowerCase();
  const subjects = SUBJECTS.filter((s) => s.toLowerCase().includes(q));
  el.innerHTML = "<h3>Filters</h3><div class=\"side-label\">Grade</div><div class=\"grade-row\">" +
    GRADES.map((g) => '<button class="grade-chip ' + (selectedGrades.includes(g) ? "active" : "") + '" data-g="' + g + '">Grade ' + g + "</button>").join("") +
    '</div><div class="side-label">Subject</div><div class="search-bar" style="margin-bottom:10px"><span class="sico">⌕</span><input id="' + subjectSearchId + '" placeholder="Search subjects..." value="' + (existing && existing.value || "") + '"></div>' +
    subjects.map((s) => '<label class="subject-row"><input type="checkbox" data-s="' + s + '" ' + (selectedSubjects.includes(s) ? "checked" : "") + "><span>" + s + "</span></label>").join("");
  el.querySelectorAll("[data-g]").forEach((b) => { b.onclick = () => onGrade(+b.dataset.g); });
  el.querySelectorAll("[data-s]").forEach((c) => { c.onchange = () => onSubject(c.dataset.s, c.checked); });
  document.getElementById(subjectSearchId).oninput = () => renderFilters(containerId, selectedGrades, selectedSubjects, onGrade, onSubject, subjectSearchId);
}
async function renderMarketplace() {
  renderFilters("market-filters", state.marketGrades, state.marketSubjects,
    (g) => { state.marketGrades = state.marketGrades.includes(g) ? state.marketGrades.filter((x) => x !== g) : state.marketGrades.concat([g]); renderMarketplace(); },
    (s, on) => { state.marketSubjects = on ? state.marketSubjects.concat([s]) : state.marketSubjects.filter((x) => x !== s); renderMarketplace(); },
    "market-subject-search");
  const params = new URLSearchParams();
  if (state.marketQuery) params.set("q", state.marketQuery);
  if (state.marketGrades.length) params.set("grades", state.marketGrades.join(","));
  if (state.marketSubjects.length) params.set("subjects", state.marketSubjects.join(","));
  try {
    const data = await api("/api/documents?" + params.toString());
    document.getElementById("market-meta").textContent = data.total + " resources · Verified notes for Grades 6–10";
    document.getElementById("market-grid").innerHTML = data.documents.map((d) =>
      '<article class="doc-card"><div class="thumb">' + thumbSVG(d.thumb) + '</div><div class="doc-body"><h3>' + escapeHtml(d.title) + '</h3><div class="tags"><span class="tag tag-sub">' + escapeHtml(d.subject) + '</span><span class="tag tag-grade">Grade ' + d.grade + '</span><span class="rating">' + d.rating + ' ★</span><span class="tag tag-dl">↓ Free Download</span></div><div class="educator"><div class="mini-ava">' + initials(d.educator) + '</div><div><div class="who">' + escapeHtml(d.educator) + (d.verified ? " ✓" : "") + '</div><div class="role">' + d.role + '</div></div><button class="btn-primary inline" style="margin-left:auto;padding:7px 10px;font-size:12px" onclick="downloadDoc(' + d.id + ')">Download</button></div></div></article>'
    ).join("") || '<p class="muted">No notes match those filters.</p>';
  } catch (err) {
    document.getElementById("market-grid").innerHTML = '<p style="color:#f87171">' + escapeHtml(err.message) + "</p>";
  }
}
async function renderUploads() {
  if (!state.user) return showLanding();
  renderFilters("upload-filters", state.uploadGrades, state.uploadSubjects,
    (g) => { state.uploadGrades = state.uploadGrades.includes(g) ? state.uploadGrades.filter((x) => x !== g) : state.uploadGrades.concat([g]); renderUploads(); },
    (s, on) => { state.uploadSubjects = on ? state.uploadSubjects.concat([s]) : state.uploadSubjects.filter((x) => x !== s); renderUploads(); },
    "upload-subject-search");
  try {
    const data = await api("/api/uploads");
    document.getElementById("stat-uploads").textContent = data.stats.uploads;
    document.getElementById("stat-views").textContent = data.stats.views >= 1000 ? (data.stats.views / 1000).toFixed(1) + "k" : data.stats.views;
    document.getElementById("stat-downloads").textContent = data.stats.downloads;
    const q = state.uploadQuery.toLowerCase();
    const list = data.documents.filter((d) => (!state.uploadGrades.length || state.uploadGrades.includes(d.grade)) && (!state.uploadSubjects.length || state.uploadSubjects.includes(d.subject)) && (!q || d.title.toLowerCase().includes(q)));
    document.getElementById("uploads-grid").innerHTML = list.map((d) =>
      '<article class="doc-card"><div class="thumb">' + thumbSVG(d.thumb) + '</div><div class="doc-body"><h3>' + escapeHtml(d.title) + '</h3><div class="tags"><span class="tag tag-sub">' + escapeHtml(d.subject) + '</span><span class="tag tag-grade">Grade ' + d.grade + "</span>" + statusTag(d.status) + '</div><div class="meta-row"><span>👁 ' + d.views + " views · " + d.downloads + ' downloads</span><span><button class="icon-btn" onclick="cycleStatus(' + d.id + ",'" + d.status + '\')">✎</button><button class="icon-btn danger" onclick="deleteUpload(' + d.id + ')">🗑</button></span></div></div></article>'
    ).join("") || '<p class="muted">No uploads yet.</p>';
  } catch (err) { toast(err.message); }
}
async function renderQuizzes() {
  try {
    const data = await api("/api/quizzes");
    document.getElementById("quiz-grid").innerHTML = data.quizzes.map((q) =>
      '<article class="doc-card" style="padding:18px"><div class="tags"><span class="tag tag-sub">' + q.subject + '</span><span class="tag tag-grade">Grade ' + q.grade + '</span><span class="tag tag-grade">' + q.difficulty + "</span></div><h3>" + escapeHtml(q.title) + "</h3><p class='muted' style='margin:8px 0 12px'>" + q.questions + " questions · " + q.minutes + ' min</p><button class="btn-primary" onclick="startQuiz(' + q.id + ')">Start Quiz</button></article>'
    ).join("");
  } catch (err) { document.getElementById("quiz-grid").innerHTML = '<p style="color:#f87171">' + escapeHtml(err.message) + "</p>"; }
}
function renderProfile() {
  const u = state.user || { name: "Guest", email: "", role: "student" };
  document.getElementById("profile-name").textContent = u.name;
  document.getElementById("profile-email").textContent = u.email;
  document.getElementById("profile-role").textContent = u.role === "educator" ? "Verified Educator" : "Student";
}
async function startQuiz(id) {
  if (!state.user) return toast("Sign in to take a quiz");
  try {
    const data = await api("/api/quizzes/" + id);
    state.quiz = data.quiz; state.answers = {};
    document.getElementById("take-title").textContent = data.quiz.title;
    document.getElementById("take-meta").textContent = data.quiz.subject + " · Grade " + data.quiz.grade;
    document.getElementById("take-result").innerHTML = "";
    document.getElementById("take-questions").innerHTML = data.quiz.questions.map((q, i) =>
      '<div class="qcard"><div style="font-weight:700;margin-bottom:10px">' + (i + 1) + ". " + escapeHtml(q.prompt) + "</div>" +
      q.options.map((opt, idx) => '<label class="subject-row"><input type="radio" name="q' + q.id + '" onchange="state.answers[' + q.id + ']=' + idx + '"><span>' + escapeHtml(opt) + "</span></label>").join("") + "</div>"
    ).join("");
    go("take");
  } catch (err) { toast(err.message); }
}
async function submitQuiz() {
  if (!state.quiz) return;
  try {
    const data = await api("/api/quizzes/" + state.quiz.id + "/submit", { method: "POST", body: JSON.stringify({ answers: state.answers }) });
    document.getElementById("take-result").innerHTML = '<div class="glass-card" style="margin-bottom:14px"><strong>Score: ' + data.score + "/" + data.total + "</strong> · " + data.percent + "%</div>";
    toast("Quiz submitted");
  } catch (err) { toast(err.message); }
}
async function downloadDoc(id) {
  try {
    const res = await fetch(API + "/api/documents/" + id + "/download", { headers: state.token ? { Authorization: "Bearer " + state.token } : {} });
    if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Download failed"); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "padhaimode-notes.txt"; a.click();
    URL.revokeObjectURL(url); toast("Download started");
  } catch (err) { toast(err.message); }
}
async function cycleStatus(id, current) {
  const next = current === "Public" ? "Private" : current === "Private" ? "Pending" : "Public";
  try { await api("/api/documents/" + id, { method: "PATCH", body: JSON.stringify({ status: next }) }); toast("Visibility set to " + next); renderUploads(); }
  catch (err) { toast(err.message); }
}
async function deleteUpload(id) {
  if (!confirm("Delete this upload?")) return;
  try { await api("/api/documents/" + id, { method: "DELETE" }); toast("Upload removed"); renderUploads(); }
  catch (err) { toast(err.message); }
}
async function handleAuth(e, mode) {
  e.preventDefault();
  const form = e.target;
  try {
    const data = await api(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value, name: form.name && form.name.value.trim() }) });
    setSession(data.token, data.user);
    toast(mode === "signup" ? "Welcome to PadhaiMode" : "Signed in");
    go("documents");
  } catch (err) { toast(err.message); }
}
function logout() { setSession(null, null); toast("Signed out"); showLanding(); }
function openUploadModal() { if (!state.user) return toast("Sign in to upload"); document.getElementById("upload-modal").classList.add("open"); }
function closeUploadModal() { document.getElementById("upload-modal").classList.remove("open"); }
async function submitUpload(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!String(fd.get("title") || "").trim()) return toast("Give your notes a title");
  try { await api("/api/documents", { method: "POST", body: fd }); closeUploadModal(); e.target.reset(); toast("Uploaded — pending review"); go("uploads"); }
  catch (err) { toast(err.message); }
}
async function boot() {
  if (state.token) {
    try { const data = await api("/api/auth/me"); setSession(state.token, data.user); go("documents"); return; }
    catch { setSession(null, null); }
  }
  showLanding();
}
window.addEventListener("DOMContentLoaded", boot);
