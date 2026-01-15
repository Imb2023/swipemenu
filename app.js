// Specials-only, swipe deck UI (1–3 items) — premium presentation-first.

// 1) Paste your Apps Script Web App URL here:
// const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzPET2eH4tG62PKbR3G5xCBk0ZvgX_g8skVStCxUVztcCcwWQWkN_f1JK5iNmMJqNn1Cw/exec";
const SHEET_API_URL = "scrip url here";
// 2) Brand (tiny header only)
const BRAND = {
  name: "Instant Specials Menu",
  sub: "Swipe to view",
  logoPath: "/logo.png",
  accent: "#E2DB02", // optional
};

const $ = (s) => document.querySelector(s);

const els = {
  brandLogo: $("#brandLogo"),
  brandName: $("#brandName"),
  brandSub: $("#brandSub"),
  statusPill: $("#statusPill"),

  deck: $("#deck"),
  dots: $("#dots"),
  swipeHint: $("#swipeHint"),

  loadingBar: $("#loadingBar"),

  modalOverlay: $("#modalOverlay"),
  modalClose: $("#modalClose"),
  modalTitle: $("#modalTitle"),
  modalMeta: $("#modalMeta"),
  modalPrice: $("#modalPrice"),
  modalBadge: $("#modalBadge"),
  modalDesc: $("#modalDesc"),
  modalImageWrap: $("#modalImageWrap"),
  modalImage: $("#modalImage"),
  modalCopyBtn: $("#modalCopyBtn"),
  modalDoneBtn: $("#modalDoneBtn"),
  toast: $("#toast"),
};

let specials = [];
let activeIndex = 0;
let userInteracted = false;

function normalizeBoolean(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  }
  return !!v;
}

function safeText(v) {
  return (v ?? "").toString().trim();
}

function money(v) {
  if (v === null || v === undefined) return "";
  const num = Number(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return String(v);
  const decimals = num % 1 === 0 ? 0 : 2;
  return `$${num.toFixed(decimals)}`;
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

function startLoading() {
  els.loadingBar.style.width = "12%";
  els.loadingBar.style.transition = "width 250ms ease";
  requestAnimationFrame(() => (els.loadingBar.style.width = "70%"));
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

function showStatus(text) {
  els.statusPill.textContent = text;
  els.statusPill.classList.remove("hidden");
  setTimeout(() => els.statusPill.classList.add("hidden"), 1400);
}

function setBrand() {
  els.brandName.textContent = BRAND.name;
  els.brandSub.textContent = BRAND.sub;
  els.brandLogo.src = BRAND.logoPath;
  if (BRAND.accent) {
    document.documentElement.style.setProperty("--accent", BRAND.accent);
  }
}

async function fetchRows() {
  // Demo fallback
  if (!SHEET_API_URL || SHEET_API_URL.includes("PASTE_")) {
    return [
      {
        id: "SP1",
        category: "Special",
        name: "Menu + Discount",
        price: 100.00,
        description: "First 100 customers Limited time.",
        image: "/menuitem1.jpg",
        featured: true,
        available: true,
        order: 1,
      },
      {
        id: "SP2",
        category: "Special",
        name: "Instant Specials Menu",
        price: 150.00,
        description: "You own it and can change it instantly.",
        image: "/menuitem2.jpg",
        featured: true,
        available: true,
        order: 2,
      },
       {
        id: "SP3",
        category: "Special",
        name: "Instant Specials Menu",
        price: 150.00,
        description: "You own it and can change it instantly.",
        image: "/menuitem4.jpg",
        featured: true,
        available: true,
        order: 2,
      },
    ];
  }

  const res = await fetch(SHEET_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load");
  const json = await res.json();

  return json.map((r) => ({
    id: safeText(r.id),
    category: safeText(r.category) || "Specials",
    name: safeText(r.name),
    price: safeText(r.price),
    description: safeText(r.description),
    image: safeText(r.image),
    featured: normalizeBoolean(r.featured),
    available: normalizeBoolean(r.available),
    order: Number(r.order) || 9999,
  }));
}

function pickSpecials(rows) {
  // Specials-only logic:
  // - show available items
  // - prefer featured OR category == "Specials"
  // - hard cap at 3 to match expectation
  const filtered = rows
    .filter((r) => r.available)
    .filter(
      (r) => r.featured || (r.category || "").toLowerCase() === "specials"
    )
    .sort((a, b) => a.order - b.order);

  return filtered.slice(0, 3);
}

function renderDots(count) {
  els.dots.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className =
      "h-2.5 w-2.5 rounded-full border border-white/20 transition";
    dot.style.background = i === activeIndex ? "white" : "transparent";
    dot.style.opacity = i === activeIndex ? "0.9" : "0.45";
    dot.addEventListener("click", () => {
      userInteracted = true;
      hideSwipeHint();
      scrollToIndex(i);
    });
    els.dots.appendChild(dot);
  }
}

function hideSwipeHint() {
  if (!els.swipeHint) return;
  els.swipeHint.style.display = "none";
}

function scrollToIndex(i) {
  const card = els.deck.querySelector(`[data-index="${i}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cardHtml(item, index) {
  // Full-screen “slide” card.
  // Optional image: if provided, becomes background hero.
  const hasImg = !!item.image;
  const price = money(item.price);

  const bg = hasImg
    ? `background-image: linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,.18)), url('${item.image}');`
    : `background-image: radial-gradient(900px 500px at 50% 10%, rgba(255,255,255,.08), transparent 55%),
       linear-gradient(135deg, rgba(249,115,22,.20), rgba(255,255,255,.06));`;

  return `
  <section
    class="snap-start h-[calc(100dvh-56px)] px-4 pt-6 pb-24 safe-bottom flex"
    data-index="${index}"
  >
    <div
      class="w-full rounded-[28px] border border-white/10 overflow-hidden shadow-2xl"
      style="${bg} background-size: cover; background-position: center;"
    >
      <div class="h-full w-full p-5 flex flex-col justify-between">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[11px] px-2 py-1 rounded-full bg-black/35 border border-white/10 text-white/80">
            TODAY • SPECIAL ${index + 1}/${specials.length}
          </span>

          <button
            type="button"
            class="rounded-2xl bg-black/35 border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-black/45 active:scale-[0.99]"
            data-open="${escapeHtml(item.id)}"
          >
            Details
          </button>
        </div>

        <div class="mt-6">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight">
            ${escapeHtml(item.name)}
          </h2>

          <div class="mt-3 flex items-baseline justify-between gap-3">
            <p class="text-xl font-semibold">${escapeHtml(price)}</p>
            <span class="text-xs text-white/75">
              Ask cashier to order
            </span>
          </div>

          ${
            item.description
              ? `<p class="mt-3 text-sm text-white/80 leading-relaxed max-w-[38ch]">
                  ${escapeHtml(item.description)}
                </p>`
              : `<p class="mt-3 text-sm text-white/70 max-w-[38ch]">
                  Limited time today.
                </p>`
          }
        </div>

        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="w-full rounded-2xl px-4 py-3 text-sm font-semibold active:scale-[0.99]"
            style="background: linear-gradient(90deg, var(--accent), var(--accent2)); color: rgba(0,0,0,.92);"
            data-copy="${escapeHtml(item.id)}"
          >
            Copy item name
          </button>
        </div>
      </div>
    </div>
  </section>
  `;
}

function renderDeck() {
  els.deck.innerHTML = specials.map(cardHtml).join("");

  // bind buttons
  els.deck.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      userInteracted = true;
      hideSwipeHint();
      const id = btn.getAttribute("data-open");
      const item = specials.find((s) => s.id === id);
      if (item) openModal(item);
    });
  });

  els.deck.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      userInteracted = true;
      hideSwipeHint();
      const id = btn.getAttribute("data-copy");
      const item = specials.find((s) => s.id === id);
      if (!item) return;
      try {
        await navigator.clipboard.writeText(item.name || "");
        toast("Copied.");
      } catch {
        toast("Copy blocked by browser.");
      }
    });
  });

  // dots
  renderDots(specials.length);

  // observe active slide
  const cards = els.deck.querySelectorAll("[data-index]");
  const obs = new IntersectionObserver(
    (entries) => {
      // Pick the most visible entry
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      const i = Number(visible.target.getAttribute("data-index"));
      if (Number.isFinite(i) && i !== activeIndex) {
        activeIndex = i;
        renderDots(specials.length);
      }
    },
    { root: els.deck, threshold: [0.55, 0.7, 0.85] }
  );

  cards.forEach((c) => obs.observe(c));

  // hide swipe hint after first scroll
  els.deck.addEventListener(
    "scroll",
    () => {
      if (!userInteracted) {
        userInteracted = true;
        hideSwipeHint();
      }
    },
    { passive: true }
  );

  // if only 1 item, hide hint + dots
  if (specials.length <= 1) {
    hideSwipeHint();
    els.dots.parentElement?.classList?.add("hidden");
  } else {
    els.dots.parentElement?.classList?.remove("hidden");
  }
}

// Modal
let lastFocused = null;

function openModal(item) {
  lastFocused = document.activeElement;

  els.modalTitle.textContent = item.name || "Special";
  els.modalMeta.textContent = "Today’s Special";
  els.modalPrice.textContent = money(item.price) || "";
  els.modalBadge.textContent = "Limited";
  els.modalDesc.textContent = item.description || "Send us a message on FaceBook.";

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

  els.modalCopyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(item.name || "");
      toast("Copied.");
    } catch {
      toast("Copy blocked by browser.");
    }
  };
  els.modalDoneBtn.onclick = closeModal;

  els.modalClose.focus();
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
  setTimeout(() => els.toast.classList.add("hidden"), 1200);
}

// Events
els.modalClose.addEventListener("click", closeModal);
els.modalOverlay.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.modalOverlay.classList.contains("hidden")) closeModal();
});

async function load() {
  startLoading();
  try {
    const rows = await fetchRows();
    specials = pickSpecials(rows);

    endLoading();

    if (!specials.length) {
      // graceful empty state (still premium)
      els.deck.innerHTML = `
        <section class="h-[calc(100dvh-56px)] px-4 pt-6 pb-24 safe-bottom flex items-center">
          <div class="w-full rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p class="text-sm font-semibold">No specials posted yet.</p>
            <p class="mt-2 text-sm text-white/60">Please check back soon.</p>
          </div>
        </section>
      `;
      hideSwipeHint();
      els.dots.parentElement?.classList?.add("hidden");
      return;
    }

    renderDeck();
    showStatus("Updated");
  } catch {
    endLoading();
    showStatus("Offline");
  }
}

function init() {
  setBrand();
  load();
}

init();
