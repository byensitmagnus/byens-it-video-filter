/*
 * TikTok Creator Video Filter · background.js (MV3 service worker)
 *
 * To opgaver:
 *   1. Download af cover-/thumbnail-billeder (chrome.downloads kan ikke kaldes
 *      fra content-scripts, og krydsoprindelses-billeder kan ikke hentes med en
 *      simpel <a download>, så vi router det her).
 *   2. Tæller-badge på værktøjslinje-ikonet.
 *
 * Workeren laver INGEN netværkskald af sig selv og sender ingen data nogen steder.
 */

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === "bit-download" && msg.url) {
    try {
      chrome.downloads.download(
        {
          url: msg.url,
          filename: msg.filename || "tiktok-creator-video-filter-download",
          saveAs: !!msg.saveAs
        },
        function (id) {
          var err = chrome.runtime.lastError;
          sendResponse({ ok: !err && id != null, error: err ? err.message : null });
        }
      );
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
    return true; // async svar
  }

  // OPT-IN Buffer-kald. UI sender en færdigbygget request-deskriptor (fra
  // src/buffer.js); workeren udfører det krydsoprindelses-fetch (kun api.buffer.com
  // via host_permissions). Intet sendes nogensinde uden brugerens klik.
  if (msg.type === "bit-buffer" && msg.request && /^https:\/\/api\.buffer\.com\//.test(msg.request.url + "/")) {
    try {
      fetch(msg.request.url, { method: msg.request.method || "POST", headers: msg.request.headers, body: msg.request.body })
        .then(function (r) { return r.text().then(function (t) { return { status: r.status, text: t }; }); })
        .then(function (res) {
          var json = null; try { json = JSON.parse(res.text); } catch (e) { /* ignore */ }
          var gqlErr = json && json.errors && json.errors.length ? json.errors[0].message : null;
          sendResponse({ ok: res.status >= 200 && res.status < 300 && !gqlErr, status: res.status, data: json, error: gqlErr });
        })
        .catch(function (e) { sendResponse({ ok: false, error: String(e) }); });
    } catch (e) { sendResponse({ ok: false, error: String(e) }); }
    return true; // async svar
  }

  if (msg.type === "bit-badge") {
    try {
      var n = msg.count || 0;
      var text = n > 0 ? (n > 999 ? "999+" : String(n)) : "";
      chrome.action.setBadgeText({ text: text });
      chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
    } catch (e) {}
    sendResponse({ ok: true });
    return true;
  }
});
