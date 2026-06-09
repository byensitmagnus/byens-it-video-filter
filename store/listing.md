# Chrome Web Store Listing — TikTok Creator Video Filter

Paste-ready copy for the Chrome Web Store submission. Field-by-field.

---

## Store name (≤ 45 chars)

**Primary (trademark-safe — "X for TikTok"):**
`Creator Video Filter for TikTok` *(31 chars)*

**Alternatives:**
1. `Creator Video Filter — TikTok Stats` *(35 chars)*
2. `Creator Video Filter` *(20 chars)*

> Do **not** lead the store name with the "TikTok" trademark (e.g. "TikTok Creator Video Filter"). The Chrome Web Store commonly rejects names that start with another product's trademark; the "**X for TikTok**" construction is the safe form. Keep "Built by Byens IT" as maintainer credit only.

---

## Summary / short description (≤ 132 chars)

**Primary:**
`Analyze your own TikTok videos locally: sort by views, likes, saves & velocity. Leaderboard, best time, repost radar. 100% local.` *(129 chars)*

**Alternatives:**
1. `See which of your own TikTok videos win. Sort by saves & save-rate, find best posting times. Private & 100% local.` *(113 chars)*
2. `Find your best TikTok videos to make more of and repost. Local analytics for your own content. No tracking, 100% local.` *(118 chars)*

---

## Detailed description

**TikTok Creator Video Filter** helps you, the creator, figure out **what to make more of** and **what to repost** — by analyzing your own TikTok videos right inside your browser. It reads the numbers TikTok already shows you (views, likes, comments, shares, saves, post date, hashtags, sound) and turns them into a clear, sortable on-page panel. Everything runs **100% local**: nothing is ever sent to any server.

**Why creators use it**

- **Make more of what works.** Surface the videos with strong reach *and* a high save-rate — the content people actually want to come back to.
- **Repost your hidden winners.** The Repost Radar finds older videos people still save, so you can re-share proven hits at the right moment.
- **Post when your audience is watching.** A 7×24 heatmap shows the days and times your videos perform best.
- **Double down on the right hashtags and sounds.** See which hashtags and sounds earn you the most average views.
- **Stay private.** Your data never leaves your computer.

**Features**

- 🏆 **Top list** with smart badges (Repost, Make more, Rising, New)
- 📊 **Save-rate Leaderboard** with percentile badges — the strongest "people will remember this" signal
- 🕒 **Best posting-time heatmap** (7×24) plus your top time slots
- #️⃣ **Hashtags & Sounds** performance breakdown by average views
- 🔁 **Repost Radar** for old winners with high save-rate, with one-click "Reposted" marking
- 📈 **Trends** — compare periods and spot sleeper hits with the biggest growth
- ★ **Watchlist** for videos you want to keep an eye on
- ⤓ **CSV / JSON export** and per-video cover-image download — saved only when you click
- 📅 **Period filters** (All / 7 / 28 / 90 days / This year / Custom)
- ◐ Light/dark theme and a one-click **Clear** to wipe all local data

**100% local & privacy-first**

- Reads only TikTok's own JSON responses, locally in your browser, for **your own videos**.
- Nothing is sent to any server by default. No tracking, no analytics, no ads, no remote code.
- **Optional Buffer auto-repost (off by default):** if you add your own Buffer API key, the extension can send a post's caption + media URL to Buffer (`api.buffer.com`) when you click ⤴ Buffer, so Buffer publishes it to TikTok via TikTok's official API. Disabled until you enable it; your key stays local.
- Does **not** read or store your TikTok login, cookies, tokens, or passwords.
- Data is stored only in `chrome.storage.local` and stays on your device. Downloads happen only when you click export/download.
- Free and open source (MIT). Read every line at <https://github.com/byensitmagnus/byens-it-video-filter>.

Maintained by Byens IT (<https://byens-it.dk>).

> **Disclaimer:** Not affiliated with TikTok. This extension helps creators analyze their own visible TikTok data locally in the browser. It is not official and is not endorsed by or connected to TikTok.

---

## Category & language

- **Category:** Productivity
- **Primary language:** English

---

## Single purpose

> This extension has a single purpose: to help a TikTok creator analyze their own videos — locally in the browser — so they can decide what content to make more of and what to repost.

---

## Permission justifications

**`storage`**
The extension saves captured video metrics, time-series snapshots, the user's watchlist, and settings locally using `chrome.storage.local`. This is required so the panel can show changes over time and remember the user's preferences between visits. No data is synced or transmitted off the device.

**`downloads`**
The extension lets the user export their analysis as CSV/JSON files, download a video's cover image, and download their **own** video file (to re-upload it themselves) to their own disk. The `downloads` permission is used only to write these files, and only when the user explicitly clicks an export or download button. There are no automatic or background downloads, and the extension never posts or uploads anything on the user's behalf.

**Host permission — `https://*.tiktok.com/*`**
The extension runs only on TikTok. It needs host access to `https://*.tiktok.com/*` so its content script can read TikTok's own JSON responses (the creator's profile video list and TikTok Studio analytics) on the pages the user is already viewing, and render the on-page analysis panel. Access is strictly limited to TikTok; no other site is requested.

**Host permission — `https://api.buffer.com/*` (optional feature)**
Used only by the optional, off-by-default Buffer auto-repost integration. If the user adds their own Buffer API key and clicks "⤴ Buffer", the extension calls Buffer's API to queue the user's own post. No request is made to this host unless the user enables and uses the feature. The extension never posts to TikTok itself and never acts without a user click.

**Are you using remote code? NO.**
The extension does not load or execute any remote code. All code ships inside the package, there are no external scripts, and no `eval` of remote content. The only outbound network call the extension can make is to Buffer's API (`api.buffer.com`), and only when the user has enabled the optional Buffer integration and clicks to post — this transfers data, not code.

---

## Data collection disclosures (Privacy practices form)

> **If you ship the optional Buffer integration:** disclose that, when the user enables it,
> the extension transmits the user's own post content (caption + media URL) to Buffer at the
> user's request to publish on their behalf. If you prefer the simplest possible privacy
> review, ship the build **without** the Buffer integration and the statements below apply
> as-is.

- **Does this item collect or use user data?** No data is collected. By default nothing is transmitted off the user's device; the only optional transmission is the user's own post content to their own Buffer account, at the user's explicit request, when the Buffer integration is enabled.
- **Personally identifiable information:** Not collected.
- **Health information:** Not collected.
- **Financial and payment information:** Not collected.
- **Authentication information:** Not collected (the extension does not read login, cookies, tokens, or passwords).
- **Personal communications:** Not collected.
- **Location:** Not collected.
- **Web history:** Not collected.
- **User activity / website content:** Read **locally only** to render the analysis panel; never sent anywhere and never stored off-device.

**Certifications:**
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ☑ I do not use or transfer user data for purposes unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:**
`https://raw.githubusercontent.com/byensitmagnus/byens-it-video-filter/main/store/privacy-policy.md`
