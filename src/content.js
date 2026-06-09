/*
 * TikTok Creator Video Filter · content.js (ISOLATED world) — orchestrator
 * Wires the inject.js capture stream -> parser -> storage -> ui.
 * Loaded LAST; depends on constants/parser/metrics/storage/export/ui being loaded first.
 */
;(function (root, factory) {
  "use strict";
  function dep(name) { return (typeof require === "function") ? require("./" + name + ".js") : (root.BITVF && root.BITVF[name]); }
  factory(dep("parser"), dep("storage"), dep("ui"));
})(typeof self !== "undefined" ? self : this, function (P, S, UI) {
  "use strict";
  if (window.__bitVFLoaded) return;
  window.__bitVFLoaded = true;

  var everParsed = false; // har NOGET svar parset videoer i denne side-session?

  function ingest(json) {
    if (!json || typeof json !== "object") return;
    S.detectOwner(location.pathname);
    var recs = P.extractVideos(json);
    // Brud-signal: flag kun hvis INTET svar i denne side-session har kunnet
    // parses. TikTok-sider sender mange svar med stat-containere der ikke er
    // videoer (bruger-/hashtag-stats m.fl.) — dem må et sundt item_list-parse
    // ikke kunne overdøves af. Ved ægte format-brud parser intet → banner.
    var st = P.getStats();
    if (st.parsed > 0) {
      everParsed = true;
      S.setParseHealth({ ok: true, looked: st.looked, unreadable: st.unreadable, at: Date.now() });
    } else if (!everParsed && st.unreadable >= 3) {
      S.setParseHealth({ ok: false, looked: st.looked, unreadable: st.unreadable, at: Date.now() });
      UI.queueRender(); // vis brud-banner selv når intet kunne gemmes
    }
    if (!recs.length) return;
    for (var i = 0; i < recs.length; i++) S.upsert(recs[i]);
    S.persist();
    UI.queueRender();
  }

  // Captured JSON forwarded from inject.js (MAIN world)
  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    var d = ev.data;
    if (!d || d.source !== "bit-vf" || d.kind !== "capture") return;
    try { ingest(d.payload && d.payload.json); } catch (e) {}
  });

  // Messages from the popup
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg) return;
      if (msg.type === "bit-toggle") { UI.toggle(true); sendResponse({ ok: true, count: S.ownCount() }); }
      else if (msg.type === "bit-count") { sendResponse({ count: S.ownCount() }); }
      else if (msg.type === "bit-set-username") { S.setUsername(msg.username || ""); UI.queueRender(); sendResponse({ ok: true }); }
      return true;
    });
  } catch (e) {}

  // Popup'en kan ændre Buffer-config i storage — genindlæs så panelet opdateres.
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "local" && changes.bit_settings) { S.reloadSettings(function () { UI.queueRender(); }); }
    });
  } catch (e) {}

  // TikTok ships initial data inline (SIGI_STATE / __UNIVERSAL_DATA__)
  function scanInlineState() {
    var sels = ["#SIGI_STATE", "#__UNIVERSAL_DATA_FOR_REHYDRATION__", 'script[type="application/json"]'];
    for (var s = 0; s < sels.length; s++) {
      var nodes = document.querySelectorAll(sels[s]);
      for (var i = 0; i < nodes.length; i++) {
        var txt = nodes[i].textContent || "";
        if (txt.length < 40 || txt.length > 6000000) continue;
        if (!/count|views?|like|collect|favou?rite|play|aweme|item/i.test(txt)) continue;
        try { ingest(JSON.parse(txt)); } catch (e) {}
      }
    }
  }

  S.load(function () {
    S.detectOwner(location.pathname);
    S.pruneNonOwn();
    UI.init();
    scanInlineState();
    setTimeout(scanInlineState, 2500);
    setTimeout(scanInlineState, 6000);
  });
});
