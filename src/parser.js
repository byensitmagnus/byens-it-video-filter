/*
 * TikTok Creator Video Filter · parser.js
 * Ren parsing af TikToks JSON-svar til normaliserede video-records.
 * Ingen DOM/chrome-afhængigheder -> kan unit-testes i Node med fixtures.
 * UMD: self.BITVF.parser (browser) / module.exports (Node).
 */
;(function (root, factory) {
  "use strict";
  var C = (typeof require === "function") ? require("./constants.js") : (root.BITVF && root.BITVF.constants);
  var api = factory(C);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof self !== "undefined") { root.BITVF = root.BITVF || {}; root.BITVF.parser = api; }
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";

  var F = C.FIELDS, STAT = C.STAT_CONTAINERS;
  // Per-svar-tællere (nulstilles ved hver extractVideos):
  //   looked   = objekter der LIGNER en video (har en stat-container)
  //   warnings = lignede en video men kunne ikke parses (intet ID / ingen tal)
  //   parsed   = faktiske records udtrukket
  var state = { parseWarnings: 0, looked: 0, parsed: 0 };
  function resetStats() { state.parseWarnings = 0; state.looked = 0; state.parsed = 0; }

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.trim().replace(/[,\s]/g, "");
      if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
      var m = s.match(/^(\d+(?:\.\d+)?)([KkMmBb])$/);
      if (m) { var n = parseFloat(m[1]); var u = m[2].toLowerCase(); return Math.round(n * (u === "k" ? 1e3 : u === "m" ? 1e6 : 1e9)); }
    }
    return null;
  }
  function readMetric(obj, names) {
    var i, n, v;
    for (i = 0; i < names.length; i++) { n = names[i]; if (obj[n] != null) { v = num(obj[n]); if (v != null) return v; } }
    for (var c = 0; c < STAT.length; c++) {
      var sub = obj[STAT[c]];
      if (sub && typeof sub === "object") { for (i = 0; i < names.length; i++) { n = names[i]; if (sub[n] != null) { v = num(sub[n]); if (v != null) return v; } } }
    }
    return null;
  }
  function readId(obj) {
    for (var i = 0; i < F.id.length; i++) {
      var v = obj[F.id[i]];
      if (v != null && (typeof v === "string" || typeof v === "number")) { var s = String(v); if (/^\d{6,}$/.test(s)) return s; }
    }
    return null;
  }
  function readTitle(obj) {
    for (var i = 0; i < F.title.length; i++) { var v = obj[F.title[i]]; if (typeof v === "string" && v.trim()) return v.trim(); }
    return "";
  }
  function readTime(obj) {
    for (var i = 0; i < F.created.length; i++) {
      var v = obj[F.created[i]];
      if (v == null) continue;
      if (typeof v === "string" && /\d{4}-\d{2}-\d{2}/.test(v)) { var t = Date.parse(v); if (!isNaN(t)) return t; }
      var n = (typeof v === "number") ? v : parseInt(String(v), 10);
      if (!isNaN(n) && n > 0) { if (n >= 1e12) return n; if (n >= 1e9) return n * 1000; }
    }
    return 0;
  }
  function pickUrl(v) {
    if (!v) return "";
    if (typeof v === "string" && /^https?:/.test(v)) return v;
    if (Array.isArray(v) && v.length) return pickUrl(v[0]);
    if (typeof v === "object") {
      if (Array.isArray(v.url_list) && v.url_list.length) return v.url_list[0];
      if (Array.isArray(v.urlList) && v.urlList.length) return v.urlList[0];
      if (typeof v.url === "string") return v.url;
    }
    return "";
  }
  function readCover(obj) {
    var keys = ["cover", "origin_cover", "originCover", "dynamic_cover", "dynamicCover", "cover_url", "coverUrl", "thumbnail", "thumb", "cover_image"];
    var i, u;
    for (i = 0; i < keys.length; i++) { if (obj[keys[i]] != null) { u = pickUrl(obj[keys[i]]); if (u) return u; } }
    if (obj.video && typeof obj.video === "object") { for (i = 0; i < keys.length; i++) { if (obj.video[keys[i]] != null) { u = pickUrl(obj.video[keys[i]]); if (u) return u; } } }
    return "";
  }
  function readAuthor(obj) {
    var a = obj.author || obj.authorInfo || obj.user || {};
    var cand = [a.unique_id, a.uniqueId, a.uniqueID, obj.unique_id, obj.uniqueId];
    for (var i = 0; i < cand.length; i++) { if (typeof cand[i] === "string" && cand[i].trim()) return cand[i].trim().replace(/^@/, ""); }
    return "";
  }
  function readMusic(obj) {
    var m = obj.music || obj.added_sound_music_info || (obj.video && obj.video.music) || null;
    if (m && typeof m === "object") {
      return {
        id: m.id != null ? String(m.id) : (m.mid != null ? String(m.mid) : ""),
        title: (typeof m.title === "string" && m.title.trim()) ? m.title.trim() : "",
        original: !!(m.original || m.is_original || m.isOriginal)
      };
    }
    return { id: "", title: "", original: false };
  }
  function readDuration(obj) {
    var d = (obj.video && (obj.video.duration || obj.video.videoDuration)) || obj.duration;
    var n = num(d);
    return n != null ? n : 0;
  }

  function hashtagsOf(title) {
    var out = [], re = /#[\p{L}\p{N}_]+/gu, m;
    while ((m = re.exec(title || "")) !== null) out.push(m[0].slice(1).toLowerCase());
    return out;
  }

  // Forsøg at lave ét rå objekt om til en video-record. null hvis det ikke ligner.
  function asVideo(obj) {
    // Stat-container = stærkeste signal for "dette er en video". Bruges både til
    // advarsler (music/author-objekter har ingen, så de tæller ikke som brud).
    var hasStat = false;
    for (var si = 0; si < STAT.length; si++) { if (obj[STAT[si]] && typeof obj[STAT[si]] === "object") { hasStat = true; break; } }
    if (hasStat) state.looked++;
    var id = readId(obj);
    if (!id) {
      // Ligner en video (har stats) men intet læsbart ID = sandsynlig ID-formatændring.
      if (hasStat) state.parseWarnings++;
      return null;
    }
    var views = readMetric(obj, F.views);
    var likes = readMetric(obj, F.likes);
    var saves = readMetric(obj, F.saves);
    var comments = readMetric(obj, F.comments);
    var shares = readMetric(obj, F.shares);
    var present = [views, likes, saves, comments, shares].filter(function (v) { return v != null; }).length;
    var title = readTitle(obj);
    if (present === 0) {
      // Stat-container men ingen tal kunne læses (= sandsynlig feltnavn-ændring).
      if (hasStat) state.parseWarnings++;
      return null;
    }
    if (!title && present < 2) return null;
    var mu = readMusic(obj);
    return {
      id: id, title: title, thumbnail: readCover(obj), author: readAuthor(obj), created: readTime(obj),
      views: views || 0, likes: likes || 0, comments: comments || 0, shares: shares || 0, saves: saves || 0,
      musicId: mu.id, musicTitle: mu.title, musicOriginal: mu.original, duration: readDuration(obj),
      hasSaves: saves != null, hasViews: views != null
    };
  }

  // Rekursivt: find alle video-lignende objekter i et vilkårligt JSON-svar.
  function walk(node, out, depth) {
    if (!node || depth > 9) return out;
    if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) walk(node[i], out, depth + 1); return out; }
    if (typeof node === "object") {
      var rec = asVideo(node);
      if (rec) out.push(rec);
      for (var k in node) { if (!Object.prototype.hasOwnProperty.call(node, k)) continue; var v = node[k]; if (v && typeof v === "object") walk(v, out, depth + 1); }
    }
    return out;
  }

  // Udtræk + dedupér video-records fra et JSON-svar (max-tal vinder ved dubletter).
  function extractVideos(json) {
    resetStats();
    if (!json || typeof json !== "object") return [];
    var list = walk(json, [], 0);
    var map = {};
    for (var i = 0; i < list.length; i++) {
      var r = list[i], p = map[r.id];
      if (!p) { map[r.id] = r; continue; }
      p.views = Math.max(p.views, r.views); p.likes = Math.max(p.likes, r.likes);
      p.comments = Math.max(p.comments, r.comments); p.shares = Math.max(p.shares, r.shares); p.saves = Math.max(p.saves, r.saves);
      if (!p.title && r.title) p.title = r.title;
      if (!p.thumbnail && r.thumbnail) p.thumbnail = r.thumbnail;
      if (!p.author && r.author) p.author = r.author;
      if (!p.created && r.created) p.created = r.created;
      if (!p.musicId && r.musicId) { p.musicId = r.musicId; p.musicTitle = r.musicTitle; p.musicOriginal = r.musicOriginal; }
      p.hasSaves = p.hasSaves || r.hasSaves; p.hasViews = p.hasViews || r.hasViews;
    }
    var out = Object.keys(map).map(function (k) { return map[k]; });
    state.parsed = out.length;
    return out;
  }

  function resetWarnings() { resetStats(); }
  function getWarnings() { return state.parseWarnings; }
  // Stats for det seneste extractVideos-kald — bruges til brud-detektion i UI:
  // mange "looked" men 0 "parsed" = TikTok-format sandsynligvis ændret.
  function getStats() { return { looked: state.looked, unreadable: state.parseWarnings, parsed: state.parsed }; }

  return {
    num: num, readMetric: readMetric, readId: readId, readTitle: readTitle, readTime: readTime,
    readCover: readCover, readAuthor: readAuthor, readMusic: readMusic, readDuration: readDuration,
    hashtagsOf: hashtagsOf, asVideo: asVideo, walk: walk, extractVideos: extractVideos,
    getWarnings: getWarnings, resetWarnings: resetWarnings, getStats: getStats
  };
});
