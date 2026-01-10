
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzPET2eH4tG62PKbR3G5xCBk0ZvgX_g8skVStCxUVztcCcwWQWkN_f1JK5iNmMJqNn1Cw/exec";

// 2) Brand settings per client:
const BRAND = {
  name: "Solaris Eats",
  tagline: "Modern Flavors, Solar Vibes",
  logoPath: "./public/logo.png",
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

  searchInput: $("#searchInput"),
  clearSearch: $("#clearSearch"),
  refreshBtn: $("#refreshBtn"),
  categoryRow: $("#categoryRow"),

  specialsSection: $("#specialsSection"),
  specialsGrid: $("#specialsGrid"),
  menuTitle: $("#menuTitle"),
  countLabel: $("#countLabel"),
  menuList: $("#menuList"),
  emptyState: $("#emptyState"),
  emptyClearBtn: $("#emptyClearBtn"),

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
let searchTerm = "";

function normalizeBoolean(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  }
  return !!v;
}

function money(v) {
  if (v === null || v === undefined) return "";
  const num = Number(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return String(v);
  return `$${num.toFixed(num % 1 === 0 ? 0 : 2)}`;
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
    // force reflow so next startLoading animates
    void els.loadingBar.offsetWidth;
    els.loadingBar.style.transition = "width 250ms ease";
  }, 250);
}

function setBrand() {
  els.brandName.textContent = BRAND.name;
  els.brandTagline.textContent = BRAND.tagline;
  els.brandLogo.src = BRAND.logoPath;

  if (BRAND.accent) {
    document.documentElement.style.setProperty("--accent", BRAND.accent);
  }
}

function showStatus(text) {
  els.statusPill.textContent = text;
  els.statusPill.classList.remove("hidden");
  setTimeout(() => els.statusPill.classList.add("hidden"), 1400);
}

async function fetchMenu() {
  if (!SHEET_API_URL || SHEET_API_URL.includes("PASTE_")) {
    // Demo fallback so you can see UI without wiring sheet yet
    return [
      {
        id: "sp1",
        category: "Specials",
        name: "Solaris Signature Tacos",
        price: 12.99,
        description: "Three gourmet tacos with flame-grilled chicken, mango salsa, and avocado crema.",
        image: "./public/specials_tacos.png",
        featured: true,
        available: true,
        order: 1,
      },
      {
        id: "sp2",
        category: "Specials",
        name: "Tropical Smoothie Bowl",
        price: 9.5,
        description: "Pitaya and coconut base, topped with fresh dragon fruit, kiwi, and toasted coconut.",
        image: "./public/specials_smoothie.png",
        featured: true,
        available: true,
        order: 2,
      },
      {
        id: "m1",
        category: "Menu",
        name: "Chicken Tacos",
        price: 2.5,
        description: "Per taco.",
        image: "",
        featured: false,
        available: true,
        order: 3,
      },
      {
        id: "m2",
        category: "Menu",
        name: "Steak Tacos",
        price: 3.0,
        description: "Per taco.",
        image: "",
        featured: false,
        available: false,
        order: 4,
      },
    ];
  }

  const res = await fetch(SHEET_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menu");

  const json = await res.json();

  // Expecting rows -> objects with headers: id, category, name, price, description, image, featured, available, order
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

  // Keep Specials first if present
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
  btn.className =
    "shrink-0 rounded-2xl border px-3 py-2 text-sm font-semibold transition " +
    "active:scale-[0.99] " +
    "border-white/10 bg-white/5 text-white/80 hover:bg-white/10";
  btn.textContent = label;
  btn.dataset.cat = label;
  return btn;
}

function renderCategoryRow(categories) {
  els.categoryRow.innerHTML = "";
  categories.forEach((c) => {
    const b = pillButton(c);
    if (c === activeCategory) {
      b.style.background = "linear-gradient(90deg, var(--accent), var(--accent2))";
      b.style.borderColor = "transparent";
      b.style.color = "rgba(0,0,0,.92)";
    }
    b.addEventListener("click", () => {
      activeCategory = c;
      renderAll();
      // scroll to top of list area for quick browsing
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.categoryRow.appendChild(b);
  });
}

function matchSearch(item) {
  if (!searchTerm) return true;
  const s = searchTerm.toLowerCase();
  return (
    item.name.toLowerCase().includes(s) ||
    item.description.toLowerCase().includes(s) ||
    item.category.toLowerCase().includes(s)
  );
}

function matchCategory(item) {
  if (activeCategory === "All") return true;
  return item.category === activeCategory;
}

function visibleItems() {
  return rawItems
    .filter((i) => i.available)
    .filter(matchCategory)
    .filter(matchSearch)
    .sort((a, b) => a.order - b.order);
}

function featuredSpecials() {
  return rawItems
    .filter((i) => i.available)
    .filter((i) => i.featured || i.category.toLowerCase() === "specials")
    .filter(matchSearch)
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);
}

function cardSpecial(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "text-left rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 active:scale-[0.99] transition";
  btn.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold tracking-tight truncate">${escapeHtml(item.name)}</p>
        <p class="mt-1 text-xs text-white/60 line-clamp-2">${escapeHtml(item.description || "")}</p>
      </div>
      <div class="shrink-0 text-sm font-semibold">${escapeHtml(money(item.price))}</div>
    </div>
    <div class="mt-3 flex items-center gap-2">
      <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">Special</span>
      <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">Today</span>
    </div>
  `;
  btn.addEventListener("click", () => openModal(item, "Special"));
  return btn;
}

function rowItem(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "text-left rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 active:scale-[0.99] transition";
  btn.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold tracking-tight">${escapeHtml(item.name)}</p>
        ${item.description
      ? `<p class="mt-1 text-xs text-white/60 line-clamp-2">${escapeHtml(item.description)}</p>`
      : `<p class="mt-1 text-xs text-white/40">Tap for details</p>`
    }
      </div>
      <div class="shrink-0 text-sm font-semibold">${escapeHtml(money(item.price))}</div>
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
  specials.forEach((it) => els.specialsGrid.appendChild(cardSpecial(it)));
}

function renderList() {
  const list = visibleItems();

  els.menuList.innerHTML = "";
  list.forEach((it) => els.menuList.appendChild(rowItem(it)));

  const label = `${list.length} item${list.length === 1 ? "" : "s"}`;
  els.countLabel.textContent = label;

  const has = list.length > 0;
  els.emptyState.classList.toggle("hidden", has);
}

function renderAll() {
  // category tabs
  const categories = buildCategories(rawItems);
  if (!categories.includes(activeCategory)) activeCategory = "All";
  renderCategoryRow(categories);

  // headings
  els.menuTitle.textContent = activeCategory === "All" ? "Menu" : activeCategory;

  renderSpecials();
  renderList();
}

function renderSearchUI() {
  const has = !!searchTerm;
  els.clearSearch.classList.toggle("hidden", !has);
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

// Modal
let lastFocused = null;
function openModal(item, badgeText) {
  lastFocused = document.activeElement;

  els.modalTitle.textContent = item.name || "Item";
  els.modalCategory.textContent = item.category || "";
  els.modalPrice.textContent = money(item.price) || "";

  els.modalDesc.textContent = item.description || "Ask staff for details.";

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

  // focus close for accessibility
  els.modalClose.focus();

  els.modalCopyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(item.name || "");
      toast("Copied.");
    } catch {
      toast("Couldn’t copy. (Browser blocked)");
    }
  };

  els.modalDoneBtn.onclick = () => closeModal();
}

function closeModal() {
  els.modalOverlay.classList.add("hidden");
  els.modalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (lastFocused && typeof lastFocused.focus === "function") {
    lastFocused.focus();
  }
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 1200);
}

// Events
els.modalClose.addEventListener("click", closeModal);
els.modalOverlay.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.modalOverlay.classList.contains("hidden")) {
    closeModal();
  }
});

els.searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value.trim();
  renderSearchUI();
  renderAll();
});

els.clearSearch.addEventListener("click", () => {
  searchTerm = "";
  els.searchInput.value = "";
  renderSearchUI();
  renderAll();
});
els.emptyClearBtn.addEventListener("click", () => {
  searchTerm = "";
  els.searchInput.value = "";
  renderSearchUI();
  renderAll();
});

els.refreshBtn.addEventListener("click", async () => {
  await loadAndRender(true);
});

async function loadAndRender(isManual = false) {
  startLoading();
  try {
    const items = await fetchMenu();
    rawItems = items.filter((i) => i.name); // basic guard
    endLoading();
    renderAll();
    renderSearchUI();
    if (isManual) showStatus("Updated");
  } catch (err) {
    endLoading();
    showStatus("Offline");
    // Keep existing items if any; otherwise show a minimal fallback message.
    if (!rawItems.length) {
      rawItems = [];
      renderAll();
      toast("Couldn’t load menu.");
    }
  }
}

function init() {
  setBrand();
  loadAndRender(false);
}

init();
