# Store Screenshots

Screenshots for the Chrome Web Store listing of **Creator Video Filter for TikTok**.

> **STATUS: captured ✅ (2026-06-09, v3.2.0 build).** All six shots exist in this
> folder at exactly 1280×800 PNG, taken live on TikTok Studio with the panel open
> (289 videos, badges, legend, save-rate data). Re-capture with the steps below
> whenever the UI changes meaningfully.

## Required sizes

The Chrome Web Store accepts screenshots in one of these dimensions:

- **1280×800** (recommended — sharper, fills the listing carousel) or
- **640×400**

PNG (preferred) or JPEG, **1.6 : 1** aspect ratio. Up to 5 screenshots. Capture on a
clean TikTok page with the panel open, then crop/scale to **exactly** one of the sizes
above (don't stretch). A demo/test creator account avoids showing private data.

## Exact capture procedure (to hit 1280×800 cleanly)

1. Open `https://www.tiktok.com/@<your-handle>` in Chrome and open the panel (click the
   floating **▼ Filter** button).
2. Click **⤓ Fetch entire profile** so the panel has a full, realistic dataset.
3. Set the browser window so the captured area is ≥ 1280×800 (e.g. zoom to 100%, window
   width ≥ 1300px). The panel sits on the right; frame it with some TikTok page context
   on the left so the shot reads as "analytics on top of TikTok".
4. Capture the region, then crop/resize to exactly **1280×800** (any image editor, or
   `magick input.png -resize 1280x800^ -gravity center -extent 1280x800 panel.png`).
5. Save into this folder using the names below.

Tip: open the **?** legend (top-right of the panel) for the hero shot so reviewers
immediately understand the badges.

## Shot list (capture 5–6, use your best 5)

1. **`panel.png` — Top list with badges (HERO).** Top tab, sorted by Score, badges
   visible (🚀 Viral, 🔥 Make More, 💾 Utility, 🔁 Repost). Optionally with the **?**
   legend open. This doubles as the README banner.
2. **`leaderboard.png` — Save-rate Leaderboard.** Videos ranked by save-rate with
   "top N%" labels. Caption: "Find the content people actually save."
3. **`posting-times.png` — Posting-times heatmap.** The 7×24 heatmap + best time slots.
   Caption: "Post when your audience is watching."
4. **`hashtags-sounds.png` — Hashtags & Sounds.** Hashtag/sound performance by average
   views. Caption: "Double down on what's working."
5. **`repost-radar.png` — Repost Radar.** Older high-save-rate winners with the
   one-click **✓ Reposted** control. Caption: "Re-share proven hits."
6. **`csv-export.png` — Export + privacy.** The CSV/JSON controls; emphasise that data
   stays local and downloads only on click. Caption: "Export your own data — 100% local."

## File-naming convention

```
panel.png
leaderboard.png
posting-times.png
hashtags-sounds.png
repost-radar.png
csv-export.png
```

Keep this folder as the single source of truth for store imagery. The README hero image
points at `store/screenshots/panel.png`, so make that the most representative shot.
