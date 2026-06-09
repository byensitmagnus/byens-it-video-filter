/*
 * TikTok Creator Video Filter · metrics.js
 * Rene beregninger: afledte tal, percentiler, score, badges, periode-range.
 * Ingen DOM/chrome -> kan unit-testes. UMD: self.BITVF.metrics / module.exports.
 */
;(function (root, factory) {
  "use strict";
  var C = (typeof require === "function") ? require("./constants.js") : (root.BITVF && root.BITVF.constants);
  var api = factory(C);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof self !== "undefined") { root.BITVF = root.BITVF || {}; root.BITVF.metrics = api; }
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";

  var DAY = C.DAY, B = C.BADGE;

  function asc(a, b) { return a - b; }
  function quantile(sorted, q) {
    if (!sorted.length) return 0;
    var p = (sorted.length - 1) * q, b = Math.floor(p), rest = p - b;
    return sorted[b + 1] !== undefined ? sorted[b] + rest * (sorted[b + 1] - sorted[b]) : sorted[b];
  }
  function pctlRanker(values) {
    var s = values.slice().sort(asc), n = s.length;
    return function (v) { if (!n) return 0; var lo = 0, hi = n; while (lo < hi) { var m = (lo + hi) >> 1; if (s[m] <= v) lo = m + 1; else hi = m; } return lo / n; };
  }

  // Afledte tal for én record. velocity beregnes af kalderen (afhænger af snapshots).
  function deriveOne(r, velocity, nowMs) {
    nowMs = nowMs || Date.now();
    var saveRate = r.views ? r.saves / r.views : 0;
    var likeRate = r.views ? r.likes / r.views : 0;
    var engagement = r.views ? (r.likes + r.comments + r.shares + r.saves) / r.views : 0;
    var ageDays = r.created ? (nowMs - r.created) / DAY : null;
    var viewsPerDay = (ageDays && ageDays > 0) ? r.views / ageDays : null;
    return Object.assign({}, r, {
      saveRate: saveRate, likeRate: likeRate, engagement: engagement,
      ageDays: ageDays, viewsPerDay: viewsPerDay, velocity: (velocity == null ? null : velocity)
    });
  }

  // Tilføj percentiler, score og badges. Muterer + returnerer listen.
  function decorate(list) {
    var rv = pctlRanker(list.map(function (r) { return r.views; }));
    var rsr = pctlRanker(list.map(function (r) { return r.saveRate; }));
    var rs = pctlRanker(list.map(function (r) { return r.saves; }));
    var rvel = pctlRanker(list.map(function (r) { return r.velocity; }).filter(function (v) { return v != null; }));
    var medViews = quantile(list.map(function (r) { return r.views; }).sort(asc), 0.5);
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      r.pViews = rv(r.views); r.pSaveRate = rsr(r.saveRate); r.pSaves = rs(r.saves);
      r.pVel = (r.velocity != null) ? rvel(r.velocity) : 0;
      r.score = Math.round(100 * (0.55 * r.pViews + 0.45 * r.pSaveRate));
      r.badges = computeBadges(r, medViews);
    }
    return list;
  }

  function computeBadges(r, medViews) {
    var out = [];
    if (r.ageDays != null && r.ageDays >= B.repostAgeDays && (r.pSaves >= B.repostPctl || r.pSaveRate >= B.repostPctl) && r.saves > 0)
      out.push({ t: "🔁 Repost", c: "repost", title: "Repost Candidate: 14+ days old and high on saves / save-rate — strong to repost." });
    if (r.views > medViews && r.pSaveRate >= B.makeMoreSavePctl && r.saveRate > 0)
      out.push({ t: "🔥 Make More", c: "more", title: "Make More: above-median views and high save-rate — make more like this." });
    if (r.pViews >= B.viralViewsPctl)
      out.push({ t: "🚀 Viral", c: "viral", title: "Viral Reach: top percentile on views." });
    if (r.pSaveRate >= B.utilitySavePctl && r.saveRate > 0 && r.pViews < B.utilityMaxViewsPctl)
      out.push({ t: "💾 Utility", c: "utility", title: "Utility Winner: high save-rate even without huge views — people save it for later." });
    if (r.ageDays != null && r.ageDays < B.tooEarlyDays)
      out.push({ t: "🆕 Too Early", c: "new", title: "Too Early: under 7 days old — don't judge it harshly yet." });
    if (!r.hasViews)
      out.push({ t: "⚠️", c: "stale", title: "Missing Fresh Data: not scrolled past yet, or data is missing." });
    return out;
  }

  function getRange(period, customFrom, customTo, nowMs) {
    nowMs = nowMs || Date.now();
    if (period === "7") return [nowMs - 7 * DAY, Infinity];
    if (period === "28") return [nowMs - 28 * DAY, Infinity];
    if (period === "90") return [nowMs - 90 * DAY, Infinity];
    if (period === "year") return [new Date(new Date(nowMs).getFullYear(), 0, 1).getTime(), Infinity];
    if (period === "custom") {
      var from = customFrom ? new Date(customFrom + "T00:00:00").getTime() : 0;
      var to = customTo ? new Date(customTo + "T23:59:59").getTime() : Infinity;
      return [from, to];
    }
    return [0, Infinity];
  }
  function inPeriod(r, range) { if (range[0] <= 0 && range[1] === Infinity) return true; return r.created && r.created >= range[0] && r.created <= range[1]; }

  return {
    asc: asc, quantile: quantile, pctlRanker: pctlRanker,
    deriveOne: deriveOne, decorate: decorate, computeBadges: computeBadges,
    getRange: getRange, inPeriod: inPeriod
  };
});
