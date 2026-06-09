/*
 * Byens IT – Video Filter
 * content.js  (kører i ISOLATED world – har adgang til chrome.* API'er)
 *
 * Modtager de opfangede JSON-svar fra inject.js, finder video-records uanset
 * præcist feltnavn, normaliserer dem til {visninger, likes, gemte ...}, gemmer
 * lokalt og tegner et flydende panel hvor du kan sortere og filtrere.
 *
 * Alt sker lokalt i din browser. Intet sendes nogen steder hen.
 */
(function () {
  "use strict";
  if (window.__bitVFLoaded) return;
  window.__bitVFLoaded = true;

  var STORE_KEY = "bit_videos";
  var SETTINGS_KEY = "bit_settings";

  var videos = {};                 // id -> record
  var settings = { username: "", owner: "" };
  var currentSort = "views";       // "mest virale" = visninger (default)
  var searchTerm = "";
  var renderQueued = false;
  var periodPreset = "all";        // all | 7 | 28 | 90 | year | custom
  var customFrom = "";
  var customTo = "";

  // ----------------------------------------------------------------- feltkort
  // TikTok skifter feltnavne mellem endpoints – vi prøver alle kendte varianter.
  var F = {
    id:       ["id", "aweme_id", "awemeId", "item_id", "itemId", "video_id", "videoId", "group_id", "groupId", "itemID"],
    title:    ["desc", "title", "description", "item_title", "itemTitle", "caption", "text", "video_desc", "content", "post_title"],
    views:    ["play_count", "playCount", "video_views", "videoViews", "vv", "views", "view_count", "viewCount", "play", "total_play", "show_cnt", "impression", "impressions"],
    likes:    ["digg_count", "diggCount", "like_count", "likeCount", "likes", "digg", "heart_count"],
    comments: ["comment_count", "commentCount", "comments"],
    shares:   ["share_count", "shareCount", "shares", "forward_count", "forwardCount"],
    saves:    ["collect_count", "collectCount", "favorite_count", "favoriteCount", "save_count", "saveCount", "saves", "favorites", "favourite_count", "collect"],
    created:  ["create_time", "createTime", "createTimestamp", "create_timestamp", "created_at", "createdAt", "publish_time", "publishTime", "create_date"]
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
        var mult = u === "k" ? 1e3 : u === "m" ? 1e6 : 1e9;
        return Math.round(n * mult);
      }
    }
    return null;
  }

  function readMetric(obj, names) {
    var i, n, v;
    for (i = 0; i < names.length; i++) {
      n = names[i];
      if (obj[n] != null) { v = num(obj[n]); if (v != null) return v; }
    }
    for (var c = 0; c < STAT_CONTAINERS.length; c++) {
      var sub = obj[STAT_CONTAINERS[c]];
      if (sub && typeof sub === "object") {
        for (i = 0; i < names.length; i++) {
          n = names[i];
          if (sub[n] != null) { v = num(sub[n]); if (v != null) return v; }
        }
      }
    }
    return null;
  }

  function readTime(obj) {
    for (var i = 0; i < F.created.length; i++) {
      var v = obj[F.created[i]];
      if (v == null) continue;
      if (typeof v === "string" && /\d{4}-\d{2}-\d{2}/.test(v)) {
        var t = Date.parse(v);
        if (!isNaN(t)) return t;
      }
      var n = (typeof v === "number") ? v : parseInt(String(v), 10);
      if (!isNaN(n) && n > 0) {
        if (n >= 1e12) return n;          // allerede millisekunder
        if (n >= 1e9) return n * 1000;    // unix-sekunder -> ms
      }
    }
    return 0;
  }

  function readId(obj) {
    for (var i = 0; i < F.id.length; i++) {
      var v = obj[F.id[i]];
      if (v != null && (typeof v === "string" || typeof v === "number")) {
        var s = String(v);
        if (/^\d{6,}$/.test(s)) return s;      // TikTok-id'er er lange tal
      }
    }
    return null;
  }

  function readTitle(obj) {
    for (var i = 0; i < F.title.length; i++) {
      var v = obj[F.title[i]];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
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
    for (i = 0; i < keys.length; i++) {
      if (obj[keys[i]] != null) { u = pickUrl(obj[keys[i]]); if (u) return u; }
    }
    if (obj.video && typeof obj.video === "object") {
      for (i = 0; i < keys.length; i++) {
        if (obj.video[keys[i]] != null) { u = pickUrl(obj.video[keys[i]]); if (u) return u; }
      }
    }
    return "";
  }

  function readAuthor(obj) {
    var a = obj.author || obj.authorInfo || obj.user || {};
    var cand = [a.unique_id, a.uniqueId, a.uniqueID, obj.unique_id, obj.uniqueId];
    for (var i = 0; i < cand.length; i++) {
      if (typeof cand[i] === "string" && cand[i].trim()) return cand[i].trim().replace(/^@/, "");
    }
    return "";
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
    if (present === 0) return null;
    var title = readTitle(obj);
    if (!title && present < 2) return null;        // for lidt til at være en rigtig video-record
    return {
      id: id,
      title: title,
      thumbnail: readCover(obj),
      author: readAuthor(obj),
      created: readTime(obj),
      views: views || 0,
      likes: likes || 0,
      comments: comments || 0,
      shares: shares || 0,
      saves: saves || 0,
      hasSaves: saves != null,
      hasViews: views != null
    };
  }

  function walk(node, out, depth) {
    if (!node || depth > 9) return;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) walk(node[i], out, depth + 1);
      return;
    }
    if (typeof node === "object") {
      var rec = asVideo(node);
      if (rec) out.push(rec);
      for (var k in node) {
        if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
        var v = node[k];
        if (v && typeof v === "object") walk(v, out, depth + 1);
      }
    }
  }

  function ingest(json) {
    if (!json || typeof json !== "object") return 0;
    var found = [];
    walk(json, found, 0);
    if (!found.length) return 0;
    maybeDetectOwner();
    var added = 0;
    for (var i = 0; i < found.length; i++) {
      var r = found[i];
      if (!isOwn(r)) continue;          // spring fremmede videoer over (For You-feed m.m.)
      var prev = videos[r.id];
      if (!prev) { videos[r.id] = r; added++; }
      else {
        prev.views = Math.max(prev.views, r.views);
        prev.likes = Math.max(prev.likes, r.likes);
        prev.comments = Math.max(prev.comments, r.comments);
        prev.shares = Math.max(prev.shares, r.shares);
        prev.saves = Math.max(prev.saves, r.saves);
        if (!prev.title && r.title) prev.title = r.title;
        if (!prev.thumbnail && r.thumbnail) prev.thumbnail = r.thumbnail;
        if (!prev.author && r.author) prev.author = r.author;
        if (!prev.created && r.created) prev.created = r.created;
        prev.hasSaves = prev.hasSaves || r.hasSaves;
        prev.hasViews = prev.hasViews || r.hasViews;
      }
    }
    persist();
    queueRender();
    return added;
  }

  // ------------------------------------------------------------------ storage
  function persist() {
    try { chrome.storage.local.set({ "bit_videos": videos }); } catch (e) {}
  }
  function saveSettings() {
    try { chrome.storage.local.set({ "bit_settings": settings }); } catch (e) {}
  }
  function loadStored(cb) {
    try {
      chrome.storage.local.get([STORE_KEY, SETTINGS_KEY], function (res) {
        void chrome.runtime.lastError;
        if (res && res[STORE_KEY]) videos = res[STORE_KEY];
        if (res && res[SETTINGS_KEY]) settings = Object.assign(settings, res[SETTINGS_KEY]);
        if (cb) cb();
      });
    } catch (e) { if (cb) cb(); }
  }

  // -------------------------------------------------- beskeder fra inject/popup
  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    var d = ev.data;
    if (!d || d.source !== "bit-vf" || d.kind !== "capture") return;
    try { ingest(d.payload && d.payload.json); } catch (e) {}
  });

  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (!msg) return;
      if (msg.type === "bit-toggle") { togglePanel(true); sendResponse({ ok: true, count: count() }); }
      else if (msg.type === "bit-count") { sendResponse({ count: count() }); }
      else if (msg.type === "bit-set-username") {
        settings.username = (msg.username || "").trim().replace(/^@/, "");
        saveSettings(); queueRender(); sendResponse({ ok: true });
      }
      return true;
    });
  } catch (e) {}

  // ------------------------------------------------ TikTok inline state (SIGI)
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
  function count() { return Object.keys(videos).length; }
  function ownCount() {
    var n = 0;
    for (var k in videos) {
      if (Object.prototype.hasOwnProperty.call(videos, k) && isOwn(videos[k])) n++;
    }
    return n;
  }

  function fmt(n) {
    n = n || 0;
    if (n >= 1e6) return trimDot((n / 1e6).toFixed(n >= 1e7 ? 0 : 1)) + "M";
    if (n >= 1e3) return trimDot((n / 1e3).toFixed(n >= 1e4 ? 0 : 1)) + "K";
    return String(n);
  }
  function trimDot(s) { return s.replace(/\.0$/, ""); }
  function pct(x) { return (x * 100).toFixed(1).replace(/\.0$/, "") + "%"; }

  function fmtDate(ms) {
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return ""; }
  }

  function videoUrl(r) {
    var user = r.author || settings.username;
    if (user) return "https://www.tiktok.com/@" + user + "/video/" + r.id;
    return null;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ----------------------------------------------- ejer-filter (kun egne videoer)
  // Holder For You-feed og andres videoer ude. "Ejer" = dit brugernavn (sat i
  // pop-up'en) eller auto-registreret fra profil-URL'en (tiktok.com/@navn).
  function ownerId() {
    return String(settings.username || settings.owner || "").toLowerCase().replace(/^@/, "");
  }
  function isOwn(r) {
    var o = ownerId();
    if (!o) return true;            // ejer ukendt → filtrér ikke (undgå tom liste)
    if (!r.author) return true;     // ingen forfatter (fx TikTok Studio) → antag egen
    return String(r.author).toLowerCase() === o;
  }
  function pruneNonOwn() {
    var o = ownerId();
    if (!o) return false;
    var changed = false;
    for (var k in videos) {
      if (Object.prototype.hasOwnProperty.call(videos, k)) {
        var a = videos[k].author;
        if (a && String(a).toLowerCase() !== o) { delete videos[k]; changed = true; }
      }
    }
    if (changed) persist();
    return changed;
  }
  function maybeDetectOwner() {
    try {
      var m = location.pathname.match(/^\/@([a-z0-9._-]+)/i);
      if (m) {
        var u = m[1].toLowerCase();
        if (settings.owner !== u) {
          settings.owner = u;
          saveSettings();
          if (pruneNonOwn()) queueRender();
        }
      }
    } catch (e) {}
  }

  // ----------------------------------------------------------- afledte tal
  function withDerived(list) {
    return list.map(function (r) {
      var saveRate = r.views ? r.saves / r.views : 0;
      var likeRate = r.views ? r.likes / r.views : 0;
      var eng = r.views ? (r.likes + r.comments + r.shares + r.saves) / r.views : 0;
      return Object.assign({}, r, { saveRate: saveRate, likeRate: likeRate, eng: eng });
    });
  }

  function quantile(sorted, q) {
    if (!sorted.length) return 0;
    var pos = (sorted.length - 1) * q;
    var base = Math.floor(pos), rest = pos - base;
    if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    return sorted[base];
  }

  function asc(a, b) { return a - b; }

  function tagVideos(list) {
    var savesArr = list.map(function (r) { return r.saves; }).sort(asc);
    var viewsArr = list.map(function (r) { return r.views; }).sort(asc);
    var rateArr = list.map(function (r) { return r.saveRate; }).sort(asc);
    var savesP80 = quantile(savesArr, 0.8);
    var viewsMed = quantile(viewsArr, 0.5);
    var rateP70 = quantile(rateArr, 0.7);
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      r.tags = [];
      if (savesP80 > 0 && r.saves >= savesP80) {
        r.tags.push({ t: "🔁 Repost", c: "repost", title: "Top 20% på gemte – folk gemmer den for at vende tilbage. Stærk repost-kandidat." });
      }
      if (rateP70 > 0 && r.views >= viewsMed && r.saveRate >= rateP70) {
        r.tags.push({ t: "🔥 Lav mere", c: "more", title: "God rækkevidde + høj gem-rate – formatet virker. Lav flere som denne." });
      }
    }
    return list;
  }

  function currentList() {
    var own = Object.keys(videos).map(function (k) { return videos[k]; }).filter(isOwn);
    var list = withDerived(own);
    var rng = getRange();
    if (rng[0] > 0 || rng[1] !== Infinity) {
      list = list.filter(function (r) { return r.created && r.created >= rng[0] && r.created <= rng[1]; });
    }
    tagVideos(list);                 // badges beregnes relativt til den valgte periode
    if (searchTerm) {
      list = list.filter(function (r) { return (r.title || "").toLowerCase().indexOf(searchTerm) !== -1; });
    }
    list.sort(function (a, b) { return (b[currentSort] || 0) - (a[currentSort] || 0); });
    return list;
  }

  // --------------------------------------------------------------------- panel
  var root, listEl, countEl, fab;

  function ensurePanel() {
    if (root) return;

    fab = document.createElement("button");
    fab.className = "bitvf-fab";
    fab.type = "button";
    fab.title = "Byens IT – Video Filter";
    fab.addEventListener("click", function () { togglePanel(); });
    document.documentElement.appendChild(fab);

    root = document.createElement("div");
    root.className = "bitvf-panel bitvf-hidden";
    root.innerHTML =
      '<div class="bitvf-head">' +
        '<div class="bitvf-title"><span class="bitvf-logo">▼</span> Byens IT · Video Filter</div>' +
        '<button class="bitvf-x" type="button" title="Luk">✕</button>' +
      '</div>' +
      '<div class="bitvf-controls">' +
        '<span class="bitvf-lbl">Sortér efter</span>' +
        '<div class="bitvf-sortbtns">' +
          '<button data-sort="views">Visninger</button>' +
          '<button data-sort="likes">Likes</button>' +
          '<button data-sort="saves">Gemte</button>' +
          '<button data-sort="saveRate">Gem-rate</button>' +
          '<button data-sort="eng">Engagement</button>' +
        '</div>' +
      '</div>' +
      '<div class="bitvf-controls bitvf-period">' +
        '<span class="bitvf-lbl">Periode (efter udgivelsesdato)</span>' +
        '<div class="bitvf-periodbtns">' +
          '<button data-period="all">Alle</button>' +
          '<button data-period="7">7 dage</button>' +
          '<button data-period="28">28 dage</button>' +
          '<button data-period="90">90 dage</button>' +
          '<button data-period="year">I år</button>' +
          '<button data-period="custom">Custom</button>' +
        '</div>' +
        '<div class="bitvf-custom bitvf-hidden">' +
          '<input type="date" class="bitvf-from" /> <span class="bitvf-dash">–</span> <input type="date" class="bitvf-to" />' +
        '</div>' +
      '</div>' +
      '<div class="bitvf-controls2">' +
        '<input class="bitvf-search" type="search" placeholder="Søg i titel/tekst…" />' +
        '<span class="bitvf-count"></span>' +
      '</div>' +
      '<div class="bitvf-list"></div>' +
      '<div class="bitvf-foot">' +
        '<button class="bitvf-export" type="button">⬇︎ CSV</button>' +
        '<button class="bitvf-clear" type="button">Ryd data</button>' +
        '<span class="bitvf-hint">Data fanges automatisk på din profil &amp; TikTok Studio</span>' +
      '</div>';
    document.documentElement.appendChild(root);

    listEl = root.querySelector(".bitvf-list");
    countEl = root.querySelector(".bitvf-count");
    root.querySelector(".bitvf-x").addEventListener("click", function () { togglePanel(false); });

    var btns = root.querySelectorAll(".bitvf-sortbtns button");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener("click", function () { currentSort = b.getAttribute("data-sort"); updateSortButtons(); renderList(); });
      })(btns[i]);
    }
    var pbtns = root.querySelectorAll(".bitvf-periodbtns button");
    for (var p = 0; p < pbtns.length; p++) {
      (function (b) {
        b.addEventListener("click", function () {
          periodPreset = b.getAttribute("data-period");
          var custom = root.querySelector(".bitvf-custom");
          if (custom) custom.classList.toggle("bitvf-hidden", periodPreset !== "custom");
          updatePeriodButtons();
          renderList();
        });
      })(pbtns[p]);
    }
    root.querySelector(".bitvf-from").addEventListener("change", function (e) {
      customFrom = e.target.value || ""; periodPreset = "custom"; updatePeriodButtons(); renderList();
    });
    root.querySelector(".bitvf-to").addEventListener("change", function (e) {
      customTo = e.target.value || ""; periodPreset = "custom"; updatePeriodButtons(); renderList();
    });
    root.querySelector(".bitvf-search").addEventListener("input", function (e) {
      searchTerm = (e.target.value || "").toLowerCase(); renderList();
    });
    root.querySelector(".bitvf-export").addEventListener("click", exportCsv);
    root.querySelector(".bitvf-clear").addEventListener("click", function () {
      if (window.confirm("Ryd alle indsamlede video-data fra denne udvidelse?")) {
        videos = {}; persist(); renderList(); updateBadge();
      }
    });

    updateSortButtons();
    updatePeriodButtons();
  }

  function updateSortButtons() {
    if (!root) return;
    var btns = root.querySelectorAll(".bitvf-sortbtns button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-sort") === currentSort);
    }
  }

  function updatePeriodButtons() {
    if (!root) return;
    var btns = root.querySelectorAll(".bitvf-periodbtns button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-period") === periodPreset);
    }
  }

  function getRange() {
    var now = Date.now();
    var day = 86400000;
    if (periodPreset === "7") return [now - 7 * day, Infinity];
    if (periodPreset === "28") return [now - 28 * day, Infinity];
    if (periodPreset === "90") return [now - 90 * day, Infinity];
    if (periodPreset === "year") return [new Date(new Date(now).getFullYear(), 0, 1).getTime(), Infinity];
    if (periodPreset === "custom") {
      var from = customFrom ? new Date(customFrom + "T00:00:00").getTime() : 0;
      var to = customTo ? new Date(customTo + "T23:59:59").getTime() : Infinity;
      return [from, to];
    }
    return [0, Infinity]; // all
  }

  function togglePanel(forceOpen) {
    ensurePanel();
    var open = forceOpen === true ? true : (forceOpen === false ? false : root.classList.contains("bitvf-hidden"));
    root.classList.toggle("bitvf-hidden", !open);
    fab.classList.toggle("bitvf-fab-active", open);
    if (open) renderList();
  }

  function updateBadge() {
    if (!fab) return;
    var n = ownCount();
    fab.innerHTML = '<span class="bitvf-logo">▼</span> Byens IT' + (n ? ' <b>' + n + '</b>' : "");
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(function () {
      renderQueued = false;
      updateBadge();
      if (root && !root.classList.contains("bitvf-hidden")) renderList();
    }, 350);
  }

  function renderList() {
    ensurePanel();
    var list = currentList();
    var total = ownCount();
    countEl.textContent = list.length + " / " + total + " videoer";

    if (!total) {
      listEl.innerHTML =
        '<div class="bitvf-empty">' +
          '<div class="bitvf-empty-ic">▼</div>' +
          '<p><b>Ingen data endnu.</b></p>' +
          '<p><b>Mest virale + periode:</b> gå til <b>din egen TikTok-profil</b> (tiktok.com/@ditbrugernavn) og scroll roligt igennem videoerne.</p>' +
          '<p><b>Gemte:</b> åbn <a href="https://www.tiktok.com/tiktokstudio/analytics" target="_blank" rel="noopener">TikTok Studio · Analytics</a> → fanen <b>Indhold</b> og scroll.</p>' +
          '<p class="bitvf-empty-sub">Visninger, likes, gemte og udgivelsesdato fanges automatisk mens du browser.</p>' +
        '</div>';
      return;
    }

    var headHtml =
      '<div class="bitvf-rowhead">' +
        '<div class="bitvf-rank">#</div>' +
        '<div class="bitvf-thumb-sp"></div>' +
        '<div class="bitvf-main">Video</div>' +
        '<div class="bitvf-m">Visn.</div>' +
        '<div class="bitvf-m">Likes</div>' +
        '<div class="bitvf-m">Gemte</div>' +
      '</div>';

    var rows = list.map(function (r, idx) {
      var url = videoUrl(r);
      var titleTxt = escapeHtml(r.title || "(uden titel)");
      var titleCell = url
        ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" class="bitvf-vtitle">' + titleTxt + '</a>'
        : '<span class="bitvf-vtitle">' + titleTxt + '</span>';
      var thumb = r.thumbnail
        ? '<img class="bitvf-thumb" src="' + escapeHtml(r.thumbnail) + '" loading="lazy" referrerpolicy="no-referrer" alt="" />'
        : '<div class="bitvf-thumb bitvf-thumb-ph">▼</div>';
      var tags = (r.tags || []).map(function (t) {
        return '<span class="bitvf-tag bitvf-tag-' + t.c + '" title="' + escapeHtml(t.title) + '">' + t.t + '</span>';
      }).join("");
      var saveCell = r.hasSaves
        ? fmt(r.saves) + '<span class="bitvf-sub">' + pct(r.saveRate) + '</span>'
        : '<span class="bitvf-na" title="Gemte vises kun i TikTok Studio · Analytics">–</span>';

      return '<div class="bitvf-row">' +
          '<div class="bitvf-rank">' + (idx + 1) + '</div>' +
          thumb +
          '<div class="bitvf-main">' +
            '<div class="bitvf-titleline">' + titleCell + '</div>' +
            '<div class="bitvf-meta">' +
              (r.created ? '<span class="bitvf-date">📅 ' + fmtDate(r.created) + '</span>' : '') +
              tags +
            '</div>' +
          '</div>' +
          '<div class="bitvf-m" title="Visninger">' + fmt(r.views) + '</div>' +
          '<div class="bitvf-m" title="Likes">' + fmt(r.likes) + '</div>' +
          '<div class="bitvf-m bitvf-m-save" title="Gemte">' + saveCell + '</div>' +
        '</div>';
    }).join("");

    listEl.innerHTML = headHtml + rows;
  }

  function csvCell(s) {
    s = String(s == null ? "" : s).replace(/"/g, '""');
    return /[";\n\r]/.test(s) ? '"' + s + '"' : s;
  }

  function exportCsv() {
    var list = currentList();
    var head = ["Rank", "Titel", "Dato", "Visninger", "Likes", "Kommentarer", "Delinger", "Gemte", "Gem-rate%", "Like-rate%", "Engagement%", "URL"];
    var lines = [head.join(";")];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      lines.push([
        i + 1,
        csvCell(r.title || ""),
        (r.created ? new Date(r.created).toISOString().slice(0, 10) : ""),
        r.views, r.likes, r.comments, r.shares, r.saves,
        (r.saveRate * 100).toFixed(2), (r.likeRate * 100).toFixed(2), (r.eng * 100).toFixed(2),
        csvCell(videoUrl(r) || "")
      ].join(";"));
    }
    var stamp = new Date().toISOString().slice(0, 10);
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "byens-it-videoer-" + stamp + ".csv";
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
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
