/*
 * Byens IT – Video Filter · content.js (ISOLATED world)  ·  v2.0
 *
 * Opfanger TikToks egne JSON-svar (via inject.js), normaliserer KONTOENS EGNE
 * videoer og viser et faneblads-panel med analyser: Top-liste, gem-rate-
 * leaderboard, bedste posting-tid, hashtag/lyd-performance, view-velocity,
 * repost-radar, perioder, watchlist – plus cover-download, repurpose-tekst,
 * auto-scroll-høster, CSV/JSON-eksport og lys/mørk tilstand.
 *
 * Alt sker 100% lokalt. Intet forlader din browser.
 */
(function () {
  "use strict";
  if (window.__bitVFLoaded) return;
  window.__bitVFLoaded = true;

  var K_VIDEOS = "bit_videos";
  var K_SNAPS = "bit_snapshots";
  var K_WATCH = "bit_watchlist";
  var K_SETTINGS = "bit_settings";

  var videos = {};        // id -> record
  var snapshots = {};     // id -> [{t, v, l, s}]
  var watchlist = {};     // id -> 1
  var settings = { username: "", owner: "", theme: "dark", activeTab: "top" };

  var currentSort = "score";
  var searchTerm = "";
  var periodPreset = "all";
  var customFrom = "";
  var customTo = "";
  var activeTab = "top";
  var renderQueued = false;
  var harvesting = false;
  var parseWarnings = 0;

  var DAY = 86400000;
  function now() { return Date.now(); }

  // ----------------------------------------------------------------- feltkort
  var F = {
    id: ["id", "aweme_id", "awemeId", "item_id", "itemId", "video_id", "videoId", "group_id", "groupId", "itemID"],
    title: ["desc", "title", "description", "item_title", "itemTitle", "caption", "text", "video_desc", "content", "post_title"],
    views: ["play_count", "playCount", "video_views", "videoViews", "vv", "views", "view_count", "viewCount", "play", "total_play", "show_cnt", "impression", "impressions"],
    likes: ["digg_count", "diggCount", "like_count", "likeCount", "likes", "digg", "heart_count"],
    comments: ["comment_count", "commentCount", "comments"],
    shares: ["share_count", "shareCount", "shares", "forward_count", "forwardCount"],
    saves: ["collect_count", "collectCount", "favorite_count", "favoriteCount", "save_count", "saveCount", "saves", "favorites", "favourite_count", "collect"],
    created: ["create_time", "createTime", "createTimestamp", "create_timestamp", "created_at", "createdAt", "publish_time", "publishTime", "create_date"]
  };
  var STAT_CONTAINERS = ["statistics", "stats", "statisticsV2", "statsV2", "metrics", "itemStats", "item_stats"];

  // ------------------------------------------------------------- talparsning
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.trim().replace(/[,\s]/g, "");
      if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
      var m = s.match(/^(\d+(?:\.\d+)?)([KkMmBb])$/);
      if (m) {
        var n = parseFloat(m[1]);
        var u = m[2].toLowerCase();
        return Math.round(n * (u === "k" ? 1e3 : u === "m" ? 1e6 : 1e9));
      }
    }
    return null;
  }
  function readMetric(obj, names) {
    var i, n, v;
    for (i = 0; i < names.length; i++) { n = names[i]; if (obj[n] != null) { v = num(obj[n]); if (v != null) return v; } }
    for (var c = 0; c < STAT_CONTAINERS.length; c++) {
      var sub = obj[STAT_CONTAINERS[c]];
      if (sub && typeof sub === "object") {
        for (i = 0; i < names.length; i++) { n = names[i]; if (sub[n] != null) { v = num(sub[n]); if (v != null) return v; } }
      }
    }
    return null;
  }
  function readId(obj) {
    for (var i = 0; i < F.id.length; i++) {
      var v = obj[F.id[i]];
      if (v != null && (typeof v === "string" || typeof v === "number")) {
        var s = String(v);
        if (/^\d{6,}$/.test(s)) return s;
      }
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
    if (obj.video && typeof obj.video === "object") {
      for (i = 0; i < keys.length; i++) { if (obj.video[keys[i]] != null) { u = pickUrl(obj.video[keys[i]]); if (u) return u; } }
    }
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
      var id = m.id != null ? String(m.id) : (m.mid != null ? String(m.mid) : "");
      var title = (typeof m.title === "string" && m.title.trim()) ? m.title.trim() : "";
      var original = !!(m.original || m.is_original || m.isOriginal);
      return { id: id, title: title, original: original };
    }
    return { id: "", title: "", original: false };
  }
  function readDuration(obj) {
    var d = (obj.video && (obj.video.duration || obj.video.videoDuration)) || obj.duration;
    var n = num(d);
    return n != null ? n : 0;
  }

  function asVideo(obj) {
    var id = readId(obj);
    if (!id) return null;
    var views = readMetric(obj, F.views);
    var likes = readMetric(obj, F.likes);
    var saves = readMetric(obj, F.saves);
    var comments = readMetric(obj, F.comments);
    var shares = readMetric(obj, F.shares);
    var present = [views, likes, saves, comments, shares].filter(function (v) { return v != null; }).length;
    var title = readTitle(obj);
    if (present === 0) {
      // lignede en video (id + titel) men ingen tal kunne læses -> mulig formatændring
      if (title) parseWarnings++;
      return null;
    }
    if (!title && present < 2) return null;
    var mu = readMusic(obj);
    return {
      id: id, title: title, thumbnail: readCover(obj), author: readAuthor(obj),
      created: readTime(obj),
      views: views || 0, likes: likes || 0, comments: comments || 0, shares: shares || 0, saves: saves || 0,
      musicId: mu.id, musicTitle: mu.title, musicOriginal: mu.original,
      duration: readDuration(obj),
      hasSaves: saves != null, hasViews: views != null
    };
  }

  function walk(node, out, depth) {
    if (!node || depth > 9) return;
    if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) walk(node[i], out, depth + 1); return; }
    if (typeof node === "object") {
      var rec = asVideo(node);
      if (rec) out.push(rec);
      for (var k in node) { if (!Object.prototype.hasOwnProperty.call(node, k)) continue; var v = node[k]; if (v && typeof v === "object") walk(v, out, depth + 1); }
    }
  }

  function pushSnapshot(rec) {
    var arr = snapshots[rec.id] || (snapshots[rec.id] = []);
    var t = now();
    var last = arr[arr.length - 1];
    if (!last) { arr.push({ t: t, v: rec.views, l: rec.likes, s: rec.saves }); }
    else if (t - last.t >= 6 * 3600 * 1000) { arr.push({ t: t, v: rec.views, l: rec.likes, s: rec.saves }); }
    else { last.v = Math.max(last.v, rec.views); last.l = Math.max(last.l, rec.likes); last.s = Math.max(last.s, rec.saves); last.t = t; }
    if (arr.length > 60) arr.splice(0, arr.length - 60);
  }

  function ingest(json) {
    if (!json || typeof json !== "object") return 0;
    var found = [];
    walk(json, found, 0);
    if (!found.length) return 0;
    maybeDetectOwner();
    var added = 0, t = now();
    for (var i = 0; i < found.length; i++) {
      var r = found[i];
      if (!isOwn(r)) continue;
      var prev = videos[r.id];
      if (!prev) {
        r.firstSeen = t; r.lastSeen = t; r.reposted = 0;
        videos[r.id] = r; added++;
      } else {
        prev.views = Math.max(prev.views, r.views);
        prev.likes = Math.max(prev.likes, r.likes);
        prev.comments = Math.max(prev.comments, r.comments);
        prev.shares = Math.max(prev.shares, r.shares);
        prev.saves = Math.max(prev.saves, r.saves);
        if (!prev.title && r.title) prev.title = r.title;
        if (!prev.thumbnail && r.thumbnail) prev.thumbnail = r.thumbnail;
        if (!prev.author && r.author) prev.author = r.author;
        if (!prev.created && r.created) prev.created = r.created;
        if (!prev.musicId && r.musicId) { prev.musicId = r.musicId; prev.musicTitle = r.musicTitle; prev.musicOriginal = r.musicOriginal; }
        if (!prev.duration && r.duration) prev.duration = r.duration;
        prev.hasSaves = prev.hasSaves || r.hasSaves;
        prev.hasViews = prev.hasViews || r.hasViews;
        prev.lastSeen = t;
      }
      pushSnapshot(videos[r.id]);
    }
    persist();
    queueRender();
    return added;
  }

  // ------------------------------------------------------------------ storage
  function persist() { try { chrome.storage.local.set({ "bit_videos": videos, "bit_snapshots": snapshots }); } catch (e) {} }
  function saveWatch() { try { chrome.storage.local.set({ "bit_watchlist": watchlist }); } catch (e) {} }
  function saveSettings() { try { chrome.storage.local.set({ "bit_settings": settings }); } catch (e) {} }
  function loadStored(cb) {
    try {
      chrome.storage.local.get([K_VIDEOS, K_SNAPS, K_WATCH, K_SETTINGS], function (res) {
        void chrome.runtime.lastError;
        if (res) {
          if (res[K_VIDEOS]) videos = res[K_VIDEOS];
          if (res[K_SNAPS]) snapshots = res[K_SNAPS];
          if (res[K_WATCH]) watchlist = res[K_WATCH];
          if (res[K_SETTINGS]) settings = Object.assign(settings, res[K_SETTINGS]);
        }
        if (settings.theme) {/* applied at panel build */ }
        if (settings.activeTab) activeTab = settings.activeTab;
        if (cb) cb();
      });
    } catch (e) { if (cb) cb(); }
  }

  // --------------------------------------------------------------- ejer-filter
  function ownerId() { return String(settings.username || settings.owner || "").toLowerCase().replace(/^@/, ""); }
  function isOwn(r) { var o = ownerId(); if (!o) return true; if (!r.author) return true; return String(r.author).toLowerCase() === o; }
  function pruneNonOwn() {
    var o = ownerId(); if (!o) return false;
    var changed = false;
    for (var k in videos) { if (Object.prototype.hasOwnProperty.call(videos, k)) { var a = videos[k].author; if (a && String(a).toLowerCase() !== o) { delete videos[k]; delete snapshots[k]; changed = true; } } }
    if (changed) persist();
    return changed;
  }
  function maybeDetectOwner() {
    try {
      var m = location.pathname.match(/^\/@([a-z0-9._-]+)/i);
      if (m) { var u = m[1].toLowerCase(); if (settings.owner !== u) { settings.owner = u; saveSettings(); if (pruneNonOwn()) queueRender(); } }
    } catch (e) {}
  }
  function ownVideos() {
    var out = [];
    for (var k in videos) { if (Object.prototype.hasOwnProperty.call(videos, k) && isOwn(videos[k])) out.push(videos[k]); }
    return out;
  }
  function ownCount() { return ownVideos().length; }

  // ------------------------------------------------ beskeder fra inject + popup
  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    var d = ev.data;
    if (!d || d.source !== "bit-vf" || d.kind !== "capture") return;
    try { ingest(d.payload && d.payload.json); } catch (e) {}
  });
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg) return;
      if (msg.type === "bit-toggle") { togglePanel(true); sendResponse({ ok: true, count: ownCount() }); }
      else if (msg.type === "bit-count") { sendResponse({ count: ownCount() }); }
      else if (msg.type === "bit-set-username") { settings.username = (msg.username || "").trim().replace(/^@/, ""); saveSettings(); pruneNonOwn(); queueRender(); sendResponse({ ok: true }); }
      return true;
    });
  } catch (e) {}

  // -------------------------------------------------- TikTok inline state (SIGI)
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

  // -------------------------------------------------------------- formattering
  function fmt(n) { n = n || 0; if (n >= 1e6) return trimDot((n / 1e6).toFixed(n >= 1e7 ? 0 : 1)) + "M"; if (n >= 1e3) return trimDot((n / 1e3).toFixed(n >= 1e4 ? 0 : 1)) + "K"; return String(Math.round(n)); }
  function trimDot(s) { return s.replace(/\.0$/, ""); }
  function pct(x) { return (x * 100).toFixed(1).replace(/\.0$/, "") + "%"; }
  function fmtDate(ms) { if (!ms) return ""; try { return new Date(ms).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function videoUrl(r) { var user = r.author || ownerId(); if (user) return "https://www.tiktok.com/@" + user + "/video/" + r.id; return null; }
  function hashtagsOf(title) { var out = []; var re = /#[\p{L}\p{N}_]+/gu; var m; while ((m = re.exec(title || "")) !== null) out.push(m[0].slice(1).toLowerCase()); return out; }

  // ----------------------------------------------------------- afledte tal
  function getVelocity(id) {
    var arr = snapshots[id]; if (!arr || arr.length < 2) return null;
    var a = arr[arr.length - 2], b = arr[arr.length - 1];
    var dt = (b.t - a.t) / DAY; if (dt <= 0) return null;
    return (b.v - a.v) / dt;
  }
  function copyWithDerived(r) {
    var saveRate = r.views ? r.saves / r.views : 0;
    var likeRate = r.views ? r.likes / r.views : 0;
    var engagement = r.views ? (r.likes + r.comments + r.shares + r.saves) / r.views : 0;
    var ageDays = r.created ? (now() - r.created) / DAY : null;
    var viewsPerDay = (ageDays && ageDays > 0) ? r.views / ageDays : null;
    return Object.assign({}, r, { saveRate: saveRate, likeRate: likeRate, engagement: engagement, ageDays: ageDays, viewsPerDay: viewsPerDay, velocity: getVelocity(r.id) });
  }
  function asc(a, b) { return a - b; }
  function quantile(sorted, q) { if (!sorted.length) return 0; var p = (sorted.length - 1) * q, b = Math.floor(p), rest = p - b; return sorted[b + 1] !== undefined ? sorted[b] + rest * (sorted[b + 1] - sorted[b]) : sorted[b]; }
  function pctlRanker(values) { var s = values.slice().sort(asc), n = s.length; return function (v) { if (!n) return 0; var lo = 0, hi = n; while (lo < hi) { var m = (lo + hi) >> 1; if (s[m] <= v) lo = m + 1; else hi = m; } return lo / n; }; }
  function decorate(l) {
    var rv = pctlRanker(l.map(function (r) { return r.views; }));
    var rsr = pctlRanker(l.map(function (r) { return r.saveRate; }));
    var rs = pctlRanker(l.map(function (r) { return r.saves; }));
    var rvel = pctlRanker(l.map(function (r) { return r.velocity; }).filter(function (v) { return v != null; }));
    var medViews = quantile(l.map(function (r) { return r.views; }).sort(asc), 0.5);
    for (var i = 0; i < l.length; i++) {
      var r = l[i];
      r.pViews = rv(r.views); r.pSaveRate = rsr(r.saveRate); r.pSaves = rs(r.saves);
      r.pVel = (r.velocity != null) ? rvel(r.velocity) : 0;
      r.score = Math.round(100 * (0.55 * r.pViews + 0.45 * r.pSaveRate));
      r.inWatch = !!watchlist[r.id];
      r.tags = [];
      if (r.pSaves >= 0.8 && r.saves > 0) r.tags.push({ t: "🔁 Repost", c: "repost", title: "Top 20% på gemte – stærk repost-kandidat" });
      if (r.views >= medViews && r.pSaveRate >= 0.7 && r.saveRate > 0) r.tags.push({ t: "🔥 Lav mere", c: "more", title: "God rækkevidde + høj gem-rate – lav flere som denne" });
      if (r.velocity != null && r.velocity > 0 && r.pVel >= 0.8) r.tags.push({ t: "🚀 Stiger", c: "rising", title: "Hurtig vækst siden sidst – sleeper hit" });
      if (r.ageDays != null && r.ageDays < 7 && r.engagement < 0.02) r.tags.push({ t: "🆕 Ny", c: "new", title: "Under 7 dage gammel – for tidligt at dømme" });
      if (!r.hasViews) r.tags.push({ t: "⚠", c: "stale", title: "Friske tal mangler – scroll forbi videoen" });
    }
    return l;
  }

  function getRange() {
    var n = now();
    if (periodPreset === "7") return [n - 7 * DAY, Infinity];
    if (periodPreset === "28") return [n - 28 * DAY, Infinity];
    if (periodPreset === "90") return [n - 90 * DAY, Infinity];
    if (periodPreset === "year") return [new Date(new Date(n).getFullYear(), 0, 1).getTime(), Infinity];
    if (periodPreset === "custom") {
      var from = customFrom ? new Date(customFrom + "T00:00:00").getTime() : 0;
      var to = customTo ? new Date(customTo + "T23:59:59").getTime() : Infinity;
      return [from, to];
    }
    return [0, Infinity];
  }
  function inPeriod(r) { var rng = getRange(); if (rng[0] <= 0 && rng[1] === Infinity) return true; return r.created && r.created >= rng[0] && r.created <= rng[1]; }

  // base lister
  function preparedAll() { return decorate(ownVideos().map(copyWithDerived)); }
  function preparedPeriod() {
    var l = ownVideos().map(copyWithDerived).filter(inPeriod);
    if (searchTerm) l = l.filter(function (r) { return (r.title || "").toLowerCase().indexOf(searchTerm) !== -1; });
    return decorate(l);
  }

  // --------------------------------------------------------------------- panel
  var root, fab, bodyEl, countEl;
  var TABS = [
    { k: "top", n: "Top" },
    { k: "leaderboard", n: "Leaderboard" },
    { k: "time", n: "Posting-tid" },
    { k: "tags", n: "Hashtags & lyd" },
    { k: "repost", n: "Repost-radar" },
    { k: "trends", n: "Trends" },
    { k: "watch", n: "★ Watchlist" }
  ];
  var SORTS = [
    { k: "score", n: "Score" }, { k: "views", n: "Visninger" }, { k: "likes", n: "Likes" },
    { k: "saves", n: "Gemte" }, { k: "saveRate", n: "Gem-rate" }, { k: "velocity", n: "Velocity" }, { k: "created", n: "Nyeste" }
  ];

  function ensurePanel() {
    if (root) return;
    fab = document.createElement("button");
    fab.className = "bitvf-fab";
    fab.type = "button";
    fab.title = "Byens IT – Video Filter";
    fab.addEventListener("click", function () { togglePanel(); });
    document.documentElement.appendChild(fab);

    root = document.createElement("div");
    root.className = "bitvf-panel bitvf-hidden" + (settings.theme === "light" ? " bitvf-light" : "");
    root.innerHTML =
      '<div class="bitvf-head">' +
        '<div class="bitvf-title"><span class="bitvf-logo">▼</span> Byens IT · Video Filter</div>' +
        '<div class="bitvf-headbtns">' +
          '<button class="bitvf-theme" type="button" title="Lys/mørk">◐</button>' +
          '<button class="bitvf-x" type="button" title="Luk">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="bitvf-tabs"></div>' +
      '<div class="bitvf-warn bitvf-hidden"></div>' +
      '<div class="bitvf-controls2">' +
        '<input class="bitvf-search" type="search" placeholder="Søg i titel/tekst…" />' +
        '<span class="bitvf-count"></span>' +
      '</div>' +
      '<div class="bitvf-period">' +
        '<span class="bitvf-lbl">Periode</span>' +
        '<div class="bitvf-periodbtns">' +
          '<button data-period="all">Alle</button><button data-period="7">7d</button>' +
          '<button data-period="28">28d</button><button data-period="90">90d</button>' +
          '<button data-period="year">I år</button><button data-period="custom">Custom</button>' +
        '</div>' +
        '<div class="bitvf-custom bitvf-hidden"><input type="date" class="bitvf-from" /> <span class="bitvf-dash">–</span> <input type="date" class="bitvf-to" /></div>' +
      '</div>' +
      '<div class="bitvf-sortrow"><span class="bitvf-lbl">Sortér</span><div class="bitvf-sortbtns"></div></div>' +
      '<div class="bitvf-body"></div>' +
      '<div class="bitvf-foot">' +
        '<button class="bitvf-harvest" type="button" title="Scroll automatisk hele profilen igennem">⤓ Hent hele profilen</button>' +
        '<button class="bitvf-csv" type="button">CSV</button>' +
        '<button class="bitvf-json" type="button">JSON</button>' +
        '<button class="bitvf-clear" type="button">Ryd</button>' +
      '</div>';
    document.documentElement.appendChild(root);

    bodyEl = root.querySelector(".bitvf-body");
    countEl = root.querySelector(".bitvf-count");

    // tabs
    var tabsEl = root.querySelector(".bitvf-tabs");
    tabsEl.innerHTML = TABS.map(function (t) { return '<button data-tab="' + t.k + '">' + escapeHtml(t.n) + '</button>'; }).join("");
    tabsEl.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () { activeTab = b.getAttribute("data-tab"); settings.activeTab = activeTab; saveSettings(); updateTabs(); render(); });
    });

    // sort buttons
    var sortEl = root.querySelector(".bitvf-sortbtns");
    sortEl.innerHTML = SORTS.map(function (s) { return '<button data-sort="' + s.k + '">' + escapeHtml(s.n) + '</button>'; }).join("");
    sortEl.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () { currentSort = b.getAttribute("data-sort"); updateSortButtons(); render(); });
    });

    // period buttons
    root.querySelectorAll(".bitvf-periodbtns button").forEach(function (b) {
      b.addEventListener("click", function () {
        periodPreset = b.getAttribute("data-period");
        var custom = root.querySelector(".bitvf-custom");
        if (custom) custom.classList.toggle("bitvf-hidden", periodPreset !== "custom");
        updatePeriodButtons(); render();
      });
    });
    root.querySelector(".bitvf-from").addEventListener("change", function (e) { customFrom = e.target.value || ""; periodPreset = "custom"; updatePeriodButtons(); render(); });
    root.querySelector(".bitvf-to").addEventListener("change", function (e) { customTo = e.target.value || ""; periodPreset = "custom"; updatePeriodButtons(); render(); });

    root.querySelector(".bitvf-search").addEventListener("input", function (e) { searchTerm = (e.target.value || "").toLowerCase(); render(); });
    root.querySelector(".bitvf-x").addEventListener("click", function () { togglePanel(false); });
    root.querySelector(".bitvf-theme").addEventListener("click", toggleTheme);
    root.querySelector(".bitvf-csv").addEventListener("click", exportCsv);
    root.querySelector(".bitvf-json").addEventListener("click", exportJson);
    root.querySelector(".bitvf-harvest").addEventListener("click", function () { harvest(this); });
    root.querySelector(".bitvf-clear").addEventListener("click", function () {
      if (window.confirm("Ryd ALLE indsamlede video-data (inkl. snapshots)?")) { videos = {}; snapshots = {}; persist(); render(); updateBadge(); }
    });

    // body click delegation (row actions)
    bodyEl.addEventListener("click", onBodyClick);

    updateTabs(); updateSortButtons(); updatePeriodButtons();
  }

  function updateTabs() { if (!root) return; root.querySelectorAll(".bitvf-tabs button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === activeTab); }); var showSort = (activeTab === "top" || activeTab === "watch"); root.querySelector(".bitvf-sortrow").classList.toggle("bitvf-hidden", !showSort); }
  function updateSortButtons() { if (!root) return; root.querySelectorAll(".bitvf-sortbtns button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === currentSort); }); }
  function updatePeriodButtons() { if (!root) return; root.querySelectorAll(".bitvf-periodbtns button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-period") === periodPreset); }); }

  function toggleTheme() { settings.theme = settings.theme === "light" ? "dark" : "light"; saveSettings(); root.classList.toggle("bitvf-light", settings.theme === "light"); }
  function togglePanel(forceOpen) {
    ensurePanel();
    var open = forceOpen === true ? true : (forceOpen === false ? false : root.classList.contains("bitvf-hidden"));
    root.classList.toggle("bitvf-hidden", !open);
    fab.classList.toggle("bitvf-fab-active", open);
    if (open) render();
  }
  function updateBadge() {
    if (fab) { var n = ownCount(); fab.innerHTML = '<span class="bitvf-logo">▼</span> Byens IT' + (n ? ' <b>' + n + '</b>' : ""); }
    try { chrome.runtime.sendMessage({ type: "bit-badge", count: ownCount() }, function () { void chrome.runtime.lastError; }); } catch (e) {}
  }
  function queueRender() {
    if (renderQueued) return; renderQueued = true;
    setTimeout(function () { renderQueued = false; updateBadge(); if (root && !root.classList.contains("bitvf-hidden")) render(); }, 350);
  }

  // ------------------------------------------------------------------- render
  function render() {
    ensurePanel();
    var total = ownCount();
    var warn = root.querySelector(".bitvf-warn");
    if (parseWarnings > 8) { warn.classList.remove("bitvf-hidden"); warn.textContent = "⚠ Nogle tal kunne ikke læses (" + parseWarnings + ") – TikTok kan have ændret format. Tallene kan være ufuldstændige."; }
    else warn.classList.add("bitvf-hidden");

    if (!total) { renderEmpty(); countEl.textContent = "0 videoer"; return; }

    if (activeTab === "top") renderTop();
    else if (activeTab === "leaderboard") renderLeaderboard();
    else if (activeTab === "time") renderTime();
    else if (activeTab === "tags") renderTags();
    else if (activeTab === "repost") renderRepost();
    else if (activeTab === "trends") renderTrends();
    else if (activeTab === "watch") renderWatch();
  }

  function renderEmpty() {
    bodyEl.innerHTML =
      '<div class="bitvf-empty">' +
        '<div class="bitvf-empty-ic">▼</div>' +
        '<p><b>Ingen data endnu.</b></p>' +
        '<p><b>1.</b> Gå til <b>din egen TikTok-profil</b> (tiktok.com/@ditbrugernavn)</p>' +
        '<p><b>2.</b> Tryk <b>⤓ Hent hele profilen</b> nedenfor – eller scroll selv roligt ned</p>' +
        '<p><b>3.</b> Tallene fanges automatisk · gemte ses kun via TikTok Studio · Analytics</p>' +
        '<p class="bitvf-empty-sub">Alt gemmes lokalt. Intet forlader din browser.</p>' +
      '</div>';
  }

  function rowActions(r) {
    var star = r.inWatch ? "★" : "☆";
    return '<div class="bitvf-actions">' +
      '<button class="bitvf-act" data-act="watch" data-id="' + r.id + '" title="Watchlist">' + star + '</button>' +
      (r.thumbnail ? '<button class="bitvf-act" data-act="cover" data-id="' + r.id + '" title="Hent cover">⬇</button>' : '') +
      '<button class="bitvf-act" data-act="repurpose" data-id="' + r.id + '" title="Kopiér titel + hashtags til genbrug">↗</button>' +
      '</div>';
  }
  function badgesHtml(r) { return (r.tags || []).map(function (t) { return '<span class="bitvf-tag bitvf-tag-' + t.c + '" title="' + escapeHtml(t.title) + '">' + t.t + '</span>'; }).join(""); }

  function videoRow(r, idx, metricCols) {
    var url = videoUrl(r);
    var titleTxt = escapeHtml(r.title || "(uden titel)");
    var titleCell = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" class="bitvf-vtitle">' + titleTxt + '</a>' : '<span class="bitvf-vtitle">' + titleTxt + '</span>';
    var thumb = r.thumbnail ? '<img class="bitvf-thumb" src="' + escapeHtml(r.thumbnail) + '" loading="lazy" referrerpolicy="no-referrer" alt="" />' : '<div class="bitvf-thumb bitvf-thumb-ph">▼</div>';
    var meta = (r.created ? '<span class="bitvf-date">📅 ' + fmtDate(r.created) + '</span>' : '');
    return '<div class="bitvf-row">' +
        '<div class="bitvf-rank">' + (idx + 1) + '</div>' + thumb +
        '<div class="bitvf-main"><div class="bitvf-titleline">' + titleCell + '</div>' +
          '<div class="bitvf-meta">' + meta + badgesHtml(r) + '</div>' + rowActions(r) + '</div>' +
        metricCols + '</div>';
  }

  function renderTop() {
    var l = preparedPeriod();
    countEl.textContent = l.length + " / " + ownCount() + " videoer";
    l.sort(sorter(currentSort));
    var head = '<div class="bitvf-rowhead"><div class="bitvf-rank">#</div><div class="bitvf-thumb-sp"></div><div class="bitvf-main">Video</div><div class="bitvf-m">Visn.</div><div class="bitvf-m">Likes</div><div class="bitvf-m">Gemte</div></div>';
    bodyEl.innerHTML = head + l.map(function (r, i) {
      var save = r.hasSaves ? fmt(r.saves) + '<span class="bitvf-sub">' + pct(r.saveRate) + '</span>' : '<span class="bitvf-na">–</span>';
      var cols = '<div class="bitvf-m" title="Visninger">' + fmt(r.views) + (currentSort === "velocity" && r.velocity != null ? '<span class="bitvf-sub">+' + fmt(Math.round(r.velocity)) + '/d</span>' : (currentSort === "score" ? '<span class="bitvf-sub">' + r.score + 'p</span>' : '')) + '</div>' +
        '<div class="bitvf-m">' + fmt(r.likes) + '</div><div class="bitvf-m bitvf-m-save">' + save + '</div>';
      return videoRow(r, i, cols);
    }).join("");
  }

  function renderWatch() {
    var l = preparedAll().filter(function (r) { return r.inWatch; });
    countEl.textContent = l.length + " på watchlist";
    if (!l.length) { bodyEl.innerHTML = '<div class="bitvf-empty"><p>Ingen videoer på watchlist endnu.</p><p class="bitvf-empty-sub">Tryk ☆ på en video i Top-fanen for at tilføje den.</p></div>'; return; }
    l.sort(sorter(currentSort));
    bodyEl.innerHTML = l.map(function (r, i) {
      var save = r.hasSaves ? fmt(r.saves) + '<span class="bitvf-sub">' + pct(r.saveRate) + '</span>' : '<span class="bitvf-na">–</span>';
      var cols = '<div class="bitvf-m">' + fmt(r.views) + '</div><div class="bitvf-m">' + fmt(r.likes) + '</div><div class="bitvf-m bitvf-m-save">' + save + '</div>';
      return videoRow(r, i, cols);
    }).join("");
  }

  function sorter(key) {
    if (key === "created") return function (a, b) { return (b.created || 0) - (a.created || 0); };
    if (key === "velocity") return function (a, b) { return (b.velocity || -1) - (a.velocity || -1); };
    return function (a, b) { return (b[key] || 0) - (a[key] || 0); };
  }

  function renderLeaderboard() {
    var l = preparedPeriod().filter(function (r) { return r.hasSaves && r.views >= 1000; });
    countEl.textContent = l.length + " videoer (min. 1K visn.)";
    l.sort(function (a, b) { return b.saveRate - a.saveRate; });
    if (!l.length) { bodyEl.innerHTML = '<div class="bitvf-empty"><p>Ingen gemte-data endnu.</p><p class="bitvf-empty-sub">Gemte ses kun via TikTok Studio · Analytics → fanen Indhold. Scroll igennem der.</p></div>'; return; }
    var head = '<div class="bitvf-rowhead"><div class="bitvf-rank">#</div><div class="bitvf-thumb-sp"></div><div class="bitvf-main">Video</div><div class="bitvf-m">Gem-rate</div><div class="bitvf-m">Gemte</div><div class="bitvf-m">Visn.</div></div>';
    bodyEl.innerHTML = head + l.slice(0, 60).map(function (r, i) {
      var pctl = Math.round(r.pSaveRate * 100);
      var cols = '<div class="bitvf-m bitvf-m-save">' + pct(r.saveRate) + '<span class="bitvf-sub">top ' + (100 - pctl) + '%</span></div>' +
        '<div class="bitvf-m">' + fmt(r.saves) + '</div><div class="bitvf-m">' + fmt(r.views) + '</div>';
      return videoRow(r, i, cols);
    }).join("");
  }

  function renderTime() {
    var l = preparedPeriod().filter(function (r) { return r.created; });
    countEl.textContent = l.length + " videoer med dato";
    if (l.length < 3) { bodyEl.innerHTML = '<div class="bitvf-empty"><p>For lidt data til posting-tid endnu.</p><p class="bitvf-empty-sub">Hent flere videoer (med udgivelsesdato) først.</p></div>'; return; }
    var days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
    var sum = [], cnt = [];
    for (var d = 0; d < 7; d++) { sum[d] = []; cnt[d] = []; for (var h = 0; h < 24; h++) { sum[d][h] = 0; cnt[d][h] = 0; } }
    l.forEach(function (r) { var dt = new Date(r.created); var di = (dt.getDay() + 6) % 7; var hi = dt.getHours(); sum[di][hi] += r.views; cnt[di][hi]++; });
    var max = 0, cells = [];
    for (var dd = 0; dd < 7; dd++) for (var hh = 0; hh < 24; hh++) { var avg = cnt[dd][hh] ? sum[dd][hh] / cnt[dd][hh] : 0; if (avg > max) max = avg; if (cnt[dd][hh]) cells.push({ d: dd, h: hh, avg: avg, n: cnt[dd][hh] }); }
    cells.sort(function (a, b) { return b.avg - a.avg; });
    var top = cells.slice(0, 3).map(function (c) { return "<b>" + days[c.d] + " " + c.h + "-" + (c.h + 1) + "</b> (" + fmt(Math.round(c.avg)) + " gns. visn.)"; });

    var html = '<div class="bitvf-tip">📈 Bedste tidspunkter (din egen historik): ' + (top.length ? top.join(" · ") : "for lidt data") + '</div>';
    html += '<div class="bitvf-heat"><table><tr><th></th>';
    for (var hcol = 0; hcol < 24; hcol++) html += '<th>' + hcol + '</th>';
    html += '</tr>';
    for (var dr = 0; dr < 7; dr++) {
      html += '<tr><th>' + days[dr] + '</th>';
      for (var hc = 0; hc < 24; hc++) {
        var av = cnt[dr][hc] ? sum[dr][hc] / cnt[dr][hc] : 0;
        var intensity = max ? av / max : 0;
        var bg = cnt[dr][hc] ? heatColor(intensity) : "transparent";
        var ti = cnt[dr][hc] ? (days[dr] + " " + hc + ":00 · " + cnt[dr][hc] + " video(er) · " + fmt(Math.round(av)) + " gns. visn.") : "";
        html += '<td style="background:' + bg + '" title="' + escapeHtml(ti) + '"></td>';
      }
      html += '</tr>';
    }
    html += '</table></div>';
    bodyEl.innerHTML = html;
  }
  function heatColor(t) { var a = 0.12 + t * 0.85; return "rgba(124,58,237," + a.toFixed(2) + ")"; }

  function renderTags() {
    var l = preparedPeriod();
    countEl.textContent = l.length + " videoer";
    // hashtags
    var tagMap = {};
    l.forEach(function (r) { hashtagsOf(r.title).forEach(function (tg) { var o = tagMap[tg] || (tagMap[tg] = { tag: tg, n: 0, v: 0, sr: 0 }); o.n++; o.v += r.views; o.sr += r.saveRate; }); });
    var tags = Object.keys(tagMap).map(function (k) { var o = tagMap[k]; return { tag: o.tag, n: o.n, avgV: o.v / o.n, avgSR: o.sr / o.n }; }).filter(function (o) { return o.n >= 2; }).sort(function (a, b) { return b.avgV - a.avgV; }).slice(0, 18);
    // lyd
    var sndMap = {};
    l.forEach(function (r) { if (!r.musicId) return; var o = sndMap[r.musicId] || (sndMap[r.musicId] = { id: r.musicId, title: r.musicTitle, original: r.musicOriginal, n: 0, v: 0 }); o.n++; o.v += r.views; });
    var snds = Object.keys(sndMap).map(function (k) { var o = sndMap[k]; return { title: o.title || "(ukendt lyd)", original: o.original, n: o.n, avgV: o.v / o.n }; }).filter(function (o) { return o.n >= 2; }).sort(function (a, b) { return b.avgV - a.avgV; }).slice(0, 12);

    var html = '<div class="bitvf-sub2">Hashtags med flest gns. visninger (min. 2 videoer)</div>';
    if (tags.length) {
      html += '<table class="bitvf-tbl"><tr><th>#Hashtag</th><th>Antal</th><th>Gns. visn.</th><th>Gns. gem-rate</th></tr>';
      html += tags.map(function (o) { return '<tr><td>#' + escapeHtml(o.tag) + '</td><td>' + o.n + '</td><td>' + fmt(Math.round(o.avgV)) + '</td><td>' + pct(o.avgSR) + '</td></tr>'; }).join("");
      html += '</table>';
    } else html += '<div class="bitvf-empty-sub" style="padding:8px">Ikke nok hashtags endnu.</div>';

    html += '<div class="bitvf-sub2" style="margin-top:12px">Lyde/sange med flest gns. visninger (min. 2 videoer)</div>';
    if (snds.length) {
      html += '<table class="bitvf-tbl"><tr><th>Lyd</th><th>Antal</th><th>Gns. visn.</th></tr>';
      html += snds.map(function (o) { return '<tr><td>' + (o.original ? "🎵 " : "") + escapeHtml(o.title) + '</td><td>' + o.n + '</td><td>' + fmt(Math.round(o.avgV)) + '</td></tr>'; }).join("");
      html += '</table>';
    } else html += '<div class="bitvf-empty-sub" style="padding:8px">Ikke nok lyd-data endnu.</div>';
    bodyEl.innerHTML = html;
  }

  function renderRepost() {
    var all = preparedAll();
    var saveThresh = quantile(all.map(function (r) { return r.saveRate; }).sort(asc), 0.7);
    var cands = all.filter(function (r) { return r.ageDays != null && r.ageDays >= 21 && r.saveRate >= saveThresh && r.saveRate > 0 && (!r.reposted || (now() - r.reposted) > 45 * DAY); });
    cands.forEach(function (r) { r._ever = r.saveRate * Math.min((r.ageDays || 0) / 30, 4) * (1 + r.pSaves); });
    cands.sort(function (a, b) { return b._ever - a._ever; });
    countEl.textContent = cands.length + " repost-kandidater";
    var tip = '<div class="bitvf-tip">🔁 Gamle videoer med høj gem-rate som folk stadig gemmer – stærke at genposte. Tryk <b>✓ Reposted</b> når du har gjort det.</div>';
    if (!cands.length) { bodyEl.innerHTML = tip + '<div class="bitvf-empty"><p>Ingen klare repost-kandidater lige nu.</p></div>'; return; }
    bodyEl.innerHTML = tip + cands.slice(0, 40).map(function (r, i) {
      var cols = '<div class="bitvf-m bitvf-m-save">' + pct(r.saveRate) + '</div><div class="bitvf-m">' + fmt(r.saves) + '</div>' +
        '<div class="bitvf-m"><button class="bitvf-act bitvf-repbtn" data-act="reposted" data-id="' + r.id + '">✓ Reposted</button></div>';
      return videoRow(r, i, cols);
    }).join("");
  }

  function renderTrends() {
    var all = preparedAll();
    // sleeper hits = velocity leaders
    var vel = all.filter(function (r) { return r.velocity != null && r.velocity > 0; }).sort(function (a, b) { return b.velocity - a.velocity; }).slice(0, 8);
    // sammenlign 28d vs forrige 28d (efter udgivelsesdato)
    var n = now();
    function agg(fromAgo, toAgo) {
      var from = n - fromAgo * DAY, to = n - toAgo * DAY;
      var set = all.filter(function (r) { return r.created && r.created >= from && r.created < to; });
      var v = set.reduce(function (s, r) { return s + r.views; }, 0);
      var sr = set.length ? set.reduce(function (s, r) { return s + r.saveRate; }, 0) / set.length : 0;
      return { count: set.length, views: v, sr: sr };
    }
    var cur = agg(28, 0), prev = agg(56, 28);
    function delta(a, b) { if (!b) return a ? "+∞" : "0%"; var d = (a - b) / b * 100; return (d >= 0 ? "+" : "") + d.toFixed(0) + "%"; }
    var snapCount = 0; for (var k in snapshots) if (snapshots[k]) snapCount += snapshots[k].length;

    var html = '<div class="bitvf-sub2">Sammenlign perioder (efter udgivelsesdato)</div>';
    html += '<table class="bitvf-tbl"><tr><th></th><th>Seneste 28d</th><th>Forrige 28d</th><th>Δ</th></tr>' +
      '<tr><td>Videoer</td><td>' + cur.count + '</td><td>' + prev.count + '</td><td>' + delta(cur.count, prev.count) + '</td></tr>' +
      '<tr><td>Visninger i alt</td><td>' + fmt(cur.views) + '</td><td>' + fmt(prev.views) + '</td><td>' + delta(cur.views, prev.views) + '</td></tr>' +
      '<tr><td>Gns. gem-rate</td><td>' + pct(cur.sr) + '</td><td>' + pct(prev.sr) + '</td><td>' + delta(cur.sr, prev.sr) + '</td></tr></table>';

    html += '<div class="bitvf-sub2" style="margin-top:12px">🚀 Sleeper hits – størst vækst siden sidste besøg</div>';
    if (vel.length) {
      html += vel.map(function (r, i) {
        var cols = '<div class="bitvf-m">+' + fmt(Math.round(r.velocity)) + '<span class="bitvf-sub">/dag</span></div><div class="bitvf-m">' + fmt(r.views) + '</div><div class="bitvf-m bitvf-m-save">' + (r.hasSaves ? pct(r.saveRate) : "–") + '</div>';
        return videoRow(r, i, cols);
      }).join("");
    } else {
      html += '<div class="bitvf-tip">Velocity måles mellem dine besøg. Kom tilbage om en dag eller to – så fylder den op med vækst-data. (' + snapCount + ' snapshots gemt indtil videre.)</div>';
    }
    bodyEl.innerHTML = html;
  }

  // -------------------------------------------------------------- row actions
  function onBodyClick(e) {
    var btn = e.target.closest ? e.target.closest(".bitvf-act") : null;
    if (!btn) return;
    var act = btn.getAttribute("data-act"), id = btn.getAttribute("data-id");
    if (!id || !videos[id]) return;
    if (act === "watch") { if (watchlist[id]) delete watchlist[id]; else watchlist[id] = 1; saveWatch(); render(); }
    else if (act === "cover") { downloadCover(videos[id]); }
    else if (act === "repurpose") { repurpose(videos[id]); }
    else if (act === "reposted") { videos[id].reposted = now(); persist(); toast("Markeret som reposted ✓"); render(); }
  }
  function downloadCover(r) {
    if (!r.thumbnail) return;
    var fn = "byensit-cover-" + r.id + ".jpg";
    try { chrome.runtime.sendMessage({ type: "bit-download", url: r.thumbnail, filename: fn }, function (resp) { void chrome.runtime.lastError; toast(resp && resp.ok ? "Cover hentet ⬇" : "Kunne ikke hente cover"); }); }
    catch (e) { toast("Kunne ikke hente cover"); }
  }
  function repurpose(r) {
    var tags = hashtagsOf(r.title);
    var clean = (r.title || "").replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim();
    var pack = clean + "\n\n" + tags.map(function (t) { return "#" + t; }).join(" ");
    try { navigator.clipboard.writeText(pack).then(function () { toast("Titel + hashtags kopieret ↗ (klar til Reels/Shorts)"); }, function () { toast("Kunne ikke kopiere"); }); }
    catch (e) { toast("Kunne ikke kopiere"); }
  }

  // -------------------------------------------------------------- auto-scroll
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function harvest(btn) {
    if (harvesting) { harvesting = false; return; }
    harvesting = true; btn.textContent = "⏹ Stop (henter…)";
    (function loop() {
      var lastH = 0, stable = 0, i = 0, cap = 100;
      function step() {
        if (!harvesting || i >= cap || stable >= 4) {
          harvesting = false; btn.textContent = "⤓ Hent hele profilen"; window.scrollTo(0, 0); toast("Hentning færdig · " + ownCount() + " videoer"); return;
        }
        window.scrollTo(0, document.body.scrollHeight);
        i++;
        wait(950).then(function () {
          var h = document.body.scrollHeight;
          if (h === lastH) stable++; else { stable = 0; lastH = h; }
          btn.textContent = "⏹ Stop · " + ownCount() + " (" + i + ")";
          step();
        });
      }
      step();
    })();
  }

  // ------------------------------------------------------------------- export
  function csvCell(s) { s = String(s == null ? "" : s).replace(/"/g, '""'); return /[";\n\r]/.test(s) ? '"' + s + '"' : s; }
  function exportRows() {
    var l = (activeTab === "watch") ? preparedAll().filter(function (r) { return r.inWatch; }) : preparedPeriod();
    l.sort(sorter(currentSort)); return l;
  }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.documentElement.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function stamp() { return new Date().toISOString().slice(0, 10); }
  function exportCsv() {
    var l = exportRows();
    var head = ["Rank", "Titel", "Dato", "Visninger", "Likes", "Kommentarer", "Delinger", "Gemte", "Gem-rate%", "Engagement%", "Velocity/dag", "Score", "Lyd", "URL"];
    var lines = [head.join(";")];
    for (var i = 0; i < l.length; i++) { var r = l[i]; lines.push([i + 1, csvCell(r.title || ""), (r.created ? new Date(r.created).toISOString().slice(0, 10) : ""), r.views, r.likes, r.comments, r.shares, r.saves, (r.saveRate * 100).toFixed(2), (r.engagement * 100).toFixed(2), (r.velocity != null ? Math.round(r.velocity) : ""), r.score, csvCell(r.musicTitle || ""), csvCell(videoUrl(r) || "")].join(";")); }
    download("byens-it-videoer-" + stamp() + ".csv", "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8");
    toast("CSV eksporteret ⬇");
  }
  function exportJson() {
    var l = exportRows().map(function (r) { return { id: r.id, title: r.title, url: videoUrl(r), created: r.created ? new Date(r.created).toISOString() : null, views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, saves: r.saves, saveRate: +r.saveRate.toFixed(4), engagement: +r.engagement.toFixed(4), velocity: r.velocity != null ? Math.round(r.velocity) : null, score: r.score, music: r.musicTitle || null }; });
    download("byens-it-videoer-" + stamp() + ".json", JSON.stringify(l, null, 2), "application/json");
    toast("JSON eksporteret ⬇");
  }

  // --------------------------------------------------------------------- toast
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "bitvf-toast"; document.documentElement.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("bitvf-toast-show");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("bitvf-toast-show"); }, 2600);
  }

  // ------------------------------------------------------------------ opstart
  loadStored(function () {
    maybeDetectOwner();
    pruneNonOwn();
    ensurePanel();
    updateBadge();
    scanInlineState();
    setTimeout(scanInlineState, 2500);
    setTimeout(scanInlineState, 6000);
  });
})();
