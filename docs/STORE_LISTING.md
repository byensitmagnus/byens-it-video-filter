# Chrome Web Store – Listing & Submission Guide

**Udvidelse:** Byens IT – Video Filter (TikTok)
**Publisher:** Byens IT ([byens-it.dk](https://byens-it.dk))
**Repo:** <https://github.com/byensitmagnus/byens-it-video-filter>
**Licens:** MIT (gratis, open source) · **Manifest:** V3

Dette dokument er en **paste-klar** pakke til Chrome Web Store Developer Dashboard. Vejledningsteksten er på **dansk**; selve butiks-teksten leveres i **både engelsk og dansk**. Kopiér felterne direkte ind i dashboardet.

> **Sprogstrategi:** Vælg **English (United States)** som primært sprog (størst rækkevidde og krævet som fallback) og brug den engelske copy. Tilføj derefter en **Danish (da)**-lokalisering i dashboardet med den danske copy nedenfor. Begge varianter er klar herunder.

---

## ⚠️ Før du indsender (pre-flight) — læs dette først

Disse punkter SKAL bringes i orden, ellers afvises listingen eller bliver upræcis:

1. **`manifest.json` mangler `downloads`-permission.** Den nuværende manifest har kun `"permissions": ["storage"]`, men både butiks-teksten, `PRIVACY.md` og features (CSV/JSON-eksport, cover-download) forudsætter `downloads`. To valg:
   - **(Anbefalet, matcher teksten)** Tilføj `downloads` til manifest og lad eksport/cover-download gå via `chrome.downloads`. Så stemmer permission-begrundelsen i afsnit 6 100%.
   - **(Alternativ)** Drop `downloads` helt. CSV-eksporten i `src/content.js` bruger i dag en Blob + `<a download>`-anchor (linje ~646–649), som **ikke** kræver `downloads`-permission. Vælger du dette, så **fjern** `downloads`-rækken fra afsnit 6 og 7 i dette dokument og fra `PRIVACY.md`, og fjern cover-download som feature i teksten.
   - Vær konsekvent: manifest, dette dokument og `PRIVACY.md` skal sige det samme. **Reviewere afviser, hvis en deklareret permission ikke bruges, eller hvis en brugt permission ikke er deklareret.**
2. **`tools/package.ps1` findes ikke endnu.** Kun `tools/icongen.ps1` ligger i repoet. Afsnit 9 antager et `package.ps1`-script — opret det (forslag i afsnit 9) eller zip mappen manuelt.
3. **Hav `PRIVACY.md` offentligt tilgængelig på en URL.** Dashboardet kræver et **link** til privatlivspolitik. GitHub-rå-URL'en virker: `https://github.com/byensitmagnus/byens-it-video-filter/blob/main/PRIVACY.md`.
4. **Verificér publisher/brand.** Listingen udgives under **Byens IT**-brandet. Brug en developer-konto knyttet til Byens IT (gerne `byensitdk@gmail.com`) og sæt en konsistent publisher-visningsnavn.

---

## 1. Store name (≤ 45 tegn)

**Primært navn (anbefalet) — 31 tegn:**

```
Byens IT – Video Filter (TikTok)
```

> Bemark: tegnet `–` (en-dash) og `()` tæller med. Navnet er 32 tegn inkl. mellemrum — vel under 45.

**Alternativer (alle ≤ 45 tegn):**

```
Byens IT – TikTok Video Analyzer (Own)
```
```
Byens IT – My TikTok Video Filter
```
```
TikTok Own-Video Filter – Byens IT
```

---

## 2. Summary / short description (≤ 132 tegn)

### English (primær)

```
Analyze YOUR OWN TikTok videos: sort by views, likes & saves to see what to make more of and repost. 100% local, no data sent.
```
*(126 tegn)*

**Alternativer (EN):**
```
Filter your own TikTok videos by views, likes, saves & save-rate. Find your winners to repost. Runs 100% locally in your browser.
```
```
See what to make more of on TikTok: rank your own videos by save-rate & engagement, find reposts. Private, local-only, no tracking.
```

### Dansk (da-lokalisering)

```
Analysér DINE EGNE TikTok-videoer: sortér på visninger, likes og gemte – se hvad du skal lave mere af og reposte. 100% lokalt.
```
*(124 tegn)*

**Alternativer (DA):**
```
Filtrér dine egne TikTok-videoer på visninger, likes, gemte og gem-rate. Find dine vindere til repost. Kører 100% lokalt.
```
```
Se hvad du skal lave mere af på TikTok: ranger dine egne videoer på gem-rate og engagement. Privat, lokal-kun, ingen tracking.
```

---

## 3. Detailed description (paste-klar)

### English

```
Byens IT – Video Filter helps a TikTok creator answer one question fast: what should I make more of, and what should I repost?

It reads TikTok's own JSON responses — your profile's video list and your TikTok Studio analytics — right in your browser as you scroll, and shows an on-page panel that ranks and filters YOUR OWN videos. Nothing is uploaded. There is no account, no tracking, no ads, and no remote code. Everything runs 100% locally on your machine, and an owner filter makes sure only your own videos are ever processed — items from the For You feed or other creators are discarded.

Stop guessing which videos are working. Sort by views, likes, saves and save-rate, narrow to a time period, and let a combined "make-more-of" score surface the content worth doubling down on. Saves are the strongest "people want to come back to this" signal — and they're private, visible only to you as the owner — so the extension turns them into an actual leaderboard.

WHAT YOU CAN DO
• Sort & filter your own videos by views, likes, saves, save-rate, engagement, and time period
• Combined "make-more-of" score to find your strongest content
• Gem-rate (save-rate) leaderboard with percentile badges
• Best-posting-time 7×24 heatmap built from your post timestamps
• Hashtag & sound performance breakdown
• View-velocity & "sleeper hit" detection from locally stored time-series snapshots
• Repost radar to resurface evergreen winners
• Watchlist to track specific videos
• CSV / JSON export and cover-image download to your own disk
• Repurpose text pack for Reels / Shorts
• Auto-scroll harvester to capture your library quickly
• Dark / light theme

PRIVACY FIRST
• 100% local — data lives only in your browser's storage
• No data collected, transmitted, sold, or shared
• No analytics, no telemetry, no ads, no remote code
• Owner-filtered to your own account only
• Open source (MIT) — read every line at github.com/byensitmagnus/byens-it-video-filter

HOW IT WORKS
The extension runs only on tiktok.com. As you browse your profile or TikTok Studio analytics, it observes the JSON that TikTok already sends to the page and extracts metrics for your own videos. It makes no network requests of its own. Clear everything any time with the "Clear data" button, or by removing the extension.

Built by Byens IT (byens-it.dk), a Danish gaming-PC retailer, and released free for the creator community.
```

### Dansk

```
Byens IT – Video Filter hjælper dig som TikTok-creator med at svare hurtigt på ét spørgsmål: hvad skal jeg lave mere af, og hvad kan jeg reposte?

Udvidelsen aflæser TikToks egne JSON-svar — din profils videoliste og din TikTok Studio-analytics — direkte i din browser, mens du scroller, og viser et panel på siden, der rangerer og filtrerer DINE EGNE videoer. Intet uploades. Der er ingen konto, ingen tracking, ingen reklamer og ingen fjernkode. Alt kører 100% lokalt på din maskine, og et ejer-filter sikrer, at kun dine egne videoer behandles — videoer fra For You-feedet eller andre creators kasseres.

Hold op med at gætte på, hvad der virker. Sortér på visninger, likes, gemte og gem-rate, afgræns til en periode, og lad en kombineret "lav-mere-af"-score løfte det indhold frem, der er værd at satse mere på. Gemte er det stærkeste signal på "folk vil vende tilbage til den" — og de er private, kun synlige for dig som ejer — så udvidelsen gør dem til en rigtig leaderboard.

DET KAN DU
• Sortér og filtrér dine egne videoer på visninger, likes, gemte, gem-rate, engagement og periode
• Kombineret "lav-mere-af"-score, der finder dit stærkeste indhold
• Gem-rate-leaderboard med percentil-badges
• Bedste-udgivelsestid 7×24-heatmap bygget på dine post-tidspunkter
• Hashtag- og lyd-performance
• View-velocity og "sleeper hit"-detektion fra lokalt gemte tids-snapshots
• Repost-radar, der genfinder evergreen-vindere
• Watchlist til at følge bestemte videoer
• CSV/JSON-eksport og download af cover-billede til din egen disk
• Repurpose-tekstpakke til Reels/Shorts
• Auto-scroll-høster, der fanger dit bibliotek hurtigt
• Mørkt/lyst tema

PRIVATLIV FØRST
• 100% lokalt — data ligger kun i din browsers storage
• Ingen data indsamles, sendes, sælges eller deles
• Ingen analytics, ingen telemetri, ingen reklamer, ingen fjernkode
• Ejer-filtreret til kun din egen konto
• Open source (MIT) — læs hver linje på github.com/byensitmagnus/byens-it-video-filter

SÅDAN VIRKER DEN
Udvidelsen kører kun på tiktok.com. Mens du browser din profil eller TikTok Studio-analytics, aflæser den de JSON-svar, TikTok allerede sender til siden, og udtrækker tal for dine egne videoer. Den laver ingen netværkskald selv. Ryd alt når som helst med "Ryd data"-knappen eller ved at fjerne udvidelsen.

Bygget af Byens IT (byens-it.dk), en dansk gaming-PC-forhandler, og udgivet gratis til creator-fællesskabet.
```

---

## 4. Kategori & primært sprog

| Felt | Værdi |
|---|---|
| **Category** | **Productivity** (alternativt *Tools* / *Workflow & Planning*, hvis dashboardet bruger den taksonomi). Undgå "Social & Communication" — udvidelsen er et analyse-/produktivitetsværktøj, ikke en social-feature. |
| **Primary language** | **English (United States)** |
| **Yderligere lokalisering** | **Danish (da)** — tilføj med den danske copy ovenfor |

---

## 5. SINGLE PURPOSE statement

Indsæt ordret i feltet **"Single purpose"**:

### English
```
The single purpose of this extension is to help a TikTok creator analyze their own TikTok videos — locally and only on tiktok.com — so they can decide what content to make more of and what to repost.
```

### Dansk
```
Udvidelsens ene formål er at hjælpe en TikTok-creator med at analysere sine egne TikTok-videoer — lokalt og kun på tiktok.com — så vedkommende kan beslutte, hvad der skal laves mere af, og hvad der skal repostes.
```

---

## 6. PERMISSION JUSTIFICATIONS

> Indsæt hver begrundelse i det tilsvarende felt under **"Privacy practices" → "Permission justification"** i dashboardet. Hold dem korte og konkrete — det er præcis det, reviewere efterspørger. Teksterne herunder matcher `PRIVACY.md`.

### `storage`
```
Used to save the captured video metrics, time-series snapshots, the user's watchlist, and settings locally in the browser's chrome.storage.local. This local storage is what lets the panel rank videos, show changes over time (view velocity), and remember the user's preferences between visits. No stored data is transmitted anywhere.
```

### `downloads`
```
Used only when the user explicitly chooses to export their data — to save a CSV or JSON file of their own video metrics, or to download a video's cover image, directly to their own disk. The permission is never used for automatic or background downloads; it is triggered solely by a user click in the panel.
```
> ⚠️ Kun relevant hvis du tilføjer `downloads` til manifest (se pre-flight pkt. 1). Hvis CSV/JSON bliver ved Blob-anchor og du dropper cover-download, så **udelad** dette felt og fjern `downloads` fra manifest og `PRIVACY.md`.

### Host permission `https://*.tiktok.com/*`
```
Required so the content script can run on TikTok pages and read the JSON responses that TikTok itself already sends to the page (the creator's own profile item_list and TikTok Studio analytics). Access is strictly limited to tiktok.com — the extension requests no other host — and it reads only data already delivered to the page the user is viewing. It makes no network requests of its own.
```

### Remote code — Are you using remote code? **NO**
```
No. This extension does not use, load, or execute any remote code. All JavaScript and CSS are packaged inside the extension and reviewed as part of the upload. The extension does not fetch or eval external scripts, does not pull configuration or code from any server, and makes no network requests of its own. It only reads JSON that TikTok already delivers to the page in the user's browser. The full source is public at github.com/byensitmagnus/byens-it-video-filter.
```

---

## 7. Data usage / privacy disclosures (data-collection-formularen)

I dashboardets **"Privacy practices" → "Data usage"** skal du udfylde data-typer og afkrydsninger. Brug følgende:

**Collected data types — sæt INGEN flueben.** Udvidelsen indsamler ingen af kategorierne (Personally identifiable information, Health, Financial, Authentication, Personal communications, Location, Web history, User activity, Website content). Alt forbliver lokalt og forlader aldrig enheden.

**Tre obligatoriske certificeringer — sæt flueben i ALLE tre:**

- ☑ **I do not sell or transfer user data to third parties**, outside of the approved use cases.
- ☑ **I do not use or transfer user data for purposes that are unrelated to my item's single purpose.**
- ☑ **I do not use or transfer user data to determine creditworthiness or for lending purposes.**

**Privacy policy URL (obligatorisk felt):**
```
https://github.com/byensitmagnus/byens-it-video-filter/blob/main/PRIVACY.md
```

**Kort disclosure-tekst (hvis et fritekstfelt tilbydes):**

### English
```
This extension does NOT collect, use, transmit, or sell any user data. All processing happens locally in the user's browser; data is stored only in chrome.storage.local on the user's own device. There is no backend, no analytics, no telemetry, no ads, and no remote code. Only the logged-in creator's own TikTok videos are processed (owner-filtered). Full privacy policy: https://github.com/byensitmagnus/byens-it-video-filter/blob/main/PRIVACY.md
```

### Dansk
```
Denne udvidelse indsamler, bruger, sender eller sælger IKKE nogen brugerdata. Al behandling sker lokalt i brugerens browser; data gemmes kun i chrome.storage.local på brugerens egen enhed. Ingen backend, ingen analytics, ingen telemetri, ingen reklamer og ingen fjernkode. Kun den loggede creators egne TikTok-videoer behandles (ejer-filtreret). Fuld privatlivspolitik: https://github.com/byensitmagnus/byens-it-video-filter/blob/main/PRIVACY.md
```

---

## 8. Assets checklist

| Asset | Krav | Status |
|---|---|---|
| **Store-ikon 128×128 PNG** | Påkrævet | ✅ Findes: `icons/icon128.png` |
| **Mindst 1 screenshot** | 1280×800 **eller** 640×400 PNG/JPEG (1280×800 anbefales). Op til 5. | ⬜ Skal laves — se ideer nedenfor |
| **Small promo tile 440×280** | Valgfrit (men pænt til søgeresultater) | ⬜ Valgfrit |
| **Marquee promo 1400×560** | Valgfrit (kun til featured) | ⬜ Spring over |

> **Tip:** Lav screenshots i 1280×800. Brug en demo-/test-TikTok-konto eller slør (blur) brugernavne/thumbnails du ikke vil vise. Læg gerne en kort dansk eller engelsk billedtekst øverst i hvert screenshot, så værdien er tydelig uden at læse beskrivelsen.

### 4–6 konkrete screenshot-ideer (til netop denne udvidelse)

1. **Panelet åbent med rangeret videoliste** — sorteret på *Visninger* over en valgt periode, med 🔥 "Lav mere" / 🔁 "Repost"-badges synlige. Overskrift: *"Find dine vindere på sekunder."*
2. **Gem-rate-leaderboard med percentil-badges** — fremhæver at saves er det private "kom-tilbage"-signal kun ejeren ser. Overskrift: *"Gem-rate = dit stærkeste signal."*
3. **Best-posting-time 7×24 heatmap** — farvet uge/time-grid bygget på post-tidspunkter. Overskrift: *"Hvornår skal du poste?"*
4. **View-velocity / "sleeper hit"-graf** — en video der tager fart efter udgivelse, fra de lokale tids-snapshots. Overskrift: *"Fang dine sleeper hits."*
5. **Hashtag- & lyd-performance-visning** — tabel/bar der rangerer hashtags/lyde efter performance.
6. **Privacy/eksport-skærm** — viser "Ryd data"-knappen, CSV/JSON-eksport og en tydelig "100% lokalt"-note. Overskrift: *"100% lokalt. Ingen data sendes."*

---

## 9. Step-by-step submission-checklist

> Listingen udgives under **Byens IT**-brandet. Brug en developer-konto tilknyttet Byens IT (fx `byensitdk@gmail.com`) og et konsistent publisher-visningsnavn ("Byens IT").

**A. Engangsopsætning**
1. ⬜ Opret/log ind på en Google-konto til Byens IT.
2. ⬜ Gå til **Chrome Web Store Developer Dashboard** (`chrome.google.com/webstore/devconsole`).
3. ⬜ Betal **$5 engangs-registreringsgebyr** for developer-kontoen (kræves før første publicering).
4. ⬜ Sæt **publisher display name** til **Byens IT** og verificér kontakt-email.

**B. Byg pakken**
5. ⬜ Bring `manifest.json` i orden ift. pre-flight pkt. 1 (`downloads` med eller fjern den konsekvent). Tjek at `version` (`1.0.0`) er korrekt.
6. ⬜ Zip en ren build. Hvis `tools/package.ps1` findes: kør det. Ellers opret det (forslag herunder) eller zip manuelt.

   Forslag til `tools/package.ps1` (zipper kun de filer extensionen skal bruge — ikke `.git`, `docs/`, `tools/`):
   ```powershell
   # tools/package.ps1 — bygger byens-it-video-filter.zip til Chrome Web Store
   $root = Split-Path $PSScriptRoot -Parent
   $out  = Join-Path $root 'byens-it-video-filter.zip'
   if (Test-Path $out) { Remove-Item $out -Force }
   $include = @('manifest.json','icons','src','popup')
   $paths = $include | ForEach-Object { Join-Path $root $_ }
   Compress-Archive -Path $paths -DestinationPath $out -Force
   Write-Host "Wrote $out"
   ```
   Kør: `pwsh -File tools/package.ps1` (eller `powershell -File tools\package.ps1`).

7. ⬜ Verificér zip'en: udpak til en tom mappe, indlæs som *Load unpacked* i `chrome://extensions`, og bekræft at panelet virker på en TikTok-profil/Studio-side.

**C. Opret listingen i dashboardet**
8. ⬜ Klik **"Add new item"** → upload zip'en.
9. ⬜ **Store listing**-fanen: indsæt **Name** (afsnit 1), **Summary** (afsnit 2), **Detailed description** (afsnit 3). Vælg **Category = Productivity** (afsnit 4).
10. ⬜ Upload **assets**: ikon (allerede i pakken), mindst 1 screenshot 1280×800 (afsnit 8), evt. promo-tile.
11. ⬜ Tilføj **Danish (da)**-lokalisering og indsæt den danske copy (afsnit 1–3).

**D. Privacy practices-fanen**
12. ⬜ Indsæt **Single purpose** (afsnit 5).
13. ⬜ Indsæt **permission justifications** for `storage`, `downloads` (hvis brugt), og host-permission (afsnit 6).
14. ⬜ Besvar **"Are you using remote code?" → NO** med begrundelsen (afsnit 6).
15. ⬜ Udfyld **Data usage**: ingen data-typer afkrydset, sæt de **tre certificeringer**, indsæt **privacy policy URL** (afsnit 7).

**E. Indsend**
16. ⬜ Vælg distribution (offentlig) og evt. lande/synlighed.
17. ⬜ Gennemlæs alt mod dette dokument én sidste gang (især at manifest-permissions = afsnit 6 = `PRIVACY.md`).
18. ⬜ Klik **"Submit for review"**.
19. ⬜ Forvent gennemgang (typisk få dage). Svar hurtigt, hvis en reviewer beder om afklaring — henvis til den offentlige kildekode og `PRIVACY.md`.

---

*Dokument vedligeholdt sammen med kildekoden. Sidst opdateret: 2026-06-09. Bygget af Byens IT — byens-it.dk.*
