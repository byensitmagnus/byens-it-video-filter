# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
