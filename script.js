:root{
  --brand:#ff003b;      /* L'Oréal accent */
  --brand-2:#e3a535;    /* secondary */
  --ink:#222;
  --muted:#666;
  --bg:#faf9fb;
  --card:#fff;
  --ring:rgba(0,0,0,.08);
  --sel:#ffe6ec;
  --ok:#10b981;
  --danger:#ef4444;
  --radius:18px;
  --shadow:0 6px 24px rgba(0,0,0,.08);
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  font-family:"Montserrat",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  background:var(--bg);
  color:var(--ink);
  margin:0;
  display:flex;
  flex-direction:column;
}

.site-header{
  text-align:center;
  padding:28px 16px 8px;
}
h1{margin:0;font-size:clamp(22px,3vw,32px)}
.sub{color:var(--muted);margin:6px 0 18px}

.toolbar{
  display:flex; gap:12px; justify-content:center; flex-wrap:wrap;
}
.field{display:flex; align-items:center; gap:8px; background:var(--card); padding:8px 10px; border-radius:999px; box-shadow:var(--shadow)}
.field input,.field select{border:none; outline:none; background:transparent; padding:8px 10px; min-width:200px}

button{
  border:none; border-radius:999px; padding:10px 16px; cursor:pointer;
  box-shadow:var(--shadow);
}
button.primary{background:var(--brand); color:#fff}
button.ghost{background:var(--card)}
button:disabled{opacity:.6; cursor:not-allowed}

.page{
  display:grid; grid-template-columns:1.2fr .9fr;
  gap:18px; width:min(1180px,95%); margin:14px auto 24px;
}
@media (max-width:980px){
  .page{grid-template-columns:1fr}
}

.section-title{margin:8px 0 10px; font-size:18px}

.grid{
  display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:14px;
}
.card{
  background:var(--card); border-radius:var(--radius);
  box-shadow:var(--shadow); overflow:hidden; display:flex; flex-direction:column;
  border:2px solid transparent; position:relative;
}
.card.selected{border-color:var(--brand); background:var(--sel)}
.card header{padding:10px 12px 0}
.card .brand{color:var(--brand-2); font-weight:600; font-size:12px}
.card .title{font-weight:600; margin:6px 0 4px; line-height:1.2}
.card .meta{font-size:12px; color:var(--muted)}
.card .img-wrap{aspect-ratio:1.3/1; background:#f1f1f1}
.card .img-wrap img{width:100%; height:100%; object-fit:cover}
.card .actions{display:flex; gap:8px; padding:10px 12px 12px; margin-top:auto}
.card .actions button{flex:1}

.badge{
  position:absolute; top:8px; right:8px; background:var(--brand); color:#fff;
  font-size:12px; padding:4px 8px; border-radius:999px;
  box-shadow:var(--shadow); display:none;
}
.card.selected .badge{display:inline-block}

.selected{
  background:var(--card); border-radius:var(--radius); padding:10px; min-height:48px;
  box-shadow:var(--shadow); display:flex; flex-wrap:wrap; gap:8px;
}
.pill{
  display:inline-flex; align-items:center; gap:8px;
  background:#f3f3f3; border-radius:999px; padding:6px 10px; font-size:12px
}
.pill button{padding:2px 6px; box-shadow:none; background:#fff}

.selected-actions{display:flex; justify-content:space-between; align-items:center; margin:10px 0 18px}

.chat{
  background:var(--card); border-radius:var(--radius); padding:12px; height:360px; overflow:auto; box-shadow:var(--shadow)
}
.msg{display:flex; gap:10px; margin:8px 0}
.msg.user{justify-content:flex-end}
.bubble{
  max-width:78%; padding:10px 12px; border-radius:16px; box-shadow:var(--shadow)
}
.user .bubble{background:#eef2ff}
.assistant .bubble{background:#f8fafc}
.system .bubble{background:#fff7ed}

.chat-form{display:flex; gap:8px; margin-top:10px}
.chat-form input{
  flex:1; padding:12px 14px; border-radius:999px; border:1px solid var(--ring); background:#fff; outline:none
}

.site-footer{padding:22px 16px; text-align:center; color:var(--muted)}

dialog{
  border:none; border-radius:16px; box-shadow:var(--shadow); width:min(680px,92%);
  padding:0; background:var(--card)
}
dialog article header{
  display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid #eee
}
dialog article #modalBody{padding:16px}
dialog::backdrop{background:rgba(0,0,0,.35)}
script.js
javascript
Copy
Edit
// ==== CONFIG ====
const WORKER_URL = "https://YOUR-WORKER.SUBDOMAIN.workers.dev"; // <-- put your Worker URL here
const MODEL = "gpt-4o-mini"; // Worker will use this unless you change there too

// ==== GLOBAL STATE ====
let allProducts = [];               // loaded from products.json
let selectedIds = new Set();        // product.id strings
let chatHistory = [];               // {role, content} array sent to worker
const LS_SELECTED_KEY = "rb_selected_products";
const LS_RTL = "rb_rtl";

// ==== DOM ====
const productGrid   = document.getElementById("productGrid");
const selectedList  = document.getElementById("selectedList");
const clearSelected = document.getElementById("clearSelected");
const generateBtn   = document.getElementById("generateBtn");
const categorySel   = document.getElementById("categoryFilter");
const searchInput   = document.getElementById("productSearch");
const chatWindow    = document.getElementById("chatWindow");
const chatForm      = document.getElementById("chatForm");
const chatInput     = document.getElementById("chatInput");
const rtlToggle     = document.getElementById("rtlToggle");
const descModal     = document.getElementById("descModal");
const modalTitle    = document.getElementById("modalTitle");
const modalBody     = document.getElementById("modalBody");
const modalClose    = document.getElementById("modalClose");

// ==== INIT ====
window.addEventListener("DOMContentLoaded", async () => {
  // RTL persisted
  const savedRtl = localStorage.getItem(LS_RTL);
  if (savedRtl === "1") {
    document.documentElement.setAttribute("dir", "rtl");
  }

  // selections persisted
  const saved = JSON.parse(localStorage.getItem(LS_SELECTED_KEY) || "[]");
  selectedIds = new Set(saved);

  // load products.json
  allProducts = await fetch("./products.json").then(r => r.json());

  // initial render
  renderProducts();
  renderSelected();

  // events
  categorySel.addEventListener("change", renderProducts);
  searchInput.addEventListener("input", renderProducts);

  clearSelected.addEventListener("click", () => {
    selectedIds.clear();
    persistSelections();
    renderSelected();
    renderProducts();
  });

  generateBtn.addEventListener("click", onGenerateRoutine);
  chatForm.addEventListener("submit", onChatSubmit);

  rtlToggle.addEventListener("click", () => {
    const isRtl = document.documentElement.getAttribute("dir") === "rtl";
    if (isRtl) {
      document.documentElement.removeAttribute("dir");
      localStorage.setItem(LS_RTL, "0");
    } else {
      document.documentElement.setAttribute("dir", "rtl");
      localStorage.setItem(LS_RTL, "1");
    }
  });

  modalClose.addEventListener("click", () => descModal.close());
});

// ==== RENDER PRODUCTS WITH FILTER + SEARCH ====
function renderProducts() {
  const cat = categorySel.value;
  const q = searchInput.value.trim().toLowerCase();

  let list = allProducts;
  if (cat && cat !== "all") list = list.filter(p => (p.category || "").toLowerCase() === cat);

  if (q) {
    list = list.filter(p => {
      const hay = `${p.name} ${p.brand} ${p.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  productGrid.innerHTML = "";

  if (!list.length) {
    productGrid.innerHTML = `<p style="color:#666">No products match your filters.</p>`;
    return;
  }

  for (const p of list) {
    const card = document.createElement("article");
    card.className = "card" + (selectedIds.has(p.id) ? " selected" : "");
    card.dataset.id = p.id;

    card.innerHTML = `
      <span class="badge">Selected</span>
      <div class="img-wrap">${p.image ? `<img src="${p.image}" alt="${p.name}">` : ""}</div>
      <header>
        <div class="brand">${sanitize(p.brand || "L’Oréal")}</div>
        <div class="title">${sanitize(p.name)}</div>
        <div class="meta">${sanitize(p.category || "")}</div>
      </header>
      <div class="actions">
        <button class="ghost more">More Info</button>
        <button class="primary toggle">${selectedIds.has(p.id) ? "Unselect" : "Select"}</button>
      </div>
    `;

    // show description modal
    card.querySelector(".more").addEventListener("click", (e) => {
      e.stopPropagation();
      showDescription(p);
    });

    // toggle select
    card.querySelector(".toggle").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSelection(p.id);
    });

    // also let users click the whole card (except buttons)
    card.addEventListener("click", (e) => {
      if (e.target.closest(".actions")) return; // ignore inner buttons
      toggleSelection(p.id);
    });

    productGrid.appendChild(card);
  }
}

// ==== SELECT/UNSELECT ====
function toggleSelection(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  persistSelections();
  renderSelected();
  renderProducts();
}

function persistSelections() {
  localStorage.setItem(LS_SELECTED_KEY, JSON.stringify([...selectedIds]));
}

// ==== SELECTED LIST ====
function renderSelected() {
  selectedList.innerHTML = "";
  const items = allProducts.filter(p => selectedIds.has(p.id));

  if (!items.length) {
    selectedList.innerHTML = `<span style="color:#666">No products selected.</span>`;
    return;
  }

  for (const p of items) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.innerHTML = `
      ${sanitize(p.name)}
      <button title="Remove" aria-label="Remove">✕</button>
    `;
    pill.querySelector("button").addEventListener("click", () => {
      selectedIds.delete(p.id);
      persistSelections();
      renderSelected();
      renderProducts();
    });
    selectedList.appendChild(pill);
  }
}

// ==== DESCRIPTION MODAL ====
function showDescription(p) {
  modalTitle.textContent = p.name;
  modalBody.innerHTML = `
    <p><strong>Brand:</strong> ${sanitize(p.brand || "")}</p>
    <p><strong>Category:</strong> ${sanitize(p.category || "")}</p>
    <p style="margin-top:8px">${sanitize(p.description || "No description available.")}</p>
    ${p.link ? `<p style="margin-top:8px"><a href="${p.link}" target="_blank" rel="noopener">Learn more</a></p>` : ""}
  `;
  descModal.showModal();
}

// ==== CHAT UI ====
function addMessage(role, content) {
  chatHistory.push({ role, content });
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  msg.appendChild(bubble);
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function onGenerateRoutine() {
  const chosen = allProducts.filter(p => selectedIds.has(p.id));
  if (!chosen.length) {
    addMessage("system", "Select at least one product to generate a routine.");
    return;
  }

  addMessage("user", "Generate a routine using my selected products.");
  generateBtn.disabled = true;
  try {
    const reply = await callWorker({
      intent: "generate_routine",
      products: chosen,
      history: chatHistory
    });
    addMessage("assistant", reply);
  } catch (err) {
    console.error(err);
    addMessage("system", "Error generating routine. Please try again.");
  } finally {
    generateBtn.disabled = false;
  }
}

async function onChatSubmit(e) {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  addMessage("user", text);

  try {
    const reply = await callWorker({
      intent: "follow_up",
      history: chatHistory
    });
    addMessage("assistant", reply);
  } catch (err) {
    console.error(err);
    addMessage("system", "Error. Please try again.");
  }
}

// ==== WORKER CALL ====
async function callWorker(payload) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...payload })
  });
  if (!res.ok) throw new Error(`Worker ${res.status}`);
  const data = await res.json();
  // expect { reply: "..." }
  return data.reply || "";
}

// ==== UTIL ====
function sanitize(str) {
  return String(str).replace(/[<>&]/g, s => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[s]));
}
