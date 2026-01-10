
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzPET2eH4tG62PKbR3G5xCBk0ZvgX_g8skVStCxUVztcCcwWQWkN_f1JK5iNmMJqNn1Cw/exec";

// 2) Brand settings per client:
const BRAND = {
  name: "Instant Specials Menu",
  tagline: "Tap an item for more details",
  logoPath: "./logo.png",
  // Optional: override accent color quickly:
  // accent: "#f97316",
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  brandName: $("#brandName"),
  brandTagline: $("#brandTagline"),
  brandLogo: $("#brandLogo"),
  statusPill: $("#statusPill"),

  categoryRow: $("#categoryRow"),

  specialsSection: $("#specialsSection"),
  specialsGrid: $("#specialsGrid"),
  menuTitle: $("#menuTitle"),
  countLabel: $("#countLabel"),
  menuList: $("#menuList"),
  emptyState: $("#emptyState"),

  loadingBar: $("#loadingBar"),

  modalOverlay: $("#modalOverlay"),
  modalPanel: $("#modalPanel"),
  modalClose: $("#modalClose"),
  modalTitle: $("#modalTitle"),
  modalCategory: $("#modalCategory"),
  modalPrice: $("#modalPrice"),
  modalDesc: $("#modalDesc"),
  modalBadge: $("#modalBadge"),
  modalImageWrap: $("#modalImageWrap"),
  modalImage: $("#modalImage"),
  modalCopyBtn: $("#modalCopyBtn"),
  modalDoneBtn: $("#modalDoneBtn"),
  toast: $("#toast"),
};

let rawItems = [];
let activeCategory = "All";

function normalizeBoolean(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  }
  return !!v;
}

function money(v) {
  if (v === null || v === undefined || v === "") return "";
  const num = Number(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return String(v);
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function safeText(v) {
  return (v ?? "").toString().trim();
}

function startLoading() {
  els.loadingBar.style.width = "10%";
  els.loadingBar.style.transition = "width 250ms ease";
  requestAnimationFrame(() => (els.loadingBar.style.width = "65%"));
}

function endLoading() {
  els.loadingBar.style.width = "100%";
  setTimeout(() => {
    els.loadingBar.style.transition = "none";
    els.loadingBar.style.width = "0";
    void els.loadingBar.offsetWidth;
    els.loadingBar.style.transition = "width 250ms ease";
  }, 250);
}

function setBrand() {
  els.brandName.textContent = BRAND.name;
  els.brandTagline.textContent = BRAND.tagline;
  if (BRAND.logoPath) els.brandLogo.src = BRAND.logoPath;

  if (BRAND.accent) {
    document.documentElement.style.setProperty("--accent", BRAND.accent);
  }
}

function showStatus(text) {
  els.statusPill.textContent = text;
  els.statusPill.classList.remove("hidden");
  setTimeout(() => els.statusPill.classList.add("hidden"), 2000);
}

async function fetchMenu() {
  if (!SHEET_API_URL || SHEET_API_URL.includes("PASTE_")) {
    return [
      { id: "sp1", category: "Specials", name: "2 Tacos + Drink", price: 7.99, description: "Your choice of meat with a fresh drink.", featured: true, available: true, order: 1 },
      { id: "sp2", category: "Specials", name: "Smoothie Bowl", price: 5.5, description: "Seasonal fruits and organic granola.", featured: true, available: true, order: 2 },
      { id: "m1", category: "Appetizers", name: "Guacamole & Chips", price: 4.5, description: "Hand-picked avocados.", featured: false, available: true, order: 3 },
    ];
  }

  const res = await fetch(SHEET_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menu");
  const json = await res.json();

  return json.map((r) => ({
    id: safeText(r.id),
    category: safeText(r.category) || "Menu",
    name: safeText(r.name),
    price: safeText(r.price),
    description: safeText(r.description),
    image: safeText(r.image),
    featured: normalizeBoolean(r.featured),
    available: normalizeBoolean(r.available),
    order: Number(r.order) || 9999,
  }));
}

function buildCategories(items) {
  const cats = new Set(["All"]);
  items.forEach((i) => {
    if (i.available && i.category) cats.add(i.category);
  });
  const arr = Array.from(cats);
  arr.sort((a, b) => {
    if (a === "All") return -1;
    if (b === "All") return 1;
    if (a.toLowerCase() === "specials") return -1;
    if (b.toLowerCase() === "specials") return 1;
    return a.localeCompare(b);
  });
  return arr;
}

function pillButton(label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition glass text-white/50 hover:text-white hover:bg-white/5";
  btn.textContent = label;
  btn.dataset.cat = label;
  return btn;
}

function renderCategoryRow(categories) {
  els.categoryRow.innerHTML = "";
  categories.forEach((c) => {
    const b = pillButton(c);
    if (c === activeCategory) {
      b.className = "shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition bg-white text-black shadow-lg";
    }
    b.addEventListener("click", () => {
      activeCategory = c;
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.categoryRow.appendChild(b);
  });
}

function matchCategory(item) {
  if (activeCategory === "All") return true;
  return item.category === activeCategory;
}

function visibleItems() {
  return rawItems
    .filter((i) => i.available)
    .filter(matchCategory)
    .sort((a, b) => a.order - b.order);
}

function featuredSpecials() {
  return rawItems
    .filter((i) => i.available)
    .filter((i) => i.featured || i.category.toLowerCase() === "specials")
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);
}

function cardSpecial(item, index) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "item-appear text-left glass rounded-[2rem] p-6 hover:bg-white/5 group active:scale-[0.98]";
  btn.style.animationDelay = `${index * 0.1}s`;
  btn.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 space-y-2">
        <h3 class="text-lg font-bold tracking-tight">${escapeHtml(item.name)}</h3>
        <p class="text-sm text-white/40 font-light line-clamp-2 leading-relaxed">${escapeHtml(item.description || "")}</p>
      </div>
      <div class="shrink-0 text-lg font-light">${escapeHtml(money(item.price))}</div>
    </div>
    <div class="mt-6 flex items-center gap-2">
      <span class="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">Chef's Choice</span>
    </div>
  `;
  btn.addEventListener("click", () => openModal(item, "Special"));
  return btn;
}

function rowItem(item, index) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "item-appear text-left glass rounded-2xl p-5 hover:bg-white/5 active:scale-[0.98]";
  btn.style.animationDelay = `${index * 0.05}s`;
  btn.innerHTML = `
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0 flex-1">
        <h4 class="text-base font-semibold tracking-tight">${escapeHtml(item.name)}</h4>
        ${item.description ? `<p class="mt-1 text-xs text-white/40 line-clamp-1 font-light">${escapeHtml(item.description)}</p>` : ""}
      </div>
      <div class="shrink-0 text-base font-light tabular-nums">${escapeHtml(money(item.price))}</div>
    </div>
  `;
  btn.addEventListener("click", () => openModal(item, item.category));
  return btn;
}

function renderSpecials() {
  const specials = featuredSpecials();
  if (specials.length === 0) {
    els.specialsSection.classList.add("hidden");
    return;
  }
  els.specialsSection.classList.remove("hidden");
  els.specialsGrid.innerHTML = "";
  specials.forEach((it, idx) => els.specialsGrid.appendChild(cardSpecial(it, idx)));
}

function renderList() {
  const list = visibleItems();
  els.menuList.innerHTML = "";
  list.forEach((it, idx) => els.menuList.appendChild(rowItem(it, idx)));
  els.countLabel.textContent = `${list.length} items`;
  els.emptyState.classList.toggle("hidden", list.length > 0);
}

function renderAll() {
  const categories = buildCategories(rawItems);
  if (!categories.includes(activeCategory)) activeCategory = "All";
  renderCategoryRow(categories);
  els.menuTitle.textContent = activeCategory;
  renderSpecials();
  renderList();
}

function escapeHtml(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let lastFocused = null;
function openModal(item, badgeText) {
  lastFocused = document.activeElement;

  els.modalTitle.textContent = item.name || "Item";
  els.modalCategory.textContent = item.category || "";
  els.modalPrice.textContent = money(item.price) || "";
  els.modalDesc.textContent = item.description || "Inquire for details.";

  if (badgeText) {
    els.modalBadge.textContent = badgeText;
    els.modalBadge.classList.remove("hidden");
  } else {
    els.modalBadge.classList.add("hidden");
  }

  if (item.image) {
    els.modalImageWrap.classList.remove("hidden");
    els.modalImage.src = item.image;
    els.modalImage.alt = item.name || "";
  } else {
    els.modalImageWrap.classList.add("hidden");
  }

  els.modalOverlay.classList.remove("hidden");
  els.modalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  els.modalClose.focus();

  els.modalCopyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(item.name || "");
      toast("Copied to clipboard");
    } catch {
      toast("Click to copy failed");
    }
  };

  els.modalDoneBtn.onclick = () => closeModal();
}

function closeModal() {
  els.modalOverlay.classList.add("hidden");
  els.modalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 2000);
}

els.modalClose.addEventListener("click", closeModal);
els.modalOverlay.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.modalOverlay.classList.contains("hidden")) closeModal();
});

async function loadAndRender(isManual = false) {
  startLoading();
  try {
    const items = await fetchMenu();
    rawItems = items.filter((i) => i.name);
    endLoading();
    renderAll();
    if (isManual) showStatus("Menu Updated");
  } catch (err) {
    endLoading();
    showStatus("Offline Mode");
    if (!rawItems.length) {
      rawItems = [];
      renderAll();
      toast("Connection lost");
    }
  }
}

function init() {
  setBrand();
  loadAndRender(false);
}

init();
