
// 1) Paste your Apps Script Web App URL here:
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzPET2eH4tG62PKbR3G5xCBk0ZvgX_g8skVStCxUVztcCcwWQWkN_f1JK5iNmMJqNn1Cw/exec";
// const SHEET_API_URL = "";
// 2) Brand (tiny header only)
const BRAND = {
  name: "Instant Specials Menu",
  sub: "Something good, just for today.",
  logoPath: "logo.png",
  accent: "#f4bd72", // Warm amber
  accent2: "#f8d7a6",
};

const $ = (s) => document.querySelector(s);
const els = Object.fromEntries([
  "brandLogo", "brandName", "brandSub", "statusPill", "deck", "dots", "swipeHint",
  "loadingBar", "modalOverlay", "modalClose", "modalTitle", "modalMeta", "modalPrice",
  "modalBadge", "modalDesc", "modalImageWrap", "modalImage",
  "modalDoneBtn", "refreshBtn", "toast", "menuNav", "prevBtn", "nextBtn", "appShell"
].map((id) => [id, $("#" + id)]));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let specials = [];
let activeIndex = 0;
let observer;
let loading = false;
let lastFocused;
let toastTimer;
let modalAnimation;
const MENU_CACHE_KEY = "specials-menu:last-good-v1";

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
  if (v === null || v === undefined || String(v).trim() === "") return "";
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

async function fetchRows() {
  // Demo fallback
  if (!SHEET_API_URL || SHEET_API_URL.includes("PASTE_")) {
    return [
      {
        id: "SP1",
        category: "Special",
        name: "Menu + Discount",
        price: 100.00,
        description: "First 100 customers (limit to first 100 ONLY).",
        image: "2.png",
        featured: true,
        available: true,
        order: 1,
      },
      {
        id: "SP2",
        category: "Special",
        name: "Instant Specials Menu",
        price: 150.00,
        description: "You own it 100% and can change it instantly.",
        image: "1.png",
        featured: true,
        available: true,
        order: 2,
      },
      {
        id: "SP3",
        category: "Special",
        name: "mini-signage",
        price: 250.00,
        description: "stand alone digital signage.",
        image: "3.png",
        featured: true,
        available: true,
        order: 2,
      },
    ];
  }

  const res = await fetch(SHEET_API_URL, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("Failed to load");
  const json = await res.json();

  if (!Array.isArray(json)) throw new Error("Invalid menu response");
  return json.filter((r) => r && typeof r === "object" && safeText(r.name)).map((r) => ({
    id: safeText(r.id),
    category: safeText(r.category) || "Specials",
    name: safeText(r.name),
    price: safeText(r.price),
    description: safeText(r.description),
    image: safeText(r.image),
    video: safeText(r.video),
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

// Sheet cells are data: allow web/local image URLs, never executable schemes.
function safeImageUrl(value) {
  const text = safeText(value);
  if (!text) return "";
  try {
    const url = new URL(text, document.baseURI);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

function setBrand() {
  els.brandName.textContent = BRAND.name;
  els.brandSub.textContent = BRAND.sub;
  els.brandLogo.src = BRAND.logoPath;
  document.documentElement.style.setProperty('--accent', BRAND.accent);
  document.documentElement.style.setProperty('--accent2', BRAND.accent2);
}

function showStatus(text) { els.statusPill.textContent = text; }
function toast(text) {
  clearTimeout(toastTimer);
  els.toast.textContent = text;
  els.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 4000);
}
function updateNavigation() {
  els.dots.querySelectorAll('button').forEach((button, i) => {
    button.setAttribute('aria-current', String(i === activeIndex));
  });
  els.prevBtn.disabled = activeIndex === 0;
  els.nextBtn.disabled = activeIndex >= specials.length - 1;
}
function renderDots(count) {
  els.dots.replaceChildren();
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show special ${i + 1}: ${specials[i].name}`);
    dot.onclick = () => scrollToIndex(i);
    els.dots.append(dot);
  }
  els.menuNav.hidden = count <= 1;
  updateNavigation();
}
function scrollToIndex(index) {
  const i = Math.max(0, Math.min(index, specials.length - 1));
  const card = els.deck.querySelector(`[data-index="${i}"]`);
  if (!card) return;
  // Scroll only the carousel, leaving the page and header in place.
  els.deck.scrollTo({top: card.offsetTop - els.deck.offsetTop, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}
function safeVideoUrl(value) {
  const url = safeImageUrl(value);
  if (!url) return '';
  const parsed = new URL(url);
  return (parsed.protocol === 'https:' || parsed.origin === location.origin) && /\.(mp4|webm)$/i.test(parsed.pathname) ? url : '';
}
function stopVideos(except) {
  els.deck.querySelectorAll('video').forEach(video => {
    if (video === except) return;
    video.onerror = null;
    video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
    const button = video.parentElement.querySelector('[data-play]');
    if (button) button.hidden = false;
  });
}
function cardHtml(item, index) {
  return `<section class="slide" data-index="${index}" role="group" aria-roledescription="slide" aria-label="${index + 1} of ${specials.length}">
    <div class="special-card">
      <div class="card-art">${safeVideoUrl(item.video) ? `<button class="button play-button" type="button" data-play aria-label="Play short clip for ${escapeHtml(item.name)}"><span aria-hidden="true">▶</span> Play clip</button>` : ''}<span class="card-number">${String(index + 1).padStart(2, '0')} / ${String(specials.length).padStart(2, '0')}</span></div>
      <div class="card-content">
        <p class="eyebrow">${escapeHtml(item.category || 'TODAY’S PICK')}</p>
        <h2>${escapeHtml(item.name || 'Today’s special')}</h2>
        <p class="card-description">${escapeHtml(item.description || 'A little something worth discovering. Ask us for the details.')}</p>
        <p class="price">${escapeHtml(money(item.price))}</p>
        <div class="card-footer">
          <button class="button primary" type="button" data-open="${escapeHtml(item.id)}" aria-label="View details for ${escapeHtml(item.name)}">View special <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19 19 5M5 5h14v14"/></svg></button>
        </div>
        <p class="card-note">Like this special? Ask your server.</p>
      </div>
    </div>
  </section>`;
}
function renderDeck() {
  observer?.disconnect();
  stopVideos();
  activeIndex = Math.min(activeIndex, Math.max(0, specials.length - 1));
  els.deck.innerHTML = specials.map(cardHtml).join('');
  els.deck.querySelectorAll('[data-index]').forEach((card, index) => {
    const hero = card.querySelector('.card-art');
    const imageUrl = safeImageUrl(specials[index].image);
    const fallback = 'radial-gradient(ellipse at 20% 20%, #a1976288, transparent 70%), linear-gradient(135deg, #444d32, #22291c)';
    hero.style.backgroundImage = imageUrl ? `url("${CSS.escape(imageUrl)}"), ${fallback}` : fallback;
    // Index-based bindings also support Sheets with duplicate or blank IDs.
    card.querySelector('[data-open]').onclick = () => openModal(specials[index]);
    const play = card.querySelector('[data-play]');
    if (play) {
      const clip = document.createElement('video');
      clip.hidden = true; clip.controls = true; clip.muted = true; clip.playsInline = true; clip.preload = 'none';
      clip.setAttribute('aria-label', `Short clip: ${specials[index].name}`);
      if (imageUrl) clip.poster = imageUrl;
      hero.append(clip);
      play.onclick = async () => {
        stopVideos(clip);
        clip.src = safeVideoUrl(specials[index].video);
        clip.hidden = false; play.hidden = true;
        clip.onerror = () => {stopVideos(); toast('This clip is unavailable. Ask your server about the special.');};
        try {await clip.play();} catch {stopVideos(); toast('Couldn’t play this clip. The offer is still available below.');}
      };
    }
  });
  renderDots(specials.length);
  const selected = els.deck.querySelector(`[data-index="${activeIndex}"]`);
  if (selected) els.deck.scrollTop = selected.offsetTop - els.deck.offsetTop;
  observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible && visible.intersectionRatio >= .55) {
      const nextIndex = Number(visible.target.dataset.index);
      if (nextIndex !== activeIndex) stopVideos();
      activeIndex = nextIndex;
      updateNavigation();
    }
  }, {root: els.deck, threshold: [.55, .75]});
  els.deck.querySelectorAll('[data-index]').forEach(card => observer.observe(card));
}
function showState(title, message, retry = false) {
  observer?.disconnect();
  els.menuNav.hidden = true;
  els.deck.innerHTML = `<section class="state-card"><span class="eyebrow">TODAY’S SPECIALS</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>${retry ? '<button class="button primary" id="retryBtn" type="button">Try again</button>' : ''}</section>`;
  $('#retryBtn')?.addEventListener('click', load);
}
function openModal(item) {
  stopVideos();
  const alreadyOpen = !els.modalOverlay.classList.contains('hidden');
  if (!alreadyOpen) lastFocused = document.activeElement;
  els.modalTitle.textContent = item.name || 'Today’s special';
  els.modalMeta.textContent = item.category || 'TODAY’S SPECIAL';
  els.modalPrice.textContent = money(item.price);
  els.modalBadge.textContent = 'Today’s pick';
  els.modalDesc.textContent = item.description || 'Ask your server to find out more about this special.';
  const imageUrl = safeImageUrl(item.image);
  els.modalImageWrap.classList.toggle('hidden', !imageUrl);
  if (imageUrl) {
    els.modalImage.src = imageUrl;
    els.modalImage.alt = item.name || 'Special';
  } else { els.modalImage.removeAttribute('src'); }
  els.modalImage.onerror = () => els.modalImageWrap.classList.add('hidden');
  els.modalOverlay.classList.remove('hidden');
  els.modalOverlay.setAttribute('aria-hidden', 'false');
  els.appShell.inert = true;
  document.body.style.overflow = 'hidden';
  modalAnimation?.cancel();
  if (!alreadyOpen && !reducedMotion.matches) {
    modalAnimation = $('.sheet').animate([{opacity:0, transform:'translateY(20px)'}, {opacity:1, transform:'translateY(0)'}], {duration:220, easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  els.modalClose.focus({preventScroll:true});
}
function closeModal() {
  modalAnimation?.cancel();
  els.appShell.inert = false;
  if (lastFocused?.isConnected) lastFocused.focus({preventScroll:true});
  els.modalOverlay.classList.add('hidden');
  els.modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
async function load() {
  if (loading) return;
  loading = true;
  els.refreshBtn.disabled = true;
  els.refreshBtn.classList.add('is-loading');
  els.deck.setAttribute('aria-busy', 'true');
  els.loadingBar.style.width = '60%';
  showStatus('Checking today’s specials…');
  try {
    const rows = await fetchRows();
    specials = pickSpecials(rows);
    try { localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({rows, savedAt:Date.now()})); } catch {}
    if (specials.length) renderDeck();
    else showState('Good things are on the way.', 'There are no specials right now. Check back a little later.');
    showStatus('Up to date · Fresh from our menu');
  } catch {
    if (!specials.length) {
      try {
        const saved = JSON.parse(localStorage.getItem(MENU_CACHE_KEY));
        if (Array.isArray(saved?.rows) && Date.now() - saved.savedAt < 86400000) {
          specials = pickSpecials(saved.rows);
          if (specials.length) renderDeck();
        }
      } catch {}
    }
    if (specials.length) showStatus('Saved menu · Couldn’t refresh. Availability may have changed.');
    else {
      showState('Let’s try that again.', 'We couldn’t reach the menu. Check your connection and try again.', true);
      showStatus('Menu unavailable');
    }
  } finally {
    loading = false;
    els.refreshBtn.disabled = false;
    els.refreshBtn.classList.remove('is-loading');
    els.deck.setAttribute('aria-busy', 'false');
    els.loadingBar.style.width = '0';
  }
}
els.refreshBtn.onclick = load;
els.modalClose.onclick = closeModal;
els.modalDoneBtn.onclick = closeModal;
els.modalOverlay.onclick = event => {if (event.target.dataset.close) closeModal();};
els.prevBtn.onclick = () => scrollToIndex(activeIndex - 1);
els.nextBtn.onclick = () => scrollToIndex(activeIndex + 1);
els.deck.onkeydown = event => {
  if (event.target !== els.deck || !specials.length) return;
  if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
    event.preventDefault();
    scrollToIndex(event.key === 'Home' ? 0 : event.key === 'End' ? specials.length - 1 : activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
  }
};
document.addEventListener('keydown', event => {
  if (els.modalOverlay.classList.contains('hidden')) return;
  if (event.key === 'Escape') {event.preventDefault(); closeModal();}
  if (event.key === 'Tab') {
    const buttons = [...els.modalOverlay.querySelectorAll('button')].filter(button => !button.disabled);
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
  }
});
document.addEventListener('visibilitychange', () => {if (document.hidden) stopVideos();});
setBrand();
load();
