const SUBJECTS = ["English Language","English Literature","Physics","Chemistry","Biology","Mathematics","Hindi","Marathi","History","Geography"];
const GRADES = [6,7,8,9,10];

const MARKETPLACE = [
  {id:"m1",title:"Class 10 Physics – Motion & Force Notes",subject:"Physics",grade:10,rating:4.8,views:1240,downloads:402,educator:"Priya S.",role:"Verified Educator",free:true,thumb:"physics"},
  {id:"m2",title:"Grade 9 English Literature – Poem Analysis Guide",subject:"English Literature",grade:9,rating:4.9,views:980,downloads:311,educator:"Rahul K.",role:"Verified Educator",free:true,thumb:"lit"},
  {id:"m3",title:"Class 8 Biology – Cell Structure Notes",subject:"Biology",grade:8,rating:4.7,views:760,downloads:210,educator:"Ananya M.",role:"Verified Educator",free:true,thumb:"bio"},
  {id:"m4",title:"Class 10 Mathematics – Trigonometry Workbook",subject:"Mathematics",grade:10,rating:4.6,views:1510,downloads:540,educator:"Priya S.",role:"Verified Educator",free:true,thumb:"math"},
  {id:"m5",title:"Class 9 Chemistry – Chemical Reactions",subject:"Chemistry",grade:9,rating:4.5,views:688,downloads:188,educator:"Rahul K.",role:"Verified Educator",free:true,thumb:"chem"},
  {id:"m6",title:"Class 7 History – Medieval India",subject:"History",grade:7,rating:4.4,views:420,downloads:95,educator:"Ananya M.",role:"Verified Educator",free:true,thumb:"hist"}
];

const DEFAULT_UPLOADS = [
  {id:"u1",title:"Class 10 Physics – Motion & Force",subject:"Physics",grade:10,status:"Public",views:320,downloads:124,thumb:"physics"},
  {id:"u2",title:"Class 9 Chemistry – Chemical Reactions",subject:"Chemistry",grade:9,status:"Pending",views:188,downloads:92,thumb:"chem"},
  {id:"u3",title:"Class 10 Mathematics – Trigonometry",subject:"Mathematics",grade:10,status:"Private",views:450,downloads:201,thumb:"math"},
  {id:"u4",title:"Class 8 Biology – Cell Structure",subject:"Biology",grade:8,status:"Public",views:210,downloads:78,thumb:"bio"},
  {id:"u5",title:"Class 7 History – Medieval India",subject:"History",grade:7,status:"Pending",views:95,downloads:41,thumb:"hist"},
  {id:"u6",title:"Class 10 English Literature – Poetry Analysis",subject:"English Literature",grade:10,status:"Public",views:278,downloads:153,thumb:"lit"}
];

const QUIZZES = [
  {title:"Motion & Force Sprint",subject:"Physics",grade:10,q:20,mins:25,difficulty:"Medium"},
  {title:"Cell Structure Check",subject:"Biology",grade:8,q:15,mins:18,difficulty:"Easy"},
  {title:"Trigonometry Board Pattern",subject:"Mathematics",grade:10,q:30,mins:45,difficulty:"Hard"},
  {title:"Chemical Reactions Rapid",subject:"Chemistry",grade:9,q:18,mins:22,difficulty:"Medium"},
  {title:"Medieval India Recap",subject:"History",grade:7,q:16,mins:20,difficulty:"Easy"},
  {title:"Poetry Devices Quiz",subject:"English Literature",grade:10,q:12,mins:15,difficulty:"Medium"}
];

const state = {
  page:"landing",
  authTab:"signin",
  user: JSON.parse(localStorage.getItem("pm-user") || "null"),
  marketGrades: [],
  marketSubjects: [],
  marketQuery: "",
  uploadGrades: [],
  uploadSubjects: [],
  uploadQuery: "",
  uploads: JSON.parse(localStorage.getItem("pm-uploads") || "null") || DEFAULT_UPLOADS
};

function saveUploads(){ localStorage.setItem("pm-uploads", JSON.stringify(state.uploads)); }

function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window._t);
  window._t = setTimeout(() => el.classList.remove("show"), 2400);
}

function go(page){
  state.page = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const map = {landing:"page-landing",documents:"page-documents",uploads:"page-uploads",quizzes:"page-quizzes",profile:"page-profile"};
  document.getElementById(map[page]).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
  if(page==="documents") renderMarketplace();
  if(page==="uploads") renderUploads();
  if(page==="quizzes") renderQuizzes();
  if(page==="profile") renderProfile();
}

function thumbSVG(kind){
  const maps = {
    physics: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"><rect fill="#f4efe4" width="320" height="160"/><g fill="none" stroke="#2b2b2b" stroke-width="1.6"><path d="M40 120h70M50 120v-50l30-20 30 20v50"/><circle cx="80" cy="55" r="8"/><path d="M170 40c30 10 40 40 20 70"/><path d="M200 55l40 10M190 80h50"/></g><text x="24" y="28" font-size="11" fill="#555">F = ma</text></svg>`,
    chem: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"><rect fill="#111318" width="320" height="160"/><g fill="none" stroke="#e8e8e8" stroke-width="1.6"><circle cx="90" cy="80" r="14"/><circle cx="130" cy="58" r="14"/><circle cx="130" cy="102" r="14"/><circle cx="170" cy="80" r="14"/><path d="M104 70l12-8M104 90l12 8M144 58h12M144 102h12M184 80h28"/></g><path d="M230 40h30v80h-12l-18 18z" fill="none" stroke="#e8e8e8"/><path d="M236 88h18v24h-18z" fill="#7dd3fc" opacity=".6"/></svg>`,
    math: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"><rect fill="#f7f2e6" width="320" height="160"/><g stroke="#222" fill="none" stroke-width="1.5"><path d="M40 120l50-70 50 70z"/><path d="M160 40h90M160 70h70M160 100h50"/></g><text x="168" y="36" font-size="12" fill="#333">sin2 + cos2 = 1</text><text x="168" y="66" font-size="12" fill="#333">tan = sin/cos</text></svg>`,
    bio: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"><rect fill="#f3efe3" width="320" height="160"/><ellipse cx="160" cy="80" rx="70" ry="50" fill="none" stroke="#222"/><circle cx="160" cy="80" r="18" fill="none" stroke="#222"/><circle cx="160" cy="80" r="6" fill="#222"/><circle cx="120" cy="70" r="8" fill="none" stroke="#222"/><circle cx="200" cy="95" r="10" fill="none" stroke="#222"/><text x="24" y="28" font-size="12" fill="#444">Cell</text></svg>`,
    hist: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"><rect fill="#3a2a1a" width="320" height="160"/><rect x="40" y="20" width="240" height="120" fill="#d7c39a"/><path d="M50 40h220M50 55h200M50 70h210M50 85h180M50 100h190" stroke="#5b4630" stroke-width="2"/></svg>`,
    lit: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"><rect fill="#2a2318" width="320" height="160"/><rect x="30" y="18" width="120" height="124" fill="#efe6d2"/><rect x="170" y="18" width="120" height="124" fill="#eadfc6"/><path d="M40 40h100M40 55h90M40 70h95M180 40h100M180 55h88" stroke="#6b5b3e" stroke-width="2"/></svg>`
  };
  return maps[kind] || maps.lit;
}

function statusTag(status){
  const cls = status==="Public"?"tag-public":status==="Pending"?"tag-pending":"tag-private";
  return `<span class="tag ${cls}">${status}</span>`;
}

function renderFilters(containerId, selectedGrades, selectedSubjects, onGrade, onSubject, subjectSearchId){
  const el = document.getElementById(containerId);
  const q = (document.getElementById(subjectSearchId)?.value || "").toLowerCase();
  const subjects = SUBJECTS.filter(s => s.toLowerCase().includes(q));
  el.innerHTML = `
    <div style="font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:8px">Filters</div>
    <div style="color:#a78bfa;font-size:12px;font-weight:700;margin-bottom:8px">Grade</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">
      ${GRADES.map(g => `<button class="grade-chip ${selectedGrades.includes(g)?"active":""}" data-g="${g}">Grade ${g}</button>`).join("")}
    </div>
    <div style="color:#a78bfa;font-size:12px;font-weight:700;margin-bottom:8px">Subject</div>
    <div style="position:relative;margin-bottom:10px">
      <input id="${subjectSearchId}" class="input" style="padding-left:34px" placeholder="Search subjects..." value="${document.getElementById(subjectSearchId)?.value || ""}">
    </div>
    <div>
      ${subjects.map(s => `<label class="subject-row"><input type="checkbox" data-s="${s}" ${selectedSubjects.includes(s)?"checked":""}><span>${s}</span></label>`).join("")}
    </div>`;
  el.querySelectorAll("[data-g]").forEach(b => b.onclick = () => onGrade(+b.dataset.g));
  el.querySelectorAll("[data-s]").forEach(c => c.onchange = () => onSubject(c.dataset.s, c.checked));
  document.getElementById(subjectSearchId).oninput = () => renderFilters(containerId, selectedGrades, selectedSubjects, onGrade, onSubject, subjectSearchId);
}

function renderMarketplace(){
  renderFilters("market-filters", state.marketGrades, state.marketSubjects, (g)=>{
    state.marketGrades = state.marketGrades.includes(g) ? state.marketGrades.filter(x=>x!==g) : [...state.marketGrades,g];
    renderMarketplace();
  }, (s,on)=>{
    state.marketSubjects = on ? [...state.marketSubjects,s] : state.marketSubjects.filter(x=>x!==s);
    renderMarketplace();
  }, "market-subject-search");

  const q = state.marketQuery.toLowerCase();
  const list = MARKETPLACE.filter(d => {
    const gradeOk = !state.marketGrades.length || state.marketGrades.includes(d.grade);
    const subOk = !state.marketSubjects.length || state.marketSubjects.includes(d.subject);
    const qOk = !q || d.title.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q);
    return gradeOk && subOk && qOk;
  });
  document.getElementById("market-meta").textContent = `${list.length} of 1,248 resources · Verified notes for Grades 6–10`;
  document.getElementById("market-grid").innerHTML = list.map(d => `
    <article class="doc-card">
      <div class="thumb">${thumbSVG(d.thumb)}</div>
      <div style="padding:14px 14px 8px">
        <h3 style="margin:0 0 10px;font-size:15px;line-height:1.35">${d.title}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
          <span class="tag tag-sub">${d.subject}</span>
          <span class="tag tag-grade">Grade ${d.grade}</span>
          <span style="margin-left:auto;font-size:12px;color:#fbbf24;font-weight:700">${d.rating} ★</span>
          <span class="tag tag-grade">Free Download</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px 14px;border-top:1px solid rgba(167,139,250,.12)">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#c4b5fd,#6d28d9)"></div>
        <div>
          <div style="font-size:13px;font-weight:700">${d.educator}</div>
          <div style="font-size:11px;color:#9b97b3">${d.role}</div>
        </div>
        <button class="btn-primary" style="margin-left:auto;padding:7px 10px;font-size:12px" onclick="downloadDoc('${d.title.replace(/'/g,"")}')">Open</button>
      </div>
    </article>`).join("") || `<p style="color:#9b97b3">No notes match those filters.</p>`;
}

function renderUploads(){
  renderFilters("upload-filters", state.uploadGrades, state.uploadSubjects, (g)=>{
    state.uploadGrades = state.uploadGrades.includes(g) ? state.uploadGrades.filter(x=>x!==g) : [...state.uploadGrades,g];
    renderUploads();
  }, (s,on)=>{
    state.uploadSubjects = on ? [...state.uploadSubjects,s] : state.uploadSubjects.filter(x=>x!==s);
    renderUploads();
  }, "upload-subject-search");

  const q = state.uploadQuery.toLowerCase();
  const list = state.uploads.filter(d => {
    const gradeOk = !state.uploadGrades.length || state.uploadGrades.includes(d.grade);
    const subOk = !state.uploadSubjects.length || state.uploadSubjects.includes(d.subject);
    const qOk = !q || d.title.toLowerCase().includes(q);
    return gradeOk && subOk && qOk;
  });
  const views = state.uploads.reduce((a,b)=>a+b.views,0);
  const downs = state.uploads.reduce((a,b)=>a+b.downloads,0);
  document.getElementById("stat-uploads").textContent = state.uploads.length;
  document.getElementById("stat-views").textContent = views>=1000 ? (views/1000).toFixed(1)+"k" : views;
  document.getElementById("stat-downloads").textContent = downs;
  document.getElementById("uploads-grid").innerHTML = list.map(d => `
    <article class="doc-card">
      <div class="thumb">${thumbSVG(d.thumb)}</div>
      <div style="padding:14px">
        <h3 style="margin:0 0 10px;font-size:15px">${d.title}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          <span class="tag tag-sub">${d.subject}</span>
          <span class="tag tag-grade">Grade ${d.grade}</span>
          ${statusTag(d.status)}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;color:#9b97b3;font-size:12px">
          <span>${d.views} views · ${d.downloads} downloads</span>
          <span>
            <button onclick="cycleStatus('${d.id}')" style="background:none;border:none;color:#c4b5fd;cursor:pointer">Edit</button>
            <button onclick="deleteUpload('${d.id}')" style="background:none;border:none;color:#f87171;cursor:pointer">Delete</button>
          </span>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#6e6a86">Uploaded by · ${(state.user && state.user.name) || "User"} · anonymous</div>
      </div>
    </article>`).join("") || `<p style="color:#9b97b3">No uploads match those filters.</p>`;
}

function renderQuizzes(){
  document.getElementById("quiz-grid").innerHTML = QUIZZES.map(q => `
    <article class="doc-card" style="padding:18px">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <span class="tag tag-sub">${q.subject}</span>
        <span class="tag tag-grade">Grade ${q.grade}</span>
        <span class="tag ${q.difficulty==="Hard"?"tag-pending":q.difficulty==="Easy"?"tag-public":"tag-grade"}">${q.difficulty}</span>
      </div>
      <h3 style="margin:0 0 8px">${q.title}</h3>
      <p style="color:#9b97b3;font-size:13px;margin:0 0 14px">${q.q} questions · ${q.mins} min</p>
      <button class="btn-primary" style="width:100%;padding:10px" onclick="toast('Quiz demo — connect a question bank next')">Start Quiz</button>
    </article>`).join("");
}

function renderProfile(){
  const u = state.user || {name:"Guest",email:"you@example.com"};
  document.getElementById("profile-name").textContent = u.name;
  document.getElementById("profile-email").textContent = u.email;
}

function downloadDoc(title){ toast("Preparing download: " + title); }

function cycleStatus(id){
  const item = state.uploads.find(u => u.id === id);
  if(!item) return;
  item.status = item.status==="Public"?"Private":item.status==="Private"?"Pending":"Public";
  saveUploads(); renderUploads();
  toast("Visibility set to " + item.status);
}

function deleteUpload(id){
  state.uploads = state.uploads.filter(u => u.id !== id);
  saveUploads(); renderUploads();
  toast("Upload removed");
}

function handleAuth(e, mode){
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  if(!email || !password) return toast("Enter email and password");
  const name = mode==="signup" ? (form.name && form.name.value || email.split("@")[0]) : email.split("@")[0];
  state.user = {name, email};
  localStorage.setItem("pm-user", JSON.stringify(state.user));
  toast(mode==="signup" ? "Welcome to PadhaiMode" : "Signed in");
  go("documents");
}

function logout(){
  state.user = null;
  localStorage.removeItem("pm-user");
  toast("Signed out");
  go("landing");
}

function openUploadModal(){ document.getElementById("upload-modal").classList.add("open"); }
function closeUploadModal(){ document.getElementById("upload-modal").classList.remove("open"); }

function submitUpload(e){
  e.preventDefault();
  const f = e.target;
  const title = f.title.value.trim();
  const subject = f.subject.value;
  const grade = +f.grade.value;
  if(!title) return toast("Give your notes a title");
  const thumb = subject==="Physics"?"physics":subject==="Chemistry"?"chem":subject==="Mathematics"?"math":subject==="Biology"?"bio":subject==="History"?"hist":"lit";
  state.uploads.unshift({id:"u"+Date.now(),title,subject,grade,status:"Pending",views:0,downloads:0,thumb});
  saveUploads(); closeUploadModal(); f.reset();
  toast("Uploaded — pending review");
  go("uploads");
}

function setAuthTab(tab){
  state.authTab = tab;
  document.getElementById("tab-signin").classList.toggle("active-tab", tab==="signin");
  document.getElementById("tab-signup").classList.toggle("active-tab", tab==="signup");
  document.getElementById("form-signin").style.display = tab==="signin" ? "block" : "none";
  document.getElementById("form-signup").style.display = tab==="signup" ? "block" : "none";
}

window.addEventListener("DOMContentLoaded", () => {
  if(state.user) go("documents");
  else go("landing");
});
