# SwipeMenu — a simple specials viewer for your restaurant

Show a few specials on a guest’s phone: **photo, name, price, description, and “Ask your server.”** Guests can swipe to browse. Staff take the order as usual.

**This is a companion to your main menu.** There is no checkout, ordering account, or payment collection.

- [See the working example](https://swipemenu.vercel.app/)
- [Compare three designs](https://swipemenu.vercel.app/demos.html)
- [Watch the captioned setup guide](https://swipemenu.vercel.app/guide.html)

The links above belong to this example restaurant setup. **Your restaurant needs its own copy, Sheet, and website address.** Demo food, photos, and prices are examples, not offers to copy into your live menu without checking them.

## Quick package builder — IsmaSigns Specials

[Open the setup wizard](https://swipemenu.vercel.app/setup.html). Enter a normal Google Sheet link, restaurant name, accent color, and currency symbol. The wizard checks the Sheet and downloads your personalized ZIP. No Apps Script or Cloudinary is needed for this route. Use a dedicated menu-only Sheet shared as **Anyone with the link → Viewer**; all workbook contents become readable. The existing column format still applies.

Unzip and upload the package contents to your own GitHub repository, then import it into Vercel with build `npm run build` and output `dist`. Instructions are inside `START-HERE.md`. This creates a website package, not a Flutter/mobile binary. GitHub/hosting registration and deployment are separate owner steps. Only the Sheet link is sent to this site to check access; your branding and ZIP are assembled in your browser without saving a customer account.

## Business examples and weekdays

[Restaurant](https://swipemenu.vercel.app/demos.html?business=restaurant) · [Barber shop](https://swipemenu.vercel.app/demos.html?business=barber) · [Dental practice](https://swipemenu.vercel.app/demos.html?business=dentist)

Each example has Focus, Quick list, and Spotlight designs. The barber and dental examples include a five-day sample offer board: choose **Full week** or a weekday. Download the matching template, replace the sample prices and services, then generate a package with that business type. The package changes the contact instructions to a barber or front desk.

**Weekday labels are descriptive, not automatic scheduling.** Staff set `available` to `TRUE` for the offers they want live that day and `FALSE` for the rest. The live app still shows a maximum of three offers. Dental practices should confirm the actual services, eligibility, and pricing before publishing an offer.

Business gallery checks: `python3 tests/business_demos.py` after `npm run build` verifies weekday filtering, business links, safe templates, and small/mobile/desktop layouts.

### If Vercel still shows an old version

1. Vercel → project → Settings → Git: verify the connected repository is your intended copy (this example uses `Imb2023/swipemenu`) and Production Branch is `main`.
2. Deployments: confirm a new deployment exists for your latest commit and says **Ready**. For failures, open its Build Logs; a successful Docker workflow does not deploy Vercel.
3. Use `npm run build`, output `dist`, framework **Other**. Make sure the project's Node runtime is **24.x**, and the `swipemenu.vercel.app` domain belongs to this production project.
4. Redeploy the latest `main` commit if it was missed. Rebuilding an older deployment can keep old code; check its commit. After it is Ready, reopen `/demos.html` and refresh once. An existing installed/offline view can show saved content until it reconnects.

`/version.json` identifies this release as `weekday-business-demos-1`; Vercel builds also include their commit ID. This is a way to verify the deployed files instead of guessing from a cached screen. Changing browser cache cannot publish a missing deployment.

## Start here

| Who | What they do | How often |
| --- | --- | --- |
| Owner or technical helper | Connect the Sheet and deploy the website | Once, then when changing hosting or branding |
| Restaurant staff | Edit prices, descriptions, and availability in the Sheet | Whenever specials change |
| Guest | Scan a QR code, browse, and ask their server | No account or app installation |

**Why this setup?** Sheets is familiar to staff. Small local photos keep the site lightweight. A saved menu appears while the site checks for changes, so guests do not wait on Google before seeing an offer.

## What you need

- Permission to use this code and your chosen photos. See **Reuse and licensing** below.
- A Google account for a dedicated menu spreadsheet.
- A GitHub account for your restaurant’s copy of the project.
- A hosting account that permits commercial restaurant use. The included configuration targets Vercel.
- For the one-time setup, a computer with **Git and Node.js 24**, or a technical helper who can run the commands below.

**Cost note:** Google and media services have quotas. Vercel Hobby is intended for personal, non-commercial use; an operating restaurant needs a commercial-permitted hosting plan. Another host must support both static files and the Node API, or someone must adapt the API. Uploading `dist/` alone does not provide live Sheet updates. Do not assume “public repository” means every hosting plan is free for commercial use.

## Run or share with Docker

Docker support is included in this repository **and every ZIP from IsmaSigns Specials**. It serves both the website and live Sheet API, so it does not depend on Vercel.

From an unzipped restaurant package or this repository:

```bash
docker compose up --build -d
```

Open **http://localhost:3000**. Stop it with `docker compose down`. The container runs as a non-root user with a read-only filesystem. Compose binds to localhost; for a public launch, use your own host and an HTTPS reverse proxy. Configure your restaurant through the package builder before sharing its image. The repository image includes the example app and builder, not another customer's customization.

### Shared registry image

The [container workflow](.github/workflows/container.yml) tests and publishes **AMD64 and ARM64** images to GitHub Container Registry after pushes to `main` and `v*` tags. Its target for this repository is:

```text
ghcr.io/imb2023/ismasigns-specials:latest
```

Check the [publishing run](https://github.com/Imb2023/swipemenu/actions/workflows/container.yml) before using this address. Publication is complete only when the workflow succeeds. **The package owner must set the package visibility to Public** in GitHub → profile → Packages → ismasigns-specials → Package settings for anonymous sharing; a public repository alone does not guarantee a public container package.

After successful publication and public visibility:

```bash
docker run -d --name ismasigns-specials --restart unless-stopped --read-only --cap-drop ALL --security-opt no-new-privileges -p 127.0.0.1:3000:3000 ghcr.io/imb2023/ismasigns-specials:latest
```

For a stable deployment use a `sha-…` tag or the published image digest. `latest` is updated by future successful builds, but an already-running container stays on its current image until you pull and recreate it. Open `/setup.html` in the shared example app to create a restaurant's own package. `/healthz` checks the web server, not Google's availability.

To publish a restaurant's customized package under **your own** GitHub account, with Docker and GitHub CLI installed:

```bash
docker build -t ghcr.io/YOUR-LOWERCASE-GITHUB-NAME/ismasigns-specials:latest .
gh auth login --scopes write:packages
gh auth token | docker login ghcr.io --username YOUR-GITHUB-NAME --password-stdin
docker push ghcr.io/YOUR-LOWERCASE-GITHUB-NAME/ismasigns-specials:latest
```

Keep registry tokens out of the package. Public images include their public Sheet URL and menu snapshot. The Docker build excludes `.env` and common credential files. Updating Sheet cells refreshes live data as usual; changing branding, photos, or the saved snapshot requires rebuilding and redeploying the image.

## One-time setup

### 1. Make your restaurant’s copy

1. Open this project on GitHub and choose **Fork**.
2. Give the copy a name you recognize, such as `our-restaurant-specials`.
3. Clone **your copy**, not the example restaurant’s repository:

```bash
git clone https://github.com/YOUR-GITHUB-NAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
```

Replace the uppercase placeholders with your own GitHub name and repository name. Commands in this guide run from that folder. The app has no runtime packages to install.

**Why:** every restaurant controls its own files, deployment, and menu data.

### 2. Create your menu Sheet

1. Create a **new, dedicated Google spreadsheet**. Do not use a workbook containing customer, payroll, or other private information.
2. Name its menu tab **`Specials`** (the tab at the bottom, not just the spreadsheet title).
3. Import [specials-template.csv](docs/specials-template.csv) into that tab, or paste these headers into row 1:

```text
id,category,name,price,description,image,featured,available,order,video
```

When pasting, put each header in its own column. CSV import does this for you.

| Column | What to enter | Example |
| --- | --- | --- |
| `id` | A stable, unique code | `SP1` |
| `category` | `Specials` (or `Special`) | `Specials` |
| `name` | The item’s real name | `House drink` |
| `price` | A number, without a currency symbol | `100` |
| `description` | Actual ingredients or serving details, briefly | `Orange juice, gin & Sprite.` |
| `image` | Photo link, or a local media path | `media/house-drink.webp` |
| `featured` | Retained for compatibility; not a publishing switch | `TRUE` |
| `available` | `TRUE` to show it; `FALSE` to hide it | `TRUE` |
| `order` | A number deciding which comes first | `1` |
| `video` | Optional direct MP4/WebM link; otherwise blank | blank |

**Publishing rule:** an item needs a name, `available = TRUE`, and category `Special` or `Specials`. The site shows the **first three** qualifying rows in numeric `order`. Setting `featured` alone does not publish anything. The imported template starts hidden: replace its examples, then enable your real offers.

**Why three?** It is a practical starting point for a quick specials viewer, not a proven sales optimum. Compare one, three, and five in the demo gallery. The live limit remains three; changing the gallery count does not change your restaurant’s live limit.

### 3. Connect the Sheet using Google Apps Script

1. From **your spreadsheet**, choose **Extensions → Apps Script**.
2. Replace the starter code with [google-apps-script.gs](docs/google-apps-script.gs).
3. Replace `PASTE_YOUR_SPREADSHEET_ID_HERE` with the ID from your spreadsheet address:

```text
https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
```

4. Save. Choose **Deploy → New deployment → Web app**.
5. Set **Execute as: Me** and **Who has access: Anyone**. Authorize only the script you created and understand.
6. Copy the deployed **Web app URL ending in `/exec`**. Do not use the editor URL or a `/dev` test URL.
7. Open that `/exec` URL in a private browser window while signed out. It should show a JSON list, such as `[]` if nothing is published. It must not require a Google login.

The Sheet itself does **not** need “anyone can edit” sharing. The supplied script is read-only and exposes only approved columns from published special rows. Google Workspace policies may prevent anonymous web apps; your account administrator must resolve that restriction if present.

**Why:** visitors can read published offers without gaining access to edit the spreadsheet. No Google password or token goes in the website.

### 4. Put your connection and branding in the project

Edit **`menu.config.json`**:

```json
{
  "sheetUrl": "YOUR_DEPLOYED_APPS_SCRIPT_EXEC_URL"
}
```

Edit **`site.config.json`** to use the public HTTPS address you will deploy to:

```json
{
  "url": "https://YOUR-RESTAURANT-SITE.vercel.app/"
}
```

Use the exact domain shown by your hosting project. A custom domain works too. A `SITE_URL` environment variable overrides this file if you need it.

For your restaurant’s identity:

- **`index.html`:** change the visible heading, browser title, and social descriptions.
- **`styles.css`:** change the accent and colors under `:root` if desired.
- **`manifest.json`:** change the app name, short name, and description.
- Replace the favicon/app icons and `assets/social-preview.png` with your own branding before advertising the site. Update the demo screenshots in the manifest too, or remove those screenshot entries.

There is no `BRAND` object in the current app. Older instructions referring to it are obsolete.

**Currency:** the current `money()` formatter in `app.js` displays `$`. If you need another symbol or currency, have your helper update that formatter before launch. A value like `€10` in the Sheet will not configure the currency.

**Why:** your own public URL makes QR links, sharing previews, and the sitemap point to the correct restaurant.

### 5. Publish your first menu snapshot

Before deploying your copy, replace the example restaurant’s saved menu:

```bash
npm run sync-menu
npm run build
npm test
```

Check **`menu.snapshot.json`**: it must contain **your restaurant’s** published items, not Don Pedro or another example unless you actually serve it. If the sync fails, fix the Sheet URL/access first; do not deploy the old example snapshot.

For a simple local preview:

```bash
python3 -m http.server 8000 --directory dist
```

Open the local address printed by Python. This previews the saved menu only; Python does not run the live Node API.

Save your setup to GitHub:

```bash
git add .
git commit -m "Configure our restaurant menu"
git push
```

**Why:** the snapshot lets a new visitor see an offer before a slow Google response finishes. It is generated from your actual Sheet, not invented fallback content.

### 6. Deploy your restaurant’s website

1. In Vercel, choose **Add New → Project** and import **your GitHub repository**.
2. Use the repository root and **Other / no framework preset**.
3. The included `vercel.json` sets:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Deploy. Confirm its assigned domain matches `site.config.json`. If necessary, correct that file and push again.
5. In a private browser window, visit the site and `/api/menu`. Check that the API returns your published rows. It may take longer on its first refresh; the menu should already show the saved offer.

The read-only menu does not require any environment secrets. Cloudinary is optional and not needed for the simple photo workflow below.

**Why:** connecting GitHub makes code/photo commits deploy automatically. Editing a Sheet cell does not require a Git commit.

### 7. Test at an actual table, then make your QR code

- Open the public site on mobile data, not only your own Wi-Fi.
- Check real names, prices, serving descriptions, photos, and currency.
- Change an offer in the Sheet and verify it appears after refreshing. Cache refresh can take about a minute **plus Google’s response time**; it is not guaranteed to be instant.
- Set `available` to `FALSE` and confirm the item disappears after a successful refresh.
- Keep a printed menu or a staff explanation available for guests who cannot or do not want to use a phone.
- Make a QR code pointing to **your permanent site address**, print it with a short written address, and test the print with more than one phone.

**Why:** a permanent QR still works when specials change. Clear photos and readable prices help guests decide; staff remain responsible for confirming availability and taking orders.

## Daily staff guide — no coding

| Want to… | Do this in the Sheet |
| --- | --- |
| Change a price | Edit `price` |
| Change the description | Edit `description` |
| Hide a sold-out offer | Set `available` to `FALSE` |
| Show it again | Set `available` to `TRUE` and category to `Specials` |
| Move an offer first | Set its `order` to `1`, then use `2` and `3` for the others |
| Add a new offer | Add a row with its own `id`, name, category, price, availability, and order |
| Replace a photo | Paste the newly deployed image link into `image` |

Save the edit, refresh the public menu, and allow for the cache/update delay. If it says **Saved menu**, ask the owner to check the connection; the page is not promising that saved availability is current. Guests should confirm with their server.

**Important:** a new browser may briefly see the deployment snapshot before a fresh response arrives. A technical helper should update the snapshot for major menu changes:

```bash
npm run sync-menu
npm run build
git add menu.snapshot.json
git commit -m "Refresh published menu snapshot"
git push
```

This extra snapshot refresh is separate from normal daily Sheet editing. The snapshot does not update itself in GitHub.

## Add a photo without Cloudinary

1. Use a photo that matches what you actually serve and that you have permission to publish.
2. Export a **WebP around 800 × 1000 px**, preferably below **100–150 KB**. Do not stretch a small photo just to reach those dimensions.
3. In **your GitHub repository**, open `media/`, choose **Add file → Upload files**, and upload it with a simple name such as `house-drink-v2.webp`.
4. Commit the upload. Wait for the connected deployment to finish.
5. Open `https://YOUR-SITE/media/house-drink-v2.webp` to confirm it loads.
6. Paste that link—or `media/house-drink-v2.webp`—into the correct row’s `image` cell.

A technical helper can also optimize and commit the photo for you. The build automatically includes top-level WebP, AVIF, JPEG, PNG, MP4, and WebM files from `media/`. Use a new filename when replacing a photo to avoid an older cached image under the same link.

**Why:** local media avoids another storage account and API keys. Small files load quickly. Menu text stays readable and editable in Sheets instead of being baked into a promotional flyer.

## Optional video and staff uploads

**Video is optional.** Use a short MP4/WebM clip and a small preview photo. Put its direct URL in `video` and the preview image in `image`. The supplied Apps Script template includes both fields. The menu loads the photo first; video downloads only after Play. Keep clips around 15 seconds or less and as small as practical. Current security settings allow same-site video and Cloudinary video; another video host may need a policy change.

For staff who must upload without GitHub, an optional Cloudinary helper is included at `/upload.html`. It needs an owner-created account, a restricted **signed** upload preset, and server environment variables. See the [owner setup page](upload-setup.html). Never put secrets in the Sheet, repository, or chat. The helper returns links to paste; **it does not edit your Sheet automatically**. Free-plan quotas and commercial-hosting eligibility still apply.

**Why:** start with the simple photo workflow. Add another service only when its convenience is worth the setup.

## Choose a design

Open `/demos.html` on your deployment. Swipe **sideways** between Focus, Quick list, and Spotlight. Scroll **inside** a preview to browse the offers; compare 1, 3, and 5 items with the buttons.

- **Focus:** one photo-led offer at a time.
- **Quick list:** the easiest way to compare three offers at once.
- **Spotlight:** one lead offer with compact alternatives.

The gallery uses generated demo photos and sample prices. It never writes to your Sheet or changes the live limit. The main live page currently uses Focus; selecting a gallery tab does not switch your production design. Ask your developer to implement a chosen alternative.

Remove the `Design demos` link from `index.html` when you no longer want guests entering the review gallery. Replace or remove sample media/branding before advertising a copy for another restaurant.

## Common problems

| Problem | Check |
| --- | --- |
| Offer missing | Nonblank name; `available` TRUE; category `Special`/`Specials`; numeric order; only three items qualify for display |
| Photo missing | Open the actual image URL; wait for deployment; check filename/case; use an image file, not an Imgur gallery or Google Drive sharing page |
| Google login appears | Use the deployed `/exec` URL; web app access must allow anonymous visitors; confirm Workspace policy |
| Apps Script returns `menu_unavailable` | Correct spreadsheet ID, tab name `Specials`, and required headers; owner has access to the workbook |
| Sheet changes not visible yet | Wait for cache refresh and Google response, then refresh; check `/api/menu` and whether the page says Saved menu |
| New copy shows another restaurant | Refresh and commit your own `menu.snapshot.json` before launching |
| Code or uploaded photo not updating | Confirm the commit reached the connected deployment branch and Vercel finished building |
| Static preview does not update | Python serves files only; `/api/menu` needs the configured Node host |
| Changed the Apps Script code | Update the existing Web app deployment to a new version; editing code alone does not update that deployed version |
| Need an emergency availability change | Tell staff immediately, hide it in the Sheet, and verify a successful refresh; cached/offline data can remain visible with a warning |

## Technical checks and maintenance

```bash
npm test
python3 tests/fast_menu.py
python3 tests/menu_ui.py
python3 tests/image_urls.py
python3 tests/production_browser.py
python3 tests/demo_gallery.py
python3 tests/staff_uploads.py
```

Python browser checks require Playwright, Pillow, Chromium, and FFmpeg for the upload/video checks. They use controlled data; they do not prove that a new restaurant’s Google/Vercel accounts are configured. The build keeps tests, scripts, skills, and source configuration out of the public static bundle; Vercel deploys the API functions separately. Keep TLS verification enabled.

Keep your initial snapshot, branding, and sharing image current. Monitor hosting/media quotas. The app has no analytics proving a sales increase; compare actual requests across similar shifts and use guest feedback to choose a design.

## Reuse and licensing

The application code is released under the [MIT License](LICENSE): other restaurants may use, modify, and distribute it commercially while retaining the license notice. Third-party skill files keep their own license. MIT does not grant rights to someone else’s restaurant branding or photos, and it does not override hosting-plan terms. Review generated demo media against your actual offerings before publishing it.
