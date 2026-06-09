# Privacy Policy

**Extension:** Byens IT – Video Filter (TikTok)
**Publisher:** Byens IT ([byens-it.dk](https://byens-it.dk))
**License:** MIT (free and open source)
**Source code:** <https://github.com/byensitmagnus/byens-it-video-filter>
**Effective date:** 2026-06-09

---

## Kort fortalt (in short)

**Dansk:**
Denne udvidelse gemmer **alt lokalt på din egen computer** (i `chrome.storage.local`). Den sender **intet** til nogen server. Der er **ingen** analytics, ingen telemetri, ingen tracking, ingen reklamer, ingen fjernkode og ingen videresalg af data. Udvidelsen læser kun de TikTok-data, som TikTok allerede sender til siden i din browser, og den behandler **kun dine egne videoer** som logget-ind creator. Du kan til enhver tid slette alt med knappen **"Ryd data"** i panelet eller ved at fjerne udvidelsen.

**English:**
This extension stores **everything locally on your own computer** (in `chrome.storage.local`). It transmits **nothing** to any server. There is **no** analytics, no telemetry, no tracking, no ads, no remote code, and no selling of data. It only reads the TikTok data that TikTok already sends to the page in your browser, and it only processes **your own videos** as the logged-in creator. You can delete everything at any time using the **"Ryd data"** button in the panel or by removing the extension.

---

## 1. Who we are

Byens IT is a Danish gaming-PC retailer. We publish this Chrome extension as a free, open-source tool for TikTok creators to analyze their own content. The full source code is public so anyone can verify exactly what the extension does.

## 2. What the extension does

The extension runs **only** on `https://*.tiktok.com/*`. When you browse your own TikTok profile or TikTok Studio analytics, the extension reads the JSON data that **TikTok itself already sends to the page** — by observing the page's own network calls (`fetch`/`XHR`). Specifically, it reads:

- The creator's own profile video list (TikTok's `item_list` response).
- TikTok Studio analytics responses.

From those responses it extracts metrics for **your own videos**: views, likes, comments, shares, saves, post date, hashtags, and sound. It then shows a local on-page panel that helps you analyze your content — for example: a leaderboard, best-posting-time analysis, hashtag and sound performance, view-velocity over time, a repost radar, a watchlist, CSV/JSON export, cover-image download, and a repurpose text pack.

The extension does **not** make its own network requests. It only reads data that TikTok already delivers to your browser as part of pages you are already viewing.

## 3. The "owner filter" — only your own videos

The extension includes an **owner filter** that ensures only the **logged-in creator's own videos** are processed. Videos by other authors (for example, items that appear in the "For You" feed) are discarded and not stored or analyzed.

## 4. What data is stored, and where

All data the extension keeps is stored **locally only**, in your browser's `chrome.storage.local`, on your own machine. This includes:

- The captured video metrics described above.
- Time-series snapshots (so the panel can show changes over time, such as view velocity).
- Your watchlist.
- Your settings.

**Nothing is uploaded, synced to a server, or transmitted off your device by the extension.** There is no backend, no cloud storage, and no account or login required for the extension itself.

## 5. What we do NOT collect or do

To be explicit, the extension does **not**:

- Send any data to any server or third party.
- Use analytics, telemetry, or tracking of any kind.
- Show ads.
- Sell, rent, or share your data with anyone.
- Load or execute remote code.
- Make any external network calls of its own.
- Collect personal information beyond the TikTok metric data described above, which stays on your device.

## 6. Permissions and why they are needed

The extension requests the minimum permissions required to function:

| Permission | Why it is needed |
|---|---|
| `storage` | To save the captured metrics, time-series snapshots, watchlist, and settings **locally** in your browser. |
| `downloads` | So you can save a video's cover image and export CSV/JSON files to your **own disk**, only when you choose to. |
| `host_permissions: https://*.tiktok.com/*` | To run the content script and read the TikTok API responses on the TikTok pages you are already viewing. This is required for the extension to work, and it limits the extension strictly to TikTok. |

The extension does not request access to any site other than TikTok.

## 7. Third-party sharing

**None.** No data is shared with Byens IT, with TikTok beyond your normal use of their site, or with any other third party. The extension has no servers and makes no calls to Byens IT or any other endpoint.

## 8. Data retention and deletion

Your data stays on your device until **you** decide to remove it. You are in full control:

- Click **"Ryd data"** ("Clear data") in the panel to delete the stored data at any time.
- Remove or uninstall the extension to delete all of its locally stored data.

We cannot access, recover, or delete your data for you, because we never receive it — it only ever exists in your own browser.

## 9. Children's privacy

This extension is a tool for TikTok creators and is **not directed at children**. It does not knowingly collect personal information from children. Because no data ever leaves your device, the extension does not transmit or collect any information — from children or anyone else — to us or any third party.

## 10. Changes to this policy

We may update this privacy policy from time to time, for example if the extension's features change. When we do, we will update the **effective date** at the top of this document and publish the revised version in the public repository. Material changes will be reflected in the repository history, which you can review at any time.

## 11. Contact

If you have questions about this policy or the extension's privacy practices, you can reach us:

- **GitHub issues:** <https://github.com/byensitmagnus/byens-it-video-filter/issues>
- **Email:** byensitdk@gmail.com

---

*This extension is open source under the MIT license. You are welcome to read the source code at <https://github.com/byensitmagnus/byens-it-video-filter> to verify everything described in this policy.*
