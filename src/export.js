/*
 * TikTok Creator Video Filter · export.js
 * CSV/JSON-byggere (rene) + browser-download-hjælpere.
 * UMD: self.BITVF.export.
 */
;(function (root, factory) {
  "use strict";
  var C = (typeof require === "function") ? require("./constants.js") : (root.BITVF && root.BITVF.constants);
  var api = factory(C);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof self !== "undefined") { root.BITVF = root.BITVF || {}; root.BITVF.export = api; }
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";

  function csvCell(s) { s = String(s == null ? "" : s).replace(/"/g, '""'); return /[";\n\r]/.test(s) ? '"' + s + '"' : s; }
  function isoDate(ms) { return ms ? new Date(ms).toISOString().slice(0, 10) : ""; }

  // urlFor(record) -> string|null
  function buildCsv(list, urlFor) {
    var head = ["Rank", "Title", "Date", "Views", "Likes", "Comments", "Shares", "Saves", "SaveRate%", "Engagement%", "Velocity/day", "Score", "Sound", "URL"];
    var lines = [head.join(";")];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      lines.push([
        i + 1, csvCell(r.title || ""), isoDate(r.created), r.views, r.likes, r.comments, r.shares, r.saves,
        ((r.saveRate || 0) * 100).toFixed(2), ((r.engagement || 0) * 100).toFixed(2),
        (r.velocity != null ? Math.round(r.velocity) : ""), r.score == null ? "" : r.score,
        csvCell(r.musicTitle || ""), csvCell((urlFor && urlFor(r)) || "")
      ].join(";"));
    }
    return "﻿" + lines.join("\r\n");
  }
  function buildJson(list, urlFor) {
    return JSON.stringify(list.map(function (r) {
      return {
        id: r.id, title: r.title, url: (urlFor && urlFor(r)) || null,
        created: r.created ? new Date(r.created).toISOString() : null,
        views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, saves: r.saves,
        saveRate: +(r.saveRate || 0).toFixed(4), engagement: +(r.engagement || 0).toFixed(4),
        velocity: r.velocity != null ? Math.round(r.velocity) : null, score: r.score == null ? null : r.score,
        sound: r.musicTitle || null
      };
    }), null, 2);
  }

  function downloadText(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.documentElement.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function stamp() { return new Date().toISOString().slice(0, 10); }

  // Cover-download går via service workeren (krydsoprindelse).
  function downloadCover(record, done) {
    if (!record || !record.thumbnail) { if (done) done(false); return; }
    var fn = C.DOWNLOAD_PREFIX + "-cover-" + record.id + ".jpg";
    try { chrome.runtime.sendMessage({ type: "bit-download", url: record.thumbnail, filename: fn }, function (resp) { void chrome.runtime.lastError; if (done) done(!!(resp && resp.ok)); }); }
    catch (e) { if (done) done(false); }
  }

  return { buildCsv: buildCsv, buildJson: buildJson, downloadText: downloadText, downloadCover: downloadCover, stamp: stamp };
});
