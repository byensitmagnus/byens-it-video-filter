/*
 * TikTok Creator Video Filter · storage.js
 * Data-lag: chrome.storage.local, ejer-filter, snapshots/velocity, watchlist.
 * Browser-modul (bruger chrome.*). UMD: self.BITVF.storage.
 */
;(function (root, factory) {
  "use strict";
  var C = (typeof require === "function") ? require("./constants.js") : (root.BITVF && root.BITVF.constants);
  var api = factory(C);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof self !== "undefined") { root.BITVF = root.BITVF || {}; root.BITVF.storage = api; }
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";

  var K = C.STORAGE_KEYS, DAY = C.DAY;
  var videos = {}, snapshots = {}, watchlist = {};
  var settings = { username: "", owner: "", theme: "dark", activeTab: "top", bufferKey: "", bufferOrgId: "", bufferChannelId: "", bufferChannelName: "" };
  // Runtime-signal (ikke persisteret): seneste parse-sundhed, så UI kan vise et
  // brugbart brud-banner i stedet for at fejle lydløst, hvis TikTok ændrer format.
  var parseHealth = { ok: true, looked: 0, unreadable: 0, at: 0 };

  function now() { return Date.now(); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function load(cb) {
    try {
      chrome.storage.local.get([K.videos, K.snapshots, K.watchlist, K.settings], function (res) {
        void chrome.runtime.lastError;
        if (res) {
          if (res[K.videos]) videos = res[K.videos];
          if (res[K.snapshots]) snapshots = res[K.snapshots];
          if (res[K.watchlist]) watchlist = res[K.watchlist];
          if (res[K.settings]) settings = Object.assign(settings, res[K.settings]);
        }
        if (cb) cb();
      });
    } catch (e) { if (cb) cb(); }
  }
  function persist() { try { var o = {}; o[K.videos] = videos; o[K.snapshots] = snapshots; chrome.storage.local.set(o); } catch (e) {} }
  function saveWatch() { try { var o = {}; o[K.watchlist] = watchlist; chrome.storage.local.set(o); } catch (e) {} }
  function saveSettings() { try { var o = {}; o[K.settings] = settings; chrome.storage.local.set(o); } catch (e) {} }

  // ---- ejer-filter ----
  function ownerId() { return String(settings.username || settings.owner || "").toLowerCase().replace(/^@/, ""); }
  function isOwn(r) { var o = ownerId(); if (!o) return true; if (!r.author) return true; return String(r.author).toLowerCase() === o; }
  function detectOwner(pathname) {
    try {
      var m = (pathname || "").match(/^\/@([a-z0-9._-]+)/i);
      if (m) { var u = m[1].toLowerCase(); if (settings.owner !== u) { settings.owner = u; saveSettings(); return pruneNonOwn(); } }
    } catch (e) {}
    return false;
  }
  function pruneNonOwn() {
    var o = ownerId(); if (!o) return false;
    var changed = false;
    for (var k in videos) { if (has(videos, k)) { var a = videos[k].author; if (a && String(a).toLowerCase() !== o) { delete videos[k]; delete snapshots[k]; changed = true; } } }
    if (changed) persist();
    return changed;
  }
  function ownVideos() { var out = []; for (var k in videos) { if (has(videos, k) && isOwn(videos[k])) out.push(videos[k]); } return out; }
  function ownCount() { return ownVideos().length; }

  // ---- snapshots / velocity ----
  function pushSnapshot(rec) {
    var arr = snapshots[rec.id] || (snapshots[rec.id] = []);
    var t = now(), last = arr[arr.length - 1];
    if (!last) arr.push({ t: t, v: rec.views, l: rec.likes, s: rec.saves });
    else if (t - last.t >= C.SNAPSHOT_MIN_GAP) arr.push({ t: t, v: rec.views, l: rec.likes, s: rec.saves });
    else { last.v = Math.max(last.v, rec.views); last.l = Math.max(last.l, rec.likes); last.s = Math.max(last.s, rec.saves); last.t = t; }
    if (arr.length > C.SNAPSHOT_MAX) arr.splice(0, arr.length - C.SNAPSHOT_MAX);
  }
  function getVelocity(id) {
    var arr = snapshots[id]; if (!arr || arr.length < 2) return null;
    var a = arr[arr.length - 2], b = arr[arr.length - 1];
    var dt = (b.t - a.t) / DAY; if (dt <= 0) return null;
    return (b.v - a.v) / dt;
  }

  // ---- upsert ----
  function upsert(r) {
    if (!isOwn(r)) return false;
    var t = now(), added = false, prev = videos[r.id];
    if (!prev) { r.firstSeen = t; r.lastSeen = t; r.reposted = 0; videos[r.id] = r; added = true; }
    else {
      prev.views = Math.max(prev.views, r.views); prev.likes = Math.max(prev.likes, r.likes);
      prev.comments = Math.max(prev.comments, r.comments); prev.shares = Math.max(prev.shares, r.shares); prev.saves = Math.max(prev.saves, r.saves);
      if (!prev.title && r.title) prev.title = r.title;
      if (!prev.thumbnail && r.thumbnail) prev.thumbnail = r.thumbnail;
      if (r.videoUrl) prev.videoUrl = r.videoUrl; // friskeste URL vinder (signeret/udløber)
      if (!prev.author && r.author) prev.author = r.author;
      if (!prev.created && r.created) prev.created = r.created;
      if (!prev.musicId && r.musicId) { prev.musicId = r.musicId; prev.musicTitle = r.musicTitle; prev.musicOriginal = r.musicOriginal; }
      if (!prev.duration && r.duration) prev.duration = r.duration;
      prev.hasSaves = prev.hasSaves || r.hasSaves; prev.hasViews = prev.hasViews || r.hasViews;
      prev.lastSeen = t;
    }
    pushSnapshot(videos[r.id]);
    return added;
  }

  // ---- watchlist / settings / clear ----
  function isWatched(id) { return !!watchlist[id]; }
  function setWatch(id, on) { if (on) watchlist[id] = 1; else delete watchlist[id]; saveWatch(); }
  function markReposted(id) { if (videos[id]) { videos[id].reposted = now(); persist(); } }
  function getReposted(id) { return videos[id] ? (videos[id].reposted || 0) : 0; }
  function setUsername(name) { settings.username = (name || "").trim().replace(/^@/, ""); saveSettings(); pruneNonOwn(); }
  function setTheme(theme) { settings.theme = theme; saveSettings(); }
  function setActiveTab(tab) { settings.activeTab = tab; saveSettings(); }
  function setBuffer(cfg) { settings = Object.assign(settings, cfg || {}); saveSettings(); }
  // Genindlæs settings fra storage (fx når popup'en har ændret Buffer-config).
  function reloadSettings(cb) {
    try { chrome.storage.local.get(K.settings, function (res) { void chrome.runtime.lastError; if (res && res[K.settings]) settings = Object.assign(settings, res[K.settings]); if (cb) cb(); }); }
    catch (e) { if (cb) cb(); }
  }
  function getSettings() { return settings; }
  function snapshotCount() { var n = 0; for (var k in snapshots) { if (has(snapshots, k)) n += snapshots[k].length; } return n; }
  function clearAll() { videos = {}; snapshots = {}; persist(); }

  function setParseHealth(h) { parseHealth = h || { ok: true, looked: 0, unreadable: 0, at: 0 }; }
  function getParseHealth() { return parseHealth; }

  return {
    load: load, persist: persist,
    ownerId: ownerId, isOwn: isOwn, detectOwner: detectOwner, pruneNonOwn: pruneNonOwn,
    ownVideos: ownVideos, ownCount: ownCount,
    getVelocity: getVelocity, upsert: upsert, snapshotCount: snapshotCount,
    isWatched: isWatched, setWatch: setWatch, markReposted: markReposted, getReposted: getReposted,
    setUsername: setUsername, setTheme: setTheme, setActiveTab: setActiveTab, setBuffer: setBuffer, reloadSettings: reloadSettings, getSettings: getSettings,
    clearAll: clearAll, setParseHealth: setParseHealth, getParseHealth: getParseHealth
  };
});
