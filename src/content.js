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

  function ingest(json) {
    if (!json || typeof json !== "object") return;
    S.detectOwner(location.pathname);
    var recs = P.extractVideos(json);
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
