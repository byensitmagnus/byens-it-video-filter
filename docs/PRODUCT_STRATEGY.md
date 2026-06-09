# TikTok Creator Video Filter — Product & Scope Strategy

> Internal product-strategy document. Source-of-truth for direction and prioritisation.
> Generated from a full repository review (every tracked file read directly + a 13-agent
> parallel adversarial review). Findings are grounded in `file:line` and were empirically
> verified by executing the modules in Node.

**Repo:** `byensitmagnus/byens-it-video-filter` · **Reviewed at:** v3.1.0 (`46e9069`) · **License:** MIT

---

## 1. Repository Review

Whole tracked codebase read (35 files, ~1431 lines of core). CI green (lint + 13 tests + build).

| Area | Files |
|---|---|
| Runtime core | `src/{inject,content,parser,metrics,storage,export,ui,constants,background}.js`, `src/panel.css` |
| UI entry | `popup/popup.{html,js}`, `manifest.json`, `icons/` |
| Tests | `test/{parser,metrics}.test.js`, `fixtures/*.json` (13 tests) |
| Docs | `README.md`, `PRIVACY.md`, `CHANGELOG.md`, `LICENSE` |
| Store | `store/{listing,privacy-policy,submission-checklist}.md`, `store/screenshots/README.md` |
| Tooling | `tools/{build-zip.js,icongen.ps1,package.ps1}`, `eslint.config.js`, `.github/workflows/ci.yml` |

**Headline:** Technically well-built, genuinely privacy-first (no-egress claim **confirmed** by adversarial audit), functionally rich. **No showstopper-critical bug.** One hard Chrome Web Store blocker (missing screenshots) and a set of correctness/robustness weaknesses to fix in a small v3.2.0 pass before public launch.

---

## 2. Product Description

A free, privacy-first, 100%-local Chrome tool that turns a creator's own TikTok numbers into a decision panel on top of TikTok.

- **Problem:** TikTok's native analytics is shallow (per-video, no cross-video ranking, no save-rate leaderboard, no repost radar, no export). Creators can't easily answer "what to make more of" and "what to repost". The strongest signal — **saves** — is buried and only in TikTok Studio.
- **Audience:** Regular TikTok creators who want to be data-driven without paying for SaaS analytics or handing an account to a third party. Especially value/utility/educational creators and small businesses.
- **What it solves:** Sortable, ranked on-page panel with badges, save-rate leaderboard, posting-time heatmap, hashtag/sound performance, repost radar, trends, watchlist, CSV/JSON export.
- **Why saves matter:** A like is cheap; a **save is intent** to return/use later → evergreen/utility value → the strongest "repost / make more" signal. This is the core thesis.
- **Why privacy-first:** Creators distrust account-access tools. 100% local = no account risk, no data selling, auditable open source. A trust differentiator *and* a Web Store approval advantage.
- **Differentiation:** No login/OAuth, no server, no subscription, no data leaving the device; reads only what you already see; open source; single-purpose decision tool, not a vanity dashboard.
- **Practical use:** Content planning · repost timing · hashtag/sound strategy · posting-time optimisation · spotting sleeper hits · export for reporting.

Positioned as a free creator tool. "Built by Byens IT" is maintainer credit only.

---

## 3. Current Feature Set

- **Capture (passive, local):** fetch/XHR hook (`inject.js`) + inline-state scan (`content.js`) over TikTok's own JSON (profile `item_list` + Studio analytics). Owner filter (verified 283/283, no For-You leak).
- **Panel (7 tabs):** Top (7 sorts) · Save-rate Leaderboard · Posting Times (7×24 heatmap) · Hashtags & Sounds · Repost Radar · Trends · Watchlist.
- **6 badges:** 🔁 Repost · 🔥 Make More · 🚀 Viral · 💾 Utility · 🆕 Too Early · ⚠️ Missing Fresh Data.
- **Filter & export:** period filter (All/7/28/90d/year/custom) · CSV + JSON · cover download · repurpose text pack.
- **Convenience:** robust "Fetch entire profile" harvester (v3.1.0: count-based + period-aware) · dark/light theme · one-click Clear.

---

## 4. Technical Architecture

MV3, modular, UMD (same modules run in content scripts and in Node tests). Pure compute core (parser/metrics) is DOM/chrome-free → unit-testable.

```
TikTok page (MAIN world)
  └─ inject.js: patches fetch + XHR, HINT pre-filter, JSON.parse,
     window.postMessage(targetOrigin = own origin)
        └─ content.js (ISOLATED world): source/kind guard →
           ingest(): detectOwner → parser.extractVideos →
           storage.upsert(max-wins + snapshot) → persist → ui.queueRender
              └─ ui.js: buildList (deriveOne + period + search) →
                 metrics.decorate (percentiles + score + badges) → render
background.js (service worker): cover download + toolbar badge
```

**Strengths:** privacy-first confirmed (no egress, same-origin postMessage, read-only hook); defensive coding (escapeHtml on all dynamic strings → no XSS; try/catch around chrome/hook calls; idempotent injection; ID regex validation); endpoint-agnostic field-allow-list + recursive walk (resilient to many response-shape changes); testable core + green CI; strong docs; working owner filter.

**Fragile:** percentiles on small N; silent breakage on field-rename/ID change; max-wins mixes metrics across time; velocity needs repeat 6h+ visits; saves depend entirely on TikTok Studio.

---

## 5. Current Weaknesses

*Severity = product/user impact. All empirically verified.*

### Correctness
| # | Issue | Sev | Location |
|---|---|---|---|
| W1 | Percentile small-N inflation (N=1 → score 100 + false Viral/Repost) | HIGH | `metrics.js:23-26` |
| W2 | Max-wins mixes metrics from different times → save-rate can exceed 100% | MED | `parser.js:155-156`, `storage.js:82-83` |
| W3 | Undated videos silently dropped from period filters | MED | `metrics.js:89` |
| W4 | velocity 0 sorted as -1 | LOW | `ui.js:41` |
| W5 | readTime drops some date formats | LOW | `parser.js:49-57` |

### Security
| # | Issue | Sev | Location |
|---|---|---|---|
| W6 | CSV formula injection (cells starting `= + - @`) | MED* | `export.js:15` |
| W7 | content.js does not validate `ev.origin` (local-store poisoning, no egress) | LOW | `content.js:26-31` |

\* Real-world risk low: only the creator's own videos are exported (owner filter). Still worth a trivial fix.

### Robustness / TikTok coupling (breakage is too silent)
| # | Issue | Sev | Location |
|---|---|---|---|
| W8 | Field rename fails silently with wrong/0 numbers | HIGH | `parser.js` + `constants.FIELDS` |
| W9 | ID-format change → silent empty panel | HIGH | `parser.js:38-44` |
| W10 | `parseWarnings` never resets → permanent false warning | MED | `parser.js:122/167`, `ui.js` |
| W11 | Owner detection bound to `/@username` URL | MED | `storage.js:43-49` |
| W12 | Hardcoded inline-state IDs + content-type gating drop some responses | MED | `content.js:52`, `inject.js:44,73-75` |

### UX / ops
| # | Issue | Sev |
|---|---|---|
| W13 | Harvester scroll-jank + re-entrancy | LOW |
| W14 | `onMessage` returns true for unmatched types | LOW |
| W15 | Storage has no `unlimitedStorage` (scaling ceiling) | LOW |
| W16 | Stale brand comments (`inject.js:2`, `background.js:2`) | LOW |
| W17 | Velocity slow to populate (6h+ gap) | INFO |

### Web Store
| # | Issue | Sev |
|---|---|---|
| **W18** | **No screenshots exist** (CWS requires ≥1, 1280×800) | **CRITICAL (blocker)** |
| W19 | Store name leads with "TikTok" trademark | HIGH |
| W20 | Privacy-policy URL serves raw markdown | LOW |

*(Note: dist ZIPs are NOT committed — `.gitignore` covers `dist/` + `*.zip`. Verified.)*

---

## 6. Recommended Scope (v3.2.0)

**Goal: correctness, trust, UX clarity, Web Store readiness. No cloud/login/tracking.**

- **Must:** screenshots (W18) · fix percentile small-N (W1) · parseWarnings reset + breakage signal (W10/W9) · trademark-safe store name (W19) · live re-verify built ZIP.
- **Should:** CSV injection guard (W6) · undated-video handling (W3) · consistent save-rate (W2) · data-quality indicators · badge legend.
- **Could:** velocity-0 sort (W4) · origin check (W7) · harvester jank/re-entrancy (W13) · onMessage return (W14) · brand comments (W16) · HTML-hosted policy (W20).
- **Not now:** content intelligence, multi-account, multi-platform, premium, watermark-free download (permanently out).

---

## 7. Roadmap

| Version | Theme | Content |
|---|---|---|
| **v3.1** (shipped) | Stability + harvest | Live-tested, robust period-aware harvester, privacy audit, ZIP. |
| **v3.2** | CWS readiness + correctness | Screenshots, small-N fix, breakage signal, trademark name, CSV guard, data-quality indicators, badge legend → **submit to Chrome Web Store**. |
| **v3.5** | Content intelligence | Deeper hook/hashtag/sound analysis, video-format clustering, end-to-end repost workflow, tunable thresholds. |
| **v4.0** | Creator dashboard | Richer dashboard, workspace import/export (local backup), multi-account local, better trend tracking. |
| **v5.0 / Endgame** | Multi-platform | TikTok → YouTube Shorts → Instagram Reels, same local architecture, still privacy-first; optional browser-only "pro" only if privacy preserved. |

---

## 8. Endgame Vision

Local-first social-media intelligence tool for one person: creator analytics cockpit · repost decision engine (the core differentiator) · content pattern finder · multi-platform local-first (the blue ocean — everyone else needs login+cloud) · lead magnet for Byens IT · OSS community · CWS distribution · optional privacy-preserving premium. The no-server model is a feature ("your data never leaves your machine"), not a limitation. Privacy is the moat — never break it.

---

## 9. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TikTok changes field names/response shape | High | Wrong/0 numbers or empty panel, silently | Better breakage detection + visible banner; broad allow-lists; community PRs; keep endpoint-agnostic walk. |
| Chrome Web Store rejection | Medium | Delays launch | Fix W18 (screenshots) + W19 (trademark name); permissions already minimal; no remote code confirmed. |
| Users misunderstand privacy | Medium | Trust loss | Pre-empt in reviewer notes + listing; host policy as HTML; soften "logged-in creator" → "profile you open". |
| Saves only in TikTok Studio | High (inherent) | Core feature partly unavailable on profile | Clear data-quality indicator + hint; never present save-rate as complete without Studio data. |
| Infinite-scroll incomplete data | Mitigated v3.1 | Missing videos | Already solved (count-based + period-aware harvester). |
| Too many features too early | Medium | Scope creep, instability | Freeze features until after CWS launch + v3.2 fixes. |
| Multi-platform scope creep | Medium (v5) | Dilutes focus, doubles parser maintenance | Harden TikTok first; multi-platform only with community. |

---

## 10. Next Actions

**To Chrome Web Store, in order:**
1. Capture 5-6 screenshots (1280×800). *Only hard blocker.*
2. Small v3.2.0 correctness pass (W1, W10, W6, W3 + data-quality + badge legend + tests).
3. Trademark-safe store name: `Creator Video Filter for TikTok`.
4. Live re-verify built ZIP in a clean Chrome profile.
5. (Optional) host privacy policy as HTML.
6. Submit.

**Do NOT yet:** v3.5+ content intelligence, multi-account, multi-platform, premium, watermark-free download, architecture rewrite.

**Single most important fix:** W1 (percentile small-N) — it makes the core recommendations wrong for exactly the new users a launch attracts.

**CWS-ready when:** technically it already passes the hard requirements except screenshots. With screenshots + trademark-safe name it can submit. Recommended: ship after the small v3.2.0 pass so the first public version is correct.
