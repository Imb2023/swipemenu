Instant Specials Menu — deployment and maintenance
==================================================

Google Sheets remains the source of menu content. The app is static; no database,
backend server, paid package, or CSS CDN is required. Node 20+ packages the public
files for deployment without installing runtime dependencies.

Deploy to Vercel
----------------
Connect Imb2023/swipemenu, production branch main, with repository root as the
Root Directory. vercel.json configures build command "npm run build", output
"dist", security headers, and fresh HTML/service worker responses automatically.
Do not select a framework preset or manually deploy the whole source checkout.
Push/merge to main to trigger a Git-connected deployment. A manual deployment is:
  npx vercel --prod
Run that from the repository root, where vercel.json is located.

For a custom domain, set SITE_URL in Vercel to your public HTTPS address (for
example https://your-menu-domain.com), then redeploy. Otherwise the build uses
VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL when Vercel provides it. These values
generate canonical/social URLs and sitemap.xml. With no address the local build
keeps relative sharing-image links and omits canonical/sitemap output.

Preview and portable deployment
-------------------------------
  npm run build
  python3 -m http.server 8000 --directory dist
For another static host, upload the contents of dist. vercel.json headers apply
only on Vercel; configure equivalent headers on another host. Source files in
.agents, tests, and scripts are intentionally excluded from the public bundle.

Sheet configuration
-------------------
The existing Apps Script Web App URL is set in app.js as SHEET_API_URL. To replace
it, deploy your Apps Script as a Web App with visitor read access and return a
JSON array with columns:
  id, category, name, price, description, image, featured, available, order
No Google credential belongs in the public app. Verify it works while signed out.
The app shows up to three available rows that are featured or category Specials,
sorted by numeric order. Rows without a name are ignored; blank prices stay blank.
Use direct HTTPS image-file URLs, not a gallery/webpage URL such as imgur.com/gallery.
Relative paths such as 1.png work too. Unsafe URL schemes and HTML injection are
rejected. An unavailable image leaves the decorative fallback background.

Brand configuration
-------------------
Edit BRAND in app.js for the name, subtitle, colors, logo path, and Messenger
order link. Existing PNG icons and favicon files are included at the site root.
The manifest declares the verified 192px/512px icons plus mobile/desktop screenshots.
The sharing card is assets/social-preview.png (1200x630), with metadata in index.html.
Update metadata/card as well if rebranding. The sharing card avoids prices so it
stays valid when specials change. Screenshots are illustrative snapshots of Sheet
content and do not update automatically when you edit the Sheet.

Interaction and offline behavior
--------------------------------
Swipe/scroll or use the navigation buttons. Focus the carousel and use Arrow
Up/Down, Home, End. Details support Escape, focus containment/restoration, and
reduced-motion preferences. Transparency/contrast preferences are supported.
Successful Sheet data is stored on-device for up to 24 hours. A failed refresh
labels saved data clearly; customers should confirm current availability.
The service worker caches the app shell. Every build derives a new cache name
from its contents. It does not cache third-party images or intercept order links.
There is no automatic ordering message, purchase, or analytics submission.

Checks
------
  npm test
  python3 tests/image_urls.py
  python3 tests/menu_ui.py
  python3 tests/production_browser.py
The Node checks build and verify public assets, metadata, and output isolation.
Python checks require Playwright and Chromium; production_browser.py tests dist
with Vercel's security headers, including offline restoration. Browser test data
is controlled; these checks do not establish live Sheets or deployment health.

Regenerating graphical assets (optional)
----------------------------------------
  python3 scripts/generate-assets.py
Requires Python Playwright + Chromium and read access to the configured Sheet.
The script fetches a Sheet snapshot with verified TLS, then renders screenshots
and the branded sharing card. This intentionally does not claim an end-to-end
browser API test. Existing source icons are retained rather than altered.

Before calling a release live
----------------------------
Open the real public HTTPS site in a fresh/private browser while signed out of
Google. Confirm live specials, direct images, refresh, details, and the correct
Messenger destination. Verify deployed headers and sharing metadata, then check
install/offline behavior on the target phone. No messages need to be sent merely
to verify the destination. Deployment/domain settings and live image rights are
owned by the site operator; local tests cannot establish them.
