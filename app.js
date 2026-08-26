import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, setDoc, updateDoc, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig, CONTRIBUTION_START, MONTHLY_AMOUNT } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildMonthList() {
  const months = [];
  const now = new Date();
  let y = CONTRIBUTION_START.year, m = CONTRIBUTION_START.month;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months.reverse(); // most recent first
}
const MONTHS = buildMonthList();
function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

let members = []; // { id, name, pin, payments }
let isAdmin = false;

async function loadMembers() {
  const snap = await getDocs(collection(db, "members"));
  members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  members.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.view).classList.add("active");
  });
});

// ---------- Public view ----------
const monthSelect = document.getElementById("monthSelect");
const searchBox = document.getElementById("searchBox");
const memberList = document.getElementById("memberList");
const summaryEl = document.getElementById("summary");

MONTHS.forEach(m => {
  const opt = document.createElement("option");
  opt.value = m; opt.textContent = monthLabel(m);
  monthSelect.appendChild(opt);
});

function renderPublicList() {
  const month = monthSelect.value;
  const filter = searchBox.value.trim().toLowerCase();
  memberList.innerHTML = "";
  const visible = members.filter(mm => mm.name.toLowerCase().includes(filter));

  let paidCount = 0;
  visible.forEach(mm => {
    const paid = !!(mm.payments && mm.payments[month]);
    if (paid) paidCount++;
    const row = document.createElement("div");
    row.className = "member-row";
    const badgeHtml = isAdmin
      ? `<button class="badge toggle-btn ${paid ? "paid" : "unpaid"}" data-id="${mm.id}">${paid ? "Paid ✓" : "Not paid"}</button>`
      : `<span class="badge ${paid ? "paid" : "unpaid"}">${paid ? "Paid ✓" : "Not paid"}</span>`;
    row.innerHTML = `<span class="member-name">${mm.name}</span>${badgeHtml}`;
    memberList.appendChild(row);
  });

  summaryEl.innerHTML = `
    <div class="stat"><span class="num">${visible.length}</span><span class="lbl">Members</span></div>
    <div class="stat"><span class="num">${paidCount}</span><span class="lbl">Paid ${monthLabel(month)}</span></div>
    <div class="stat"><span class="num">₦${MONTHLY_AMOUNT}</span><span class="lbl">Per month</span></div>
  `;

  if (isAdmin) {
    memberList.querySelectorAll(".toggle-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const mm = members.find(x => x.id === id);
        const current = !!(mm.payments && mm.payments[month]);
        const newPayments = { ...(mm.payments || {}), [month]: !current };
        await updateDoc(doc(db, "members", id), { payments: newPayments });
        mm.payments = newPayments;
        renderPublicList();
      });
    });
  }
}

monthSelect.addEventListener("change", renderPublicList);
searchBox.addEventListener("input", renderPublicList);

// ---------- Member self-check view ----------
const memberNameSelect = document.getElementById("memberNameSelect");
const memberPin = document.getElementById("memberPin");
const memberCheckBtn = document.getElementById("memberCheckBtn");
const memberError = document.getElementById("memberError");
const memberResult = document.getElementById("memberResult");
const memberMonthGrid = document.getElementById("memberMonthGrid");

function populateMemberDropdown() {
  memberNameSelect.innerHTML = '<option value="">Select your name</option>';
  members.forEach(mm => {
    const opt = document.createElement("option");
    opt.value = mm.id; opt.textContent = mm.name;
    memberNameSelect.appendChild(opt);
  });
}

memberCheckBtn.addEventListener("click", () => {
  memberError.textContent = "";
  memberResult.classList.add("hidden");
  const mm = members.find(x => x.id === memberNameSelect.value);
  if (!mm) { memberError.textContent = "Please select your name."; return; }
  if (!memberPin.value || String(mm.pin) !== String(memberPin.value)) {
    memberError.textContent = "Incorrect PIN.";
    return;
  }
  memberMonthGrid.innerHTML = "";
  MONTHS.forEach(month => {
    const paid = !!(mm.payments && mm.payments[month]);
    const chip = document.createElement("div");
    chip.className = `month-chip ${paid ? "paid" : "unpaid"}`;
    chip.textContent = `${monthLabel(month)} ${paid ? "✓" : "✕"}`;
    memberMonthGrid.appendChild(chip);
  });
  memberResult.classList.remove("hidden");
});

// ---------- Admin view ----------
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminError = document.getElementById("adminError");
const adminLoggedIn = document.getElementById("adminLoggedIn");
const logoutBtn = document.getElementById("logoutBtn");
const addMemberForm = document.getElementById("addMemberForm");
const newMemberName = document.getElementById("newMemberName");
const newMemberPin = document.getElementById("newMemberPin");
const addMemberMsg = document.getElementById("addMemberMsg");
const adminTabBtn = document.querySelector('[data-view="adminView"]');

adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminError.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, adminEmail.value, adminPassword.value);
  } catch (err) {
    adminError.textContent = "Login failed. Check email and password.";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

addMemberForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addMemberMsg.textContent = "";
  const name = newMemberName.value.trim();
  const pin = newMemberPin.value.trim();
  if (!name || !pin) return;
  await addDoc(collection(db, "members"), { name, pin, payments: {} });
  newMemberName.value = ""; newMemberPin.value = "";
  addMemberMsg.textContent = `Added ${name}.`;
  await loadMembers();
  populateMemberDropdown();
  renderPublicList();
});

const bulkAddBtn = document.getElementById("bulkAddBtn");
const bulkNames = document.getElementById("bulkNames");
const bulkAddMsg = document.getElementById("bulkAddMsg");

bulkAddBtn.addEventListener("click", async () => {
  const lines = bulkNames.value.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return;
  bulkAddMsg.textContent = "Adding…";
  let count = 0;
  for (const line of lines) {
    const [namePart, pinPart] = line.split(",");
    const name = (namePart || "").trim();
    const pin = (pinPart || "0000").trim();
    if (!name) continue;
    await addDoc(collection(db, "members"), { name, pin, payments: {} });
    count++;
  }
  bulkAddMsg.textContent = `Added ${count} member(s).`;
  bulkNames.value = "";
  await loadMembers();
  populateMemberDropdown();
  renderPublicList();
});

onAuthStateChanged(auth, (user) => {
  isAdmin = !!user;
  adminLoginForm.classList.toggle("hidden", isAdmin);
  adminLoggedIn.classList.toggle("hidden", !isAdmin);

  // The full member list is only for admins. Hide that tab entirely
  // for everyone else, and bounce them off it if they're on it.
  const everyoneTabBtn = document.getElementById("everyoneTabBtn");
  everyoneTabBtn.classList.toggle("hidden", !isAdmin);
  if (!isAdmin && document.getElementById("publicView").classList.contains("active")) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelector('[data-view="memberView"]').classList.add("active");
    document.getElementById("memberView").classList.add("active");
  }

  renderPublicList();
});

// ---------- Init ----------
(async function init() {
  memberList.innerHTML = '<div class="loading">Loading…</div>';
  await loadMembers();
  populateMemberDropdown();
  renderPublicList();
})();
