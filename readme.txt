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
   - Optional: BRAND.accent = "#164BF9"

4) In your Google Sheet, columns must match:
   id, category, name, price, description, image, featured, available, order

5) Use image URLs if you want images (optional).
   If blank, the UI stays clean and fast.
