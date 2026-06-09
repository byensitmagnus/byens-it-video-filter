# Chrome Web Store — Submission Checklist

Step-by-step checklist for publishing **TikTok Creator Video Filter** to the Chrome Web Store.

> Published under the **Byens IT** brand (<https://byens-it.dk>). This extension is **unofficial** and **not affiliated with TikTok**. Make sure nothing in the listing implies it is official.

---

## 1. One-time setup

- [ ] **Register a Chrome Web Store developer account.** Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), sign in with the Byens IT Google account (`byensitdk@gmail.com`), and pay the **one-time $5 registration fee**.
- [ ] Complete the developer account details (publisher name shown as **Byens IT**, contact email, and verify the email).

## 2. Build the package

- [ ] From the repo root, run:
  ```
  npm run build:zip
  ```
- [ ] Confirm the ZIP is produced in **`/dist`**.
- [ ] **Verify `manifest.json` is at the ZIP root** (not nested inside a subfolder). Open the ZIP and check the top level contains `manifest.json`, `icons/`, `src/`, `popup/`, etc. A nested manifest is the most common upload rejection.
- [ ] Sanity-check the manifest: name **TikTok Creator Video Filter** (rebranded), permissions `storage`, `downloads`, host `https://*.tiktok.com/*`, no remote code.

## 3. Create the listing

- [ ] In the Developer Dashboard, click **Add new item** and upload the ZIP from `/dist`.
- [ ] **Store name** — paste from `store/listing.md` (≤ 45 chars).
- [ ] **Summary** — paste the short description from `store/listing.md` (≤ 132 chars).
- [ ] **Detailed description** — paste the full description from `store/listing.md`, including the **"100% local"** line and the **not-affiliated disclaimer**.
- [ ] **Category:** Productivity.
- [ ] **Primary language:** English.
- [ ] Add the **icon** (128×128, already in the package) and a **small promo tile** if you have one.

## 4. Upload screenshots

- [ ] Upload the screenshots from `store/screenshots/` (1280×800 or 640×400). See `store/screenshots/README.md`.
- [ ] Make sure **`panel.png`** (Top list with badges) is the first/hero screenshot.
- [ ] Upload up to 5: `panel.png`, `leaderboard.png`, `posting-times.png`, `hashtags-sounds.png`, `repost-radar.png` (or `csv-export.png`).

## 5. Privacy practices form

- [ ] **Single purpose** — paste the single-purpose statement from `store/listing.md`.
- [ ] **Permission justifications** — paste the justifications for `storage`, `downloads`, and host `https://*.tiktok.com/*` from `store/listing.md`.
- [ ] **Remote code:** select **No**.
- [ ] **Data collection disclosures:** state that **no user data is collected, used, or sold**, matching `store/listing.md`. Check all three data-use certifications.
- [ ] **Privacy policy URL:** set it to the hosted policy:
  ```
  https://raw.githubusercontent.com/byensitmagnus/byens-it-video-filter/main/store/privacy-policy.md
  ```
  (Confirm the URL loads publicly before submitting.)

## 6. Final review & submit

- [ ] Re-read the listing for any wording that could imply the extension is **official** — remove it. Keep the **"Not affiliated with TikTok"** disclaimer visible.
- [ ] Confirm the version number in `manifest.json` is correct and higher than any previously published version.
- [ ] Save the draft, then click **Submit for review**.
- [ ] Note: review typically takes from a few hours up to a few business days.

## 7. Post-approval

- [ ] Once approved, copy the **published Web Store URL** and add it to the repo `README.md` and the Byens IT site.
- [ ] Test installing the **published** version in a clean Chrome profile to confirm it works end-to-end.
- [ ] Tag the release in Git and update `CHANGELOG.md`.
- [ ] For future updates: bump the `version` in `manifest.json`, rebuild with `npm run build:zip`, upload the new ZIP, and submit again.
- [ ] Watch the Developer Dashboard and GitHub issues for any reviewer feedback or user reports.
