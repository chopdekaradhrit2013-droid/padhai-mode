const API = "";
const SUBJECTS = ["English Language","English Literature","Physics","Chemistry","Biology","Mathematics","Hindi","Marathi","History","Geography"];
const GRADES = [6,7,8,9,10];
const state = {
  token: localStorage.getItem("pm-token"),
  user: JSON.parse(localStorage.getItem("pm-user") || "null"),
  marketGrades: [], marketSubjects: [], marketQuery: "",
  uploadGrades: [], uploadSubjects: [], uploadQuery: "",
  quiz: null, answers: {}
};

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(window._t);
  window._t = setTimeout(() => el.classList.remove("show"), 2400);
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

function go(page) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  const map = { landing:"page-landing", documents:"page-documents", uploads:"page-uploads", quizzes:"page-quizzes", profile:"page-profile", take:"page-take" };
  document.getElementById(map[page]).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (page === "documents") renderMarketplace();
  if (page === "uploads") renderUploads();
  if (page === "quizzes") renderQuizzes();
  if (page === "profile") renderProfile();
}

function thumbSVG(kind) {
  return "<svg viewBox='0 0 320 160' xmlns='http://www.w3.org/2000/svg'><rect fill='#1a1730' width='320' height='160'/><text x='24' y='90' fill='#c4b5fd' font-size='18'>" + (kind || "notes") + "</text></svg>";
}
function statusTag(status) {
  const cls = status === "Public" ? "tag-public" : status === "Pending" ? "tag-pending" : "tag-private";
  return '<span class="tag ' + cls + '">' + status + '</span>';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&", "<":"<", ">":">", '"':'"', "'":"&#39;" }[c]));
}

function renderFilters(containerId, selectedGrades, selectedSubjects, onGrade, onSubject, subjectSearchId) {
  const el = document.getElementById(containerId);
  const q = (document.getElementById(subjectSearchId) && document.getElementById(subjectSearchId).value || "").toLowerCase();
  const subjects = SUBJECTS.filter((s) => s.toLowerCase().includes(q));
  el.innerHTML = '<div style="font-weight:800;margin-bottom:14px">Filters</div>' +
    '<div style="color:#a78bfa;font-size:12px;font-weight:700;margin-bottom:8px">Grade</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">' + GRADES.map((g) => '<button class="grade-chip ' + (selectedGrades.includes(g)?"active":"") + '" data-g="' + g + '">Grade ' + g + '</button>').join("") + '</div>' +
    '<div style="color:#a78bfa;font-size:12px;font-weight:700;margin-bottom:8px">Subject</div>' +
    '<div style="margin-bottom:10px"><input id="' + subjectSearchId + '" class="input" style="padding-left:14px" placeholder="Search subjects..." value="' + (document.getElementById(subjectSearchId) && document.getElementById(subjectSearchId).value || "") + '"></div>' +
    subjects.map((s) => '<label class="subject-row"><input type="checkbox" data-s="' + s + '" ' + (selectedSubjects.includes(s)?"checked":"") + '><span>' + s + '</span></label>').join("");
  el.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => onGrade(+b.dataset.g));
  el.querySelectorAll("[data-s]").forEach((c) => c.onchange = () => onSubject(c.dataset.s, c.checked));
  document.getElementById(subjectSearchId).oninput = () => renderFilters(containerId, selectedGrades, selectedSubjects, onGrade, onSubject, subjectSearchId);
}

async function renderMarketplace() {
  renderFilters("market-filters", state.marketGrades, state.marketSubjects, (g) => { state.marketGrades = state.marketGrades.includes(g) ? state.marketGrades.filter((x)=>x!==g) : state.marketGrades.concat([g]); renderMarketplace(); }, (s,on) => { state.marketSubjects = on ? state.marketSubjects.concat([s]) : state.marketSubjects.filter((x)=>x!==s); renderMarketplace(); }, "market-subject-search");
  const params = new URLSearchParams();
  if (state.marketQuery) params.set("q", state.marketQuery);
  if (state.marketGrades.length) params.set("grades", state.marketGrades.join(","));
  if (state.marketSubjects.length) params.set("subjects", state.marketSubjects.join(","));
  try {
    const data = await api("/api/documents?" + params.toString());
    document.getElementById("market-meta").textContent = data.total + " resources · Verified notes for Grades 6–10";
    document.getElementById("market-grid").innerHTML = data.documents.map((d) =>
      '<article class="doc-card"><div class="thumb">' + thumbSVG(d.thumb) + '</div><div style="padding:14px"><h3 style="margin:0 0 10px;font-size:15px">' + escapeHtml(d.title) + '</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="tag tag-sub">' + d.subject + '</span><span class="tag tag-grade">Grade ' + d.grade + '</span><span style="margin-left:auto;color:#fbbf24;font-weight:700">' + d.rating + ' ★</span></div><div style="display:flex;align-items:center;gap:10px"><div><div style="font-weight:700">' + escapeHtml(d.educator||"Educator") + '</div><div style="font-size:11px;color:#9b97b3">' + d.role + '</div></div><button class="btn-primary" style="margin-left:auto;padding:7px 10px;font-size:12px" onclick="downloadDoc(' + d.id + ')">Download</button></div></div></article>'
    ).join("") || '<p style="color:#9b97b3">No notes match those filters.</p>';
  } catch (err) {
    document.getElementById("market-grid").innerHTML = '<p style="color:#f87171">' + escapeHtml(err.message) + '. Run npm start.</p>';
  }
}

async function renderUploads() {
  if (!state.user) return go("landing");
  renderFilters("upload-filters", state.uploadGrades, state.uploadSubjects, (g) => { state.uploadGrades = state.uploadGrades.includes(g) ? state.uploadGrades.filter((x)=>x!==g) : state.uploadGrades.concat([g]); renderUploads(); }, (s,on) => { state.uploadSubjects = on ? state.uploadSubjects.concat([s]) : state.uploadSubjects.filter((x)=>x!==s); renderUploads(); }, "upload-subject-search");
  try {
    const data = await api("/api/uploads");
    document.getElementById("stat-uploads").textContent = data.stats.uploads;
    document.getElementById("stat-views").textContent = data.stats.views >= 1000 ? (data.stats.views/1000).toFixed(1)+"k" : data.stats.views;
    document.getElementById("stat-downloads").textContent = data.stats.downloads;
    const q = state.uploadQuery.toLowerCase();
    const list = data.documents.filter((d) => (!state.uploadGrades.length || state.uploadGrades.includes(d.grade)) && (!state.uploadSubjects.length || state.uploadSubjects.includes(d.subject)) && (!q || d.title.toLowerCase().includes(q)));
    document.getElementById("uploads-grid").innerHTML = list.map((d) =>
      '<article class="doc-card"><div class="thumb">' + thumbSVG(d.thumb) + '</div><div style="padding:14px"><h3 style="margin:0 0 10px;font-size:15px">' + escapeHtml(d.title) + '</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="tag tag-sub">' + d.subject + '</span><span class="tag tag-grade">Grade ' + d.grade + '</span>' + statusTag(d.status) + '</div><div style="display:flex;justify-content:space-between;color:#9b97b3;font-size:12px"><span>' + d.views + ' views · ' + d.downloads + ' downloads</span><span><button onclick="cycleStatus(' + d.id + ',\'' + d.status + '\')" style="background:none;border:none;color:#c4b5fd;cursor:pointer">Visibility</button><button onclick="deleteUpload(' + d.id + ')" style="background:none;border:none;color:#f87171;cursor:pointer">Delete</button></span></div></div></article>'
    ).join("") || '<p style="color:#9b97b3">No uploads yet.</p>';
  } catch (err) { toast(err.message); }
}

async function renderQuizzes() {
  try {
    const data = await api("/api/quizzes");
    document.getElementById("quiz-grid").innerHTML = data.quizzes.map((q) =>
      '<article class="doc-card" style="padding:18px"><div style="display:flex;gap:8px;margin-bottom:10px"><span class="tag tag-sub">' + q.subject + '</span><span class="tag tag-grade">Grade ' + q.grade + '</span><span class="tag tag-grade">' + q.difficulty + '</span></div><h3 style="margin:0 0 8px">' + escapeHtml(q.title) + '</h3><p style="color:#9b97b3;font-size:13px">' + q.questions + ' questions · ' + q.minutes + ' min</p><button class="btn-primary" style="width:100%;padding:10px" onclick="startQuiz(' + q.id + ')">Start Quiz</button></article>'
    ).join("");
  } catch (err) {
    document.getElementById("quiz-grid").innerHTML = '<p style="color:#f87171">' + escapeHtml(err.message) + '</p>';
  }
}

function renderProfile() {
  const u = state.user || { name:"Guest", email:"", role:"student" };
  document.getElementById("profile-name").textContent = u.name;
  document.getElementById("profile-email").textContent = u.email;
  const roleEl = document.getElementById("profile-role");
  if (roleEl) roleEl.textContent = u.role === "educator" ? "Verified Educator" : "Student";
}

async function startQuiz(id) {
  if (!state.user) return toast("Sign in to take a quiz");
  try {
    const data = await api("/api/quizzes/" + id);
    state.quiz = data.quiz; state.answers = {};
    document.getElementById("take-title").textContent = data.quiz.title;
    document.getElementById("take-meta").textContent = data.quiz.subject + " · Grade " + data.quiz.grade;
    document.getElementById("take-result").innerHTML = "";
    document.getElementById("take-questions").innerHTML = data.quiz.questions.map((q,i) =>
      '<div class="glass" style="padding:16px;border-radius:14px;margin-bottom:12px"><div style="font-weight:700;margin-bottom:10px">' + (i+1) + '. ' + escapeHtml(q.prompt) + '</div>' +
      q.options.map((opt,idx) => '<label class="subject-row"><input type="radio" name="q' + q.id + '" onchange="state.answers[' + q.id + ']=' + idx + '"><span>' + escapeHtml(opt) + '</span></label>').join("") +
      '</div>'
    ).join("");
    go("take");
  } catch (err) { toast(err.message); }
}

async function submitQuiz() {
  if (!state.quiz) return;
  try {
    const data = await api("/api/quizzes/" + state.quiz.id + "/submit", { method:"POST", body: JSON.stringify({ answers: state.answers }) });
    document.getElementById("take-result").innerHTML = '<div class="glass" style="padding:16px;border-radius:14px;margin-bottom:14px"><strong>Score: ' + data.score + '/' + data.total + '</strong> · ' + data.percent + '%</div>';
    toast("Quiz submitted");
  } catch (err) { toast(err.message); }
}

async function downloadDoc(id) {
  try {
    const res = await fetch(API + "/api/documents/" + id + "/download", { headers: state.token ? { Authorization: "Bearer " + state.token } : {} });
    if (!res.ok) { const data = await res.json().catch(()=>({})); throw new Error(data.error || "Download failed"); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "padhaimode-notes.txt"; a.click();
    URL.revokeObjectURL(url); toast("Download started");
  } catch (err) { toast(err.message); }
}

async function cycleStatus(id, current) {
  const next = current === "Public" ? "Private" : current === "Private" ? "Pending" : "Public";
  try { await api("/api/documents/" + id, { method:"PATCH", body: JSON.stringify({ status: next }) }); toast("Visibility set to " + next); renderUploads(); }
  catch (err) { toast(err.message); }
}

async function deleteUpload(id) {
  if (!confirm("Delete this upload?")) return;
  try { await api("/api/documents/" + id, { method:"DELETE" }); toast("Upload removed"); renderUploads(); }
  catch (err) { toast(err.message); }
}

async function handleAuth(e, mode) {
  e.preventDefault();
  const form = e.target;
  try {
    const data = await api(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", { method:"POST", body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value, name: form.name && form.name.value.trim() }) });
    setSession(data.token, data.user);
    toast(mode === "signup" ? "Welcome to PadhaiMode" : "Signed in");
    go("documents");
  } catch (err) { toast(err.message); }
}

function logout() { setSession(null, null); toast("Signed out"); go("landing"); }
function openUploadModal() { if (!state.user) return toast("Sign in to upload"); document.getElementById("upload-modal").classList.add("open"); }
function closeUploadModal() { document.getElementById("upload-modal").classList.remove("open"); }

async function submitUpload(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!String(fd.get("title") || "").trim()) return toast("Give your notes a title");
  try { await api("/api/documents", { method:"POST", body: fd }); closeUploadModal(); e.target.reset(); toast("Uploaded — pending review"); go("uploads"); }
  catch (err) { toast(err.message); }
}

function setAuthTab(tab) {
  document.getElementById("tab-signin").classList.toggle("active-tab", tab === "signin");
  document.getElementById("tab-signup").classList.toggle("active-tab", tab === "signup");
  document.getElementById("form-signin").style.display = tab === "signin" ? "block" : "none";
  document.getElementById("form-signup").style.display = tab === "signup" ? "block" : "none";
}

async function boot() {
  if (state.token) {
    try { const data = await api("/api/auth/me"); setSession(state.token, data.user); go("documents"); return; }
    catch (e) { setSession(null, null); }
  }
  go("landing");
}
window.addEventListener("DOMContentLoaded", boot);
