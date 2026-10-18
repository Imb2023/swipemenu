# Setup video transcript

This is a silent, captioned walkthrough. Google/Vercel steps are instruction screens, not a recording of a signed-in account. The menu screenshot is a local example. Follow README.md for complete steps.

## 00:00:00 — Your specials. One simple place.
- Guests browse a photo, a price, and a short description.
- They ask their server to order. No checkout or guest account.

Why: Sheets for staff. A lightweight viewer for guests.

## 00:00:08 — Make your restaurant’s copy.
- Fork the project into your GitHub account.
- Use your own menu, photos, and website address.
- Choose a host that permits commercial restaurant use.

Why: MIT permits commercial use of the code. Hosting has separate terms.

## 00:00:16 — Start with your Google Sheet.
- Import docs/specials-template.csv into a tab named Specials.
- Replace the examples. Category: Specials. Available: TRUE.
- Order 1, 2, 3 chooses the first three published offers.

Why: Staff can edit familiar cells instead of changing website code.

## 00:00:28 — Connect it with Apps Script.
- Extensions → Apps Script. Paste docs/google-apps-script.gs.
- Add your spreadsheet ID; save and deploy as a Web app.
- Execute as Me. Access: Anyone. Copy the /exec URL.
- Test signed out: it should show JSON, not a login page.

Why: Visitors can read published specials without editing the spreadsheet.

## 00:00:41 — Set your connection and address.
- menu.config.json: paste your Apps Script /exec URL.
- site.config.json: enter your own public HTTPS site address.
- Replace sample names, icons, and sharing graphics.

Why: Links, QR codes, and previews should belong to your restaurant.

## 00:00:52 — Publish your first saved menu.
- Run the commands from your project folder.
- Check menu.snapshot.json contains YOUR real offers.
- Commit and push. Import your repository into Vercel.
- Use npm run build, output dist, and no framework preset.

Why: The saved menu appears before the background Sheet update returns.

## 00:01:05 — Add a photo. Skip the extra account.
- Export a WebP around 800 × 1000 px, under 100–150 KB.
- GitHub: media/ → Add file → Upload files → Commit.
- Wait for deployment, then open the photo link to check it.
- Paste the link into that offer’s image cell.

Why: Small local files load quickly. Cloudinary is optional.

## 00:01:16 — Daily changes happen in the Sheet.
- Edit price or description. No website commit needed.
- Sold out? Set available to FALSE.
- Refresh the menu; allow about a minute plus Google’s response time.
- Saved menu means staff should confirm current availability.

Why: Refresh the deployment snapshot for major changes, not every cell edit.

## 00:01:26 — Test it at an actual table.
- Try mobile data. Check price, photo, and serving details.
- Verify hiding an item works after a successful refresh.
- Print a QR to your permanent site, plus a written address.
- Keep a printed menu or staff explanation available.

Why: Full instructions and troubleshooting are in README.md.
