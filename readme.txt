Instant Specials Menu — deployment and maintenance
==================================================

Google Sheets remains the source of menu content. The customer interface is static and starts with a published snapshot;
a Vercel serverless endpoint refreshes and caches the Sheet data. No database or
CSS CDN is required. The optional staff uploader has a separate signing function. Node 20+ packages the public
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

The public site URL is https://swipemenu.vercel.app/ (site.config.json).
For a custom domain, update site.config.json or set SITE_URL in Vercel to your public HTTPS address (for
example https://your-menu-domain.com), then redeploy. Otherwise site.config.json is used, followed by
VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL when available. These values
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
The existing Apps Script Web App URL is set in menu.config.json as sheetUrl. To replace
it, deploy your Apps Script as a Web App with visitor read access and return a
JSON array with columns:
  id, category, name, price, description, image, featured, available, order
Optional video column: a direct MP4/WebM clip URL. Your Apps Script JSON must
include this column for videos to appear. No video column is needed for photos.
No Google credential belongs in the public app. Verify it works while signed out.
The app shows up to three available rows with category Special or Specials,
sorted by numeric order. Featured alone no longer publishes a row from another
category. This prevents unrelated Menu/test rows from appearing among specials. Rows without a name are ignored; blank prices stay blank.
Use direct HTTPS image-file URLs, not a gallery/webpage URL such as imgur.com/gallery.
Relative paths such as 1.png work too. Unsafe URL schemes and HTML injection are
rejected. An unavailable image leaves the decorative fallback background.

Brand configuration
-------------------
Edit BRAND in app.js for the name, subtitle, colors, and logo path. The menu is a viewer: customers ask their server to order. Existing PNG icons and favicon files are included at the site root.
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
There is no ordering/messaging action, purchase, or analytics submission.
Optional video is never fetched until a customer taps Play; it pauses and releases
its source when the customer navigates away. Posters remain visible without video.

Checks
------
  npm test
  python3 tests/image_urls.py
  python3 tests/menu_ui.py
  python3 tests/production_browser.py
  python3 tests/staff_uploads.py
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
Google. Confirm live specials, direct images, refresh, details, and the ask-your-server guidance. Verify deployed headers and sharing metadata, then check
install/offline behavior on the target phone. The viewer does not send messages. Deployment/domain settings and live image rights are
owned by the site operator; local tests cannot establish them.


Simple uploads — no media service account required
-------------------------------------------------
Attach a photo in chat for optimization and adding to media/, or upload a small
WebP/JPEG/PNG there through GitHub. The build includes supported files from media/
automatically. After Vercel deploys the commit, paste the public link into your
Sheet. First photo:
  https://swipemenu.vercel.app/media/don-pedro.webp
Relative media/don-pedro.webp also works in the image column. This preserves
Google Sheets editing and requires no Cloudinary account or API credentials.

Optional staff uploader — Cloudinary setup
-----------------------------------------
Create your own account at https://cloudinary.com/users/register_free and review
its current free-plan commercial terms/quotas. Visit /upload-setup.html for the
complete owner checklist. Create a SIGNED upload preset with the allowed photo
and clip formats and a 10 MB server-enforced maximum file size. Do not create an
unsigned public upload preset. In Vercel project environment variables set:
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  CLOUDINARY_UPLOAD_PRESET
  STAFF_UPLOAD_PASSWORD (unique random password, at least 24 characters)
Never put the secret or staff password in the Sheet, source files, or chat.
Redeploy after changing server configuration. The helper is /upload.html; staff
enter the password, upload, copy the resulting link, and paste it into the image
or video cell. Video uploads also return a lightweight image poster link.
The helper does not write to the Sheet. Automatic row updates would require an
authenticated Apps Script write endpoint, which this repository does not contain.
Client photo processing produces a WebP at up to 1200px; videos are limited to
15 seconds/10 MB on the client. Account format/file-size restrictions belong in
the signed preset too. Configure Cloudinary usage alerts and appropriate shared
rate limits at your host; the function's per-instance throttle is best-effort.
Uploads are public; deleting unused files is done in the Cloudinary media library.

A Python static server can preview the helper page but does not run /api routes.
The signing endpoint runs on Vercel. Local browser tests use controlled responses;
no Cloudinary upload has been verified without a configured account.
Vercel Hobby is intended for personal, non-commercial use. For restaurant use,
choose a commercial-permitted hosting plan. Cloudinary free quotas and hosting
plan eligibility are separate; do not assume this setup is unlimited or free on
every commercial hosting plan.


Photo-first release and cached menu delivery
-------------------------------------------
Customers see name, price, ingredients/description, and ask-your-server guidance
on the first screen. Details is optional. The first photo is an eager high-priority
image with explicit dimensions; later photos are lazy. Videos remain opt-in.
The initial menu is in menu.snapshot.json, fetched from the real Sheet at release.
The build generates menu-data.js from that snapshot. It renders before /api/menu
returns. The API fetches Apps Script on the server, coalesces concurrent requests,
and caches successful responses on Vercel's CDN for 60 seconds with background
revalidation. Failed fetches return the last in-instance/snapshot data, labeled
saved. A successful empty response withdraws all specials. Old content is not
claimed to be current; guests are asked to confirm availability with their server.
Sheet edits need no redeploy, but can take about a minute plus source fetch time
to appear. The initial deployment snapshot remains until a fresh background response
arrives; update it for major menu changes using npm run sync-menu, then build/commit.
If your local Node requires the cloud proxy: NODE_USE_ENV_PROXY=1 npm run sync-menu.
Keep TLS verification enabled. No Google secret is needed for this public read API.
A static Python server only previews the snapshot; it cannot run the live API.
Additional checks: node --test tests/menu.test.mjs; python3 tests/fast_menu.py.
The latter deliberately holds the API request open to verify the first offer and
price are usable before it responds. It also verifies an empty update removes the
offer. This is a functional check, not a measured mobile-network speed score.
