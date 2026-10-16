# =========================
# FILE: README.txt (quick setup)
# =========================

1) Put these files on hosting (Cloudflare Pages / Vercel / GitHub Pages):
   - index.html
   - app.js
   - sw.js
   - manifest.json
   - /public/logo.png
   - /public/favicon.ico
   - /public/icon-192.png
   - /public/icon-512.png

2) Open app.js and set:
   const SHEET_API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";

3) Brand:
   - Change BRAND.name, BRAND.tagline, BRAND.logoPath
   - Optional: BRAND.accent = "#F9C416"

4) In your Google Sheet, columns must match:
   id, category, name, price, description, image, featured, available, order

5) Use image URLs if you want images (optional).
   If blank, the UI stays clean and fast.


Local development
-----------------
Run: python3 -m http.server 8000 --directory /workspace/swipemenu
The app uses local styles.css; no CSS CDN, package install, or build is required.
Deploy styles.css with index.html, app.js, sw.js, manifest.json, and the image files.
Keep the existing Google Apps Script URL and Sheet columns described above.

Interface and accessibility
---------------------------
Swipe/scroll the specials, use the previous/next buttons, or focus the carousel
and use Arrow Up/Down, Home, and End. Details contain the complete description.
The details dialog supports Escape, focus containment, and focus restoration.
Motion, transparency, and contrast follow system accessibility preferences.
A successful menu response is saved on this device for up to 24 hours. When
refresh fails, the saved menu is labeled explicitly; availability may have changed.
No ordering messages are sent automatically.

Browser regression checks (Python Playwright and Chromium required):
  python3 tests/image_urls.py
  python3 tests/menu_ui.py
Tests use fixture Sheet responses, not live data or real messaging actions.
