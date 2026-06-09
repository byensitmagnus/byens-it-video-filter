# Byens IT – Video Filter (TikTok)

En gratis Chrome-udvidelse der hjælper TikTok-creators med at finde **deres mest virale videoer** og beslutte **hvad de skal lave mere af** og **hvad de skal reposte** – ved at læse dine egne tal (visninger, likes, gemte, gem-rate, velocity) direkte fra TikTok.

- 🔥 **Lav mere af** det der virker (rækkevidde + høj gem-rate)
- 🔁 **Repost-radar** for gamle vindere folk stadig gemmer
- 📊 Leaderboard, **bedste posting-tid**, hashtag-/lyd-analyse, view-velocity, perioder, watchlist, CSV/JSON-eksport, cover-download og repurpose-tekst

Alt kører **100% lokalt i din browser**. Ingen data sendes nogen steder hen.

---

## Sådan installerer du den

1. **Hent koden** – enten `git clone https://github.com/byensitmagnus/byens-it-video-filter.git` eller download som ZIP (grøn **Code**-knap → *Download ZIP*) og pak ud
2. Åbn Chrome og gå til `chrome://extensions`
3. Slå **Udviklertilstand** til (øverst til højre)
4. Klik **Indlæs upakket** / *Load unpacked*
5. Vælg den mappe du hentede (mappen der indeholder `manifest.json`)
6. Udvidelsen dukker op med det lilla/blå tragt-ikon 📥

> Kræver Chrome (eller Edge) version **111 eller nyere** – den bruger MV3 `world: "MAIN"` til at læse TikToks egne analytics-svar.

---

## Sådan bruger du den

Der er to arbejdsgange alt efter hvad du vil finde:

### A) Mest virale videoer over en bestemt periode  ← det primære
1. Gå til **din egen profil**: `tiktok.com/@ditbrugernavn`
2. Åbn panelet med den flydende **▼ Byens IT**-knap og tryk **⤓ Hent hele profilen** (auto-scroll) – eller scroll selv roligt ned. Udvidelsen fanger automatisk visninger, likes, **udgivelsesdato**, hashtags og lyd pr. video
3. Vælg en **periode** (Alle / 7 / 28 / 90 dage / I år / Custom) og en **fane** (Top, Leaderboard, …), og sortér fx på **Score** eller **Visninger**
4. Klik på en titel for at åbne videoen (sæt evt. dit brugernavn i pop-up'en til klikbare links)

> **Vigtigt:** kun videoer du har *scrollet forbi* får en dato. Vil du have et komplet periode-billede, så scroll hele profilen igennem mindst én gang. Tæl­leren på knappen (fx `153`) viser hvor mange der er fanget.

### B) Gemte (saves) – kræver TikTok Studio
1. Gå til `tiktok.com/tiktokstudio/analytics` → fanen **Indhold**
2. Scroll igennem – nu fanges også **gemte** pr. video (de er private og vises kun her)
3. Sortér på **Gemte** eller **Gem-rate**

Sæt **dit TikTok-brugernavn** i pop-up'en (klik ikonet), så bliver video-titlerne klikbare links.

### Faneblade
| Fane | Viser |
|------|-------|
| **Top** | Alle dine videoer – sortér på Score / Visninger / Likes / Gemte / Gem-rate / Velocity / Nyeste |
| **Leaderboard** | Gem-rate-leaderboard med percentil-badges (stærkeste "folk vil huske den"-signal) |
| **Posting-tid** | 7×24 heatmap over hvornår dine videoer klarer sig bedst + top-tidspunkter |
| **Hashtags & lyd** | Hvilke hashtags og lyde der giver flest gns. visninger |
| **Repost-radar** | Gamle vindere med høj gem-rate – med 1-klik "✓ Reposted" |
| **Trends** | Sammenlign perioder (Δ%) + sleeper hits (størst vækst siden sidst) |
| **★ Watchlist** | Videoer du har stjernemarkeret |

### Knapper & handlinger
- **Periode** (Alle/7/28/90 dage/I år/Custom) – filtrér på udgivelsesdato
- **⤓ Hent hele profilen** – auto-scroller hele profilen så alt fanges på ét klik
- Per video: **☆** watchlist · **⬇** hent cover · **↗** kopiér titel + hashtags (klar til Reels/Shorts)
- **CSV / JSON** – eksportér den aktive liste (respekterer filtre) · **◐** lys/mørk · **Ryd** – slet alt lokalt

### Badges
- **🔁 Repost** – top 20% på gemte
- **🔥 Lav mere** – over middel i visninger *og* top 30% gem-rate
- **🚀 Stiger** – hurtig vækst siden sidste besøg (sleeper hit)
- **🆕 Ny** – under 7 dage, for tidligt at dømme · **⚠** – friske tal mangler

---

## Hvorfor skal jeg scrolle? Hvorfor ikke bare hente det hele?

TikTok udleverer ikke "gemte" (saves) offentligt – de tal kan **kun** ses af dig som ejer inde i TikTok Studio. Udvidelsen aflæser de samme JSON-svar som Studio selv henter, efterhånden som du scroller. Derfor: jo mere du scroller igennem dine videoer i Analytics, jo mere komplet bliver listen.

---

## Virker der ikke noget?

- **Panelet siger "Ingen data endnu"** → sørg for at du er på `tiktok.com/tiktokstudio` og har åbnet **Indhold/Posts**-fanen, og scroll lidt. Genindlæs evt. siden.
- **Gemte viser "–"** → den måling fandtes ikke i det svar – du er sandsynligvis på en offentlig profilside i stedet for Studio Analytics.
- **Tallene matcher ikke 100%** → udvidelsen tager det højeste tal den har set pr. video. Ryd data og scroll igen for et frisk øjebliksbillede.
- **Intet ikon / fejl ved indlæsning** → tjek at Chrome er ≥ 111 og at hele mappen (med `manifest.json`) blev valgt.

---

## Teknisk (kort)

| Fil | Rolle |
|-----|-------|
| `manifest.json` | MV3-opsætning, kører kun på `*.tiktok.com` |
| `src/inject.js` | Kører i sidens kontekst (MAIN world), hooker `fetch`/`XHR` og videresender JSON-svar |
| `src/content.js` | Normaliserer data, gemmer i `chrome.storage.local`, tegner panelet |
| `src/panel.css` | Styling (alt prefixet `.bitvf-`) |
| `popup/*` | Lille pop-up: åbn analytics, vis/skjul panel, sæt brugernavn |
| `tools/icongen.ps1` | Genererer ikonerne (kun til build, ikke en del af kørslen) |

Feltnavne aflæses fleksibelt (`play_count`, `digg_count`, `collect_count`, osv.), så udvidelsen overlever mindre ændringer i TikToks API. Skifter TikTok markant, kan listerne i `F = { ... }` øverst i `src/content.js` udvides.

---

## Licens

MIT – brug, kopiér og tilpas frit. Bygget af [Byens IT](https://byens-it.dk).

*Virker på din egen TikTok-konto. Ingen TikTok-login-data, cookies eller indhold forlader din browser.*
