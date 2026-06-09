# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [3.3.0] - 2026-06-09

### Added
- **↻ Repost button (assisted repost flow).** Each Repost Radar candidate now has a
  one-click "↻ Repost" that copies the video's caption + hashtags to the clipboard and
  opens TikTok Studio's Upload page in a new tab — pick your video file, paste the
  caption, publish, then mark "✓ Reposted". Fully automatic reposting is intentionally
  NOT possible: it would require TikTok's posting API (login/OAuth), which conflicts
  with the extension's privacy-first, no-login principle.

### Notes
- Still 100% local — the button only writes to your clipboard and opens a tiktok.com tab.

## [3.2.1] - 2026-06-09

### Fixed
- **Tab bar no longer clips.** At the panel's default width the 7 tabs needed more
  room than available, and the scrollbar was hidden — so Trends and ★ Watchlist were
  invisible and undiscoverable. The tab bar now wraps onto a second row, keeping every
  tab visible at any panel width.

## [3.2.0] - 2026-06-09

Correctness, trust, and Chrome Web Store readiness. Still 100% local — no new tracking,
servers, or remote code.

### Changed
- **Store-facing name is now "Creator Video Filter for TikTok"** (trademark-safe "X for
  TikTok" form). "Built by Byens IT" remains maintainer credit only.

### Fixed
- **Percentile small-sample inflation.** With few videos, percentile-based badges
  (Viral / Make More / Utility / Repost) and the 0–100 score were unreliable — a single
  video scored 100 and looked "viral". They are now gated by a minimum sample size; below
  it, strong badges are hidden and the score shows as "~" with a "limited data" note.
- **CSV formula injection.** Cells beginning with `= + - @` (or tab/CR) are prefixed with
  `'` so a crafted caption or sound name can't execute as a formula in Excel/Sheets.
- **Silent parser breakage.** Parse warnings reset per capture (no more permanently stuck
  banner), and responses that look like videos but can't be parsed (an ID or field-name
  change) raise a clear, actionable warning instead of failing silently.
- **Velocity sort** no longer treats a real velocity of 0 as "no data".

### Added
- **Badge legend** ("?" button) explaining all six badges and the score.
- **Data-quality indicators:** a "no date" chip on undated videos — which are surfaced as
  *hidden* (not silently dropped) when a date filter is active — plus a panel hint when no
  save data is in view (saves require TikTok Studio · Analytics → Content).
- Unit tests for small-sample scoring, CSV escaping, and parser reset/breakage detection
  (13 → 23 tests).
- `docs/PRODUCT_STRATEGY.md` — full product/scope strategy document.

### Notes
- Still 100% local — no servers, login, tracking, or remote code. Not affiliated with TikTok.
- Chrome Web Store screenshots remain to be captured (see `store/screenshots/`) — the one
  remaining item before submission.

## [3.1.0] - 2026-06-09

Smarter, more complete profile harvesting.

### Changed
- **Rebuilt the "Fetch entire profile" auto-scroller.** It now measures progress by
  the number of captured videos (not just page height), so it no longer stops early
  on slow-loading profiles. On a real profile this raised coverage from ~59 to **283
  videos** (the full catalog) in testing.
- The harvester **nudges the scroll position** to re-trigger TikTok's lazy-loader when
  it stalls, and is more patient (longer settle time, higher iteration cap).

### Added
- **Period-aware harvesting.** When a date filter is active, the harvester stops as
  soon as it has scrolled past the start of that window — guaranteeing complete data
  for the chosen dates without scrolling your entire history. The toast reports
  *"period covered"* when it finishes early.

### Fixed
- `buildCsv` now guards `SaveRate%` / `Engagement%` against missing values (defensive;
  matches the JSON export's existing null-safety).

### Notes
- Still 100% local — no servers, login, tracking, or remote code. Not affiliated with TikTok.

## [3.0.0] - 2026-06-09

Public open-source release. Rebrand from "Byens IT – Video Filter (TikTok)" to
**TikTok Creator Video Filter** — neutral and usable for any TikTok creator.

### Changed
- Rebranded to **TikTok Creator Video Filter**; panel UI is now in English.
- Refactored the monolithic content script into focused modules: `constants`, `parser`, `metrics`, `storage`, `export`, `ui`, `content`.
- New badge logic: 🔁 Repost Candidate, 🔥 Make More, 🚀 Viral Reach, 💾 Utility Winner, 🆕 Too Early, ⚠️ Missing Fresh Data.

### Added
- Parser & metrics unit tests with anonymized fixtures (`fixtures/`, `test/`), runnable via `npm test` (Node's built-in test runner, zero dependencies).
- npm scripts: `lint` (ESLint), `test`, `build:zip` (cross-platform ZIP builder).
- GitHub Actions CI running lint + test + build on every push and pull request.
- Public-release docs: English README, `PRIVACY.md`, and a `store/` folder (listing, privacy policy, screenshots guide, submission checklist).

### Notes
- Still 100% local — no servers, login, cookies, tokens, tracking, or remote code. Not affiliated with TikTok.

## [2.0.0] - 2026-06-09

Den store funktionsudgivelse. Fra ren videofiltrering til et komplet
analyse- og beslutningsværktøj for dine egne TikTok-videoer.

### Added

- **Gem-rate leaderboard** (save-rate) med percentil-badges, så du med ét blik
  ser hvilke videoer der bliver gemt mest i forhold til deres visninger.
- **Samlet "lav-mere-af"-score** der vægter visninger, likes og gemte til ét
  enkelt tal, du kan sortere og prioritere efter.
- **Bedste-posttidspunkt 7x24 heatmap** der viser hvilke ugedage og klokkeslæt
  dine bedste videoer er udgivet på.
- **Hashtag- og lyd-performance** med oversigt over hvilke hashtags og lyde der
  trækker flest visninger og gemte.
- **Tidsserie-snapshotmotor** der gemmer øjebliksbilleder af dine tal over tid,
  så du kan følge udviklingen video for video.
- **View-velocity og sleeper-hit-detektion** der finder videoer med hurtig
  vækst samt "sleepers", der pludselig tager fart efter et stykke tid.
- **Repost-radar** (evergreen-vindere) der peger på tidløse vindervideoer,
  som er værd at reposte.
- **Sammenlign to perioder** så du direkte kan se forskellen mellem fx denne
  måned og sidste måned.
- **Watchlist** hvor du kan markere og holde øje med udvalgte videoer.
- **Download af cover-billede** direkte fra panelet.
- **Repurpose-tekstpakke** med færdige titler og hashtags til Reels og Shorts.
- **Auto-scroll harvester** der automatisk scroller dine videoer igennem og
  indsamler tallene for dig.
- **CSV- og JSON-eksport** der respekterer de aktive filtre, så du kun
  eksporterer det, du faktisk kigger på.
- **Mørkt/lyst tema** til panelet.
- **Robust feltmapping** med en synlig advarselsbanner, hvis TikToks datafelter
  ændrer sig og noget ikke kan tolkes korrekt.
- **Faneopdelt panel-UI** der samler de mange nye funktioner overskueligt.
- **downloads-tilladelse og baggrunds-service-worker** der gør cover- og
  fil-downloads mulige.

## [1.0.0] - 2026-06-09

Første udgivelse.

### Added

- MV3-udvidelse der opfanger metrics for dine egne TikTok-videoer
  (visninger/likes/gemte) via et hook på fetch og XHR.
- Periodefilter til at afgrænse data til et valgt tidsrum.
- Ejer-filter, så du kun ser dine egne videoer.
- Repost- og "lav mere"-badges, der hurtigt fremhæver hvad du bør gentage.
- CSV-eksport af de filtrerede tal.
