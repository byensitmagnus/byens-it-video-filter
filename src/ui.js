/*
 * TikTok Creator Video Filter · ui.js
 * Bygger og opdaterer analyse-panelet (faneblade, lister, heatmap, tabeller,
 * row-actions, toast, lys/mørk). Browser-modul. UMD: self.BITVF.ui.
 */
;(function (root, factory) {
  "use strict";
  function dep(name) { return (typeof require === "function") ? require("./" + name + ".js") : (root.BITVF && root.BITVF[name]); }
  var api = factory(dep("constants"), dep("storage"), dep("metrics"), dep("parser"), dep("export"));
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof self !== "undefined") { root.BITVF = root.BITVF || {}; root.BITVF.ui = api; }
})(typeof self !== "undefined" ? self : this, function (C, S, M, P, X) {
  "use strict";

  var DAY = C.DAY;
  var currentSort = "score", searchTerm = "", periodPreset = "all", customFrom = "", customTo = "", activeTab = "top";
  var harvesting = false, renderQueued = false;
  var root, fab, bodyEl, countEl, toastEl;

  // ---------- helpers ----------
  function now() { return Date.now(); }
  function fmt(n) { n = n || 0; if (n >= 1e6) return trimDot((n / 1e6).toFixed(n >= 1e7 ? 0 : 1)) + "M"; if (n >= 1e3) return trimDot((n / 1e3).toFixed(n >= 1e4 ? 0 : 1)) + "K"; return String(Math.round(n)); }
  function trimDot(s) { return s.replace(/\.0$/, ""); }
  function pct(x) { return (x * 100).toFixed(1).replace(/\.0$/, "") + "%"; }
  function fmtDate(ms) { if (!ms) return ""; try { return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function videoUrl(r) { var u = r.author || S.ownerId(); return u ? ("https://www.tiktok.com/@" + u + "/video/" + r.id) : null; }
  function asc(a, b) { return a - b; }

  function buildList(applyPeriod, applySearch) {
    var t = now();
    var l = S.ownVideos().map(function (r) { return M.deriveOne(r, S.getVelocity(r.id), t); });
    if (applyPeriod) { var rng = M.getRange(periodPreset, customFrom, customTo, t); l = l.filter(function (r) { return M.inPeriod(r, rng); }); }
    if (applySearch && searchTerm) l = l.filter(function (r) { return (r.title || "").toLowerCase().indexOf(searchTerm) !== -1; });
    M.decorate(l);
    l.forEach(function (r) { r.inWatch = S.isWatched(r.id); });
    return l;
  }
  function sorter(key) {
    if (key === "created") return function (a, b) { return (b.created || 0) - (a.created || 0); };
    if (key === "velocity") return function (a, b) { return (b.velocity || -1) - (a.velocity || -1); };
    return function (a, b) { return (b[key] || 0) - (a[key] || 0); };
  }

  // ---------- panel shell ----------
  function ensurePanel() {
    if (root) return;
    var s = S.getSettings();
    fab = document.createElement("button");
    fab.className = "bitvf-fab"; fab.type = "button"; fab.title = "TikTok Creator Video Filter";
    fab.addEventListener("click", function () { toggle(); });
    document.documentElement.appendChild(fab);

    root = document.createElement("div");
    root.className = "bitvf-panel bitvf-hidden" + (s.theme === "light" ? " bitvf-light" : "");
    root.innerHTML =
      '<div class="bitvf-head">' +
        '<div class="bitvf-title"><span class="bitvf-logo">▼</span> Creator Video Filter</div>' +
        '<div class="bitvf-headbtns"><button class="bitvf-theme" type="button" title="Light/dark">◐</button><button class="bitvf-x" type="button" title="Close">✕</button></div>' +
      '</div>' +
      '<div class="bitvf-tabs"></div>' +
      '<div class="bitvf-warn bitvf-hidden"></div>' +
      '<div class="bitvf-controls2"><input class="bitvf-search" type="search" placeholder="Search title/text…" /><span class="bitvf-count"></span></div>' +
      '<div class="bitvf-period"><span class="bitvf-lbl">Period</span><div class="bitvf-periodbtns"></div>' +
        '<div class="bitvf-custom bitvf-hidden"><input type="date" class="bitvf-from" /> <span class="bitvf-dash">–</span> <input type="date" class="bitvf-to" /></div></div>' +
      '<div class="bitvf-sortrow"><span class="bitvf-lbl">Sort</span><div class="bitvf-sortbtns"></div></div>' +
      '<div class="bitvf-body"></div>' +
      '<div class="bitvf-foot">' +
        '<button class="bitvf-harvest" type="button" title="Auto-scroll the whole profile">⤓ Fetch entire profile</button>' +
        '<button class="bitvf-csv" type="button">CSV</button><button class="bitvf-json" type="button">JSON</button><button class="bitvf-clear" type="button">Clear</button>' +
      '</div>';
    document.documentElement.appendChild(root);
    bodyEl = root.querySelector(".bitvf-body");
    countEl = root.querySelector(".bitvf-count");

    var tabsEl = root.querySelector(".bitvf-tabs");
    tabsEl.innerHTML = C.TABS.map(function (t) { return '<button data-tab="' + t.k + '">' + escapeHtml(t.n) + '</button>'; }).join("");
    tabsEl.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { activeTab = b.getAttribute("data-tab"); S.setActiveTab(activeTab); updateTabs(); render(); }); });

    var sortEl = root.querySelector(".bitvf-sortbtns");
    sortEl.innerHTML = C.SORTS.map(function (x) { return '<button data-sort="' + x.k + '">' + escapeHtml(x.n) + '</button>'; }).join("");
    sortEl.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { currentSort = b.getAttribute("data-sort"); updateSortButtons(); render(); }); });

    var perEl = root.querySelector(".bitvf-periodbtns");
    perEl.innerHTML = C.PERIODS.map(function (x) { return '<button data-period="' + x.k + '">' + escapeHtml(x.n) + '</button>'; }).join("");
    perEl.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        periodPreset = b.getAttribute("data-period");
        root.querySelector(".bitvf-custom").classList.toggle("bitvf-hidden", periodPreset !== "custom");
        updatePeriodButtons(); render();
      });
    });
    root.querySelector(".bitvf-from").addEventListener("change", function (e) { customFrom = e.target.value || ""; periodPreset = "custom"; updatePeriodButtons(); render(); });
    root.querySelector(".bitvf-to").addEventListener("change", function (e) { customTo = e.target.value || ""; periodPreset = "custom"; updatePeriodButtons(); render(); });
    root.querySelector(".bitvf-search").addEventListener("input", function (e) { searchTerm = (e.target.value || "").toLowerCase(); render(); });
    root.querySelector(".bitvf-x").addEventListener("click", function () { toggle(false); });
    root.querySelector(".bitvf-theme").addEventListener("click", toggleTheme);
    root.querySelector(".bitvf-csv").addEventListener("click", exportCsv);
    root.querySelector(".bitvf-json").addEventListener("click", exportJson);
    root.querySelector(".bitvf-harvest").addEventListener("click", function () { harvest(this); });
    root.querySelector(".bitvf-clear").addEventListener("click", function () { if (window.confirm("Clear ALL collected video data (including snapshots)?")) { S.clearAll(); render(); updateBadge(); } });
    bodyEl.addEventListener("click", onBodyClick);

    activeTab = s.activeTab || "top";
    updateTabs(); updateSortButtons(); updatePeriodButtons();
  }

  function updateTabs() { if (!root) return; root.querySelectorAll(".bitvf-tabs button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === activeTab); }); root.querySelector(".bitvf-sortrow").classList.toggle("bitvf-hidden", !(activeTab === "top" || activeTab === "watch")); }
  function updateSortButtons() { if (!root) return; root.querySelectorAll(".bitvf-sortbtns button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === currentSort); }); }
  function updatePeriodButtons() { if (!root) return; root.querySelectorAll(".bitvf-periodbtns button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-period") === periodPreset); }); }
  function toggleTheme() { var s = S.getSettings(); var next = s.theme === "light" ? "dark" : "light"; S.setTheme(next); root.classList.toggle("bitvf-light", next === "light"); }

  function toggle(forceOpen) {
    ensurePanel();
    var open = forceOpen === true ? true : (forceOpen === false ? false : root.classList.contains("bitvf-hidden"));
    root.classList.toggle("bitvf-hidden", !open);
    fab.classList.toggle("bitvf-fab-active", open);
    if (open) render();
  }
  function updateBadge() {
    if (fab) { var n = S.ownCount(); fab.innerHTML = '<span class="bitvf-logo">▼</span> Filter' + (n ? ' <b>' + n + '</b>' : ""); }
    try { chrome.runtime.sendMessage({ type: "bit-badge", count: S.ownCount() }, function () { void chrome.runtime.lastError; }); } catch (e) {}
  }
  function queueRender() { if (renderQueued) return; renderQueued = true; setTimeout(function () { renderQueued = false; updateBadge(); if (root && !root.classList.contains("bitvf-hidden")) render(); }, 350); }

  // ---------- render dispatch ----------
  function render() {
    ensurePanel();
    var warn = root.querySelector(".bitvf-warn"), w = P.getWarnings();
    if (w > 8) { warn.classList.remove("bitvf-hidden"); warn.textContent = "⚠️ Some numbers couldn't be read (" + w + ") — TikTok may have changed its format. Data may be incomplete."; }
    else warn.classList.add("bitvf-hidden");
    if (!S.ownCount()) { renderEmpty(); countEl.textContent = "0 videos"; return; }
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
      '<div class="bitvf-empty"><div class="bitvf-empty-ic">▼</div>' +
      '<p><b>No data yet.</b></p>' +
      '<p><b>1.</b> Open <b>your own TikTok profile</b> (tiktok.com/@yourname)</p>' +
      '<p><b>2.</b> Click <b>⤓ Fetch entire profile</b> below — or scroll down yourself</p>' +
      '<p><b>3.</b> Data is captured automatically · Saves only via TikTok Studio · Analytics</p>' +
      '<p class="bitvf-empty-sub">Everything stays local. Nothing leaves your browser.</p></div>';
  }

  function badgesHtml(r) { return (r.badges || []).map(function (t) { return '<span class="bitvf-tag bitvf-tag-' + t.c + '" title="' + escapeHtml(t.title) + '">' + t.t + '</span>'; }).join(""); }
  function rowActions(r) {
    return '<div class="bitvf-actions">' +
      '<button class="bitvf-act" data-act="watch" data-id="' + r.id + '" title="Watchlist">' + (r.inWatch ? "★" : "☆") + '</button>' +
      (r.thumbnail ? '<button class="bitvf-act" data-act="cover" data-id="' + r.id + '" title="Download cover">⬇</button>' : '') +
      '<button class="bitvf-act" data-act="repurpose" data-id="' + r.id + '" title="Copy title + hashtags for reuse">↗</button></div>';
  }
  function videoRow(r, idx, cols) {
    var url = videoUrl(r), titleTxt = escapeHtml(r.title || "(untitled)");
    var titleCell = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" class="bitvf-vtitle">' + titleTxt + '</a>' : '<span class="bitvf-vtitle">' + titleTxt + '</span>';
    var thumb = r.thumbnail ? '<img class="bitvf-thumb" src="' + escapeHtml(r.thumbnail) + '" loading="lazy" referrerpolicy="no-referrer" alt="" />' : '<div class="bitvf-thumb bitvf-thumb-ph">▼</div>';
    var meta = (r.created ? '<span class="bitvf-date">📅 ' + fmtDate(r.created) + '</span>' : '');
    return '<div class="bitvf-row"><div class="bitvf-rank">' + (idx + 1) + '</div>' + thumb +
      '<div class="bitvf-main"><div class="bitvf-titleline">' + titleCell + '</div><div class="bitvf-meta">' + meta + badgesHtml(r) + '</div>' + rowActions(r) + '</div>' + cols + '</div>';
  }

  function renderTop() {
    var l = buildList(true, true); countEl.textContent = l.length + " / " + S.ownCount() + " videos";
    l.sort(sorter(currentSort));
    var head = '<div class="bitvf-rowhead"><div class="bitvf-rank">#</div><div class="bitvf-thumb-sp"></div><div class="bitvf-main">Video</div><div class="bitvf-m">Views</div><div class="bitvf-m">Likes</div><div class="bitvf-m">Saves</div></div>';
    bodyEl.innerHTML = head + l.map(function (r, i) {
      var save = r.hasSaves ? fmt(r.saves) + '<span class="bitvf-sub">' + pct(r.saveRate) + '</span>' : '<span class="bitvf-na">–</span>';
      var sub = currentSort === "velocity" && r.velocity != null ? '<span class="bitvf-sub">+' + fmt(Math.round(r.velocity)) + '/d</span>' : (currentSort === "score" ? '<span class="bitvf-sub">' + r.score + 'p</span>' : '');
      var cols = '<div class="bitvf-m">' + fmt(r.views) + sub + '</div><div class="bitvf-m">' + fmt(r.likes) + '</div><div class="bitvf-m bitvf-m-save">' + save + '</div>';
      return videoRow(r, i, cols);
    }).join("");
  }

  function renderWatch() {
    var l = buildList(false, false).filter(function (r) { return r.inWatch; }); countEl.textContent = l.length + " watched";
    if (!l.length) { bodyEl.innerHTML = '<div class="bitvf-empty"><p>Nothing on your watchlist yet.</p><p class="bitvf-empty-sub">Tap ☆ on a video in the Top tab to add it.</p></div>'; return; }
    l.sort(sorter(currentSort));
    bodyEl.innerHTML = l.map(function (r, i) {
      var save = r.hasSaves ? fmt(r.saves) + '<span class="bitvf-sub">' + pct(r.saveRate) + '</span>' : '<span class="bitvf-na">–</span>';
      return videoRow(r, i, '<div class="bitvf-m">' + fmt(r.views) + '</div><div class="bitvf-m">' + fmt(r.likes) + '</div><div class="bitvf-m bitvf-m-save">' + save + '</div>');
    }).join("");
  }

  function renderLeaderboard() {
    var l = buildList(true, true).filter(function (r) { return r.hasSaves && r.views >= 1000; }); countEl.textContent = l.length + " videos (min 1K views)";
    l.sort(function (a, b) { return b.saveRate - a.saveRate; });
    if (!l.length) { bodyEl.innerHTML = '<div class="bitvf-empty"><p>No save data yet.</p><p class="bitvf-empty-sub">Saves are only visible in TikTok Studio · Analytics → Content. Scroll through there.</p></div>'; return; }
    var head = '<div class="bitvf-rowhead"><div class="bitvf-rank">#</div><div class="bitvf-thumb-sp"></div><div class="bitvf-main">Video</div><div class="bitvf-m">Save rate</div><div class="bitvf-m">Saves</div><div class="bitvf-m">Views</div></div>';
    bodyEl.innerHTML = head + l.slice(0, 60).map(function (r, i) {
      var topPct = 100 - Math.round(r.pSaveRate * 100);
      var cols = '<div class="bitvf-m bitvf-m-save">' + pct(r.saveRate) + '<span class="bitvf-sub">top ' + topPct + '%</span></div><div class="bitvf-m">' + fmt(r.saves) + '</div><div class="bitvf-m">' + fmt(r.views) + '</div>';
      return videoRow(r, i, cols);
    }).join("");
  }

  function renderTime() {
    var l = buildList(true, true).filter(function (r) { return r.created; }); countEl.textContent = l.length + " dated videos";
    if (l.length < 3) { bodyEl.innerHTML = '<div class="bitvf-empty"><p>Not enough data for posting times yet.</p><p class="bitvf-empty-sub">Fetch more dated videos first.</p></div>'; return; }
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var sum = [], cnt = [], d, h;
    for (d = 0; d < 7; d++) { sum[d] = []; cnt[d] = []; for (h = 0; h < 24; h++) { sum[d][h] = 0; cnt[d][h] = 0; } }
    l.forEach(function (r) { var dt = new Date(r.created), di = (dt.getDay() + 6) % 7, hi = dt.getHours(); sum[di][hi] += r.views; cnt[di][hi]++; });
    var max = 0, cells = [];
    for (d = 0; d < 7; d++) for (h = 0; h < 24; h++) { var avg = cnt[d][h] ? sum[d][h] / cnt[d][h] : 0; if (avg > max) max = avg; if (cnt[d][h]) cells.push({ d: d, h: h, avg: avg }); }
    cells.sort(function (a, b) { return b.avg - a.avg; });
    var top = cells.slice(0, 3).map(function (c) { return "<b>" + days[c.d] + " " + c.h + "-" + (c.h + 1) + "</b> (" + fmt(Math.round(c.avg)) + " avg views)"; });
    var html = '<div class="bitvf-tip">📈 Best times (your own history): ' + (top.length ? top.join(" · ") : "not enough data") + '</div><div class="bitvf-heat"><table><tr><th></th>';
    for (h = 0; h < 24; h++) html += '<th>' + h + '</th>';
    html += '</tr>';
    for (d = 0; d < 7; d++) {
      html += '<tr><th>' + days[d] + '</th>';
      for (h = 0; h < 24; h++) {
        var av = cnt[d][h] ? sum[d][h] / cnt[d][h] : 0, bg = cnt[d][h] ? heatColor(max ? av / max : 0) : "transparent";
        var ti = cnt[d][h] ? (days[d] + " " + h + ":00 · " + cnt[d][h] + " video(s) · " + fmt(Math.round(av)) + " avg views") : "";
        html += '<td style="background:' + bg + '" title="' + escapeHtml(ti) + '"></td>';
      }
      html += '</tr>';
    }
    bodyEl.innerHTML = html + '</table></div>';
  }
  function heatColor(t) { return "rgba(124,58,237," + (0.12 + t * 0.85).toFixed(2) + ")"; }

  function renderTags() {
    var l = buildList(true, true); countEl.textContent = l.length + " videos";
    var tagMap = {};
    l.forEach(function (r) { P.hashtagsOf(r.title).forEach(function (tg) { var o = tagMap[tg] || (tagMap[tg] = { tag: tg, n: 0, v: 0, sr: 0 }); o.n++; o.v += r.views; o.sr += r.saveRate; }); });
    var tags = Object.keys(tagMap).map(function (k) { var o = tagMap[k]; return { tag: o.tag, n: o.n, avgV: o.v / o.n, avgSR: o.sr / o.n }; }).filter(function (o) { return o.n >= 2; }).sort(function (a, b) { return b.avgV - a.avgV; }).slice(0, 18);
    var sndMap = {};
    l.forEach(function (r) { if (!r.musicId) return; var o = sndMap[r.musicId] || (sndMap[r.musicId] = { title: r.musicTitle, original: r.musicOriginal, n: 0, v: 0 }); o.n++; o.v += r.views; });
    var snds = Object.keys(sndMap).map(function (k) { var o = sndMap[k]; return { title: o.title || "(unknown sound)", original: o.original, n: o.n, avgV: o.v / o.n }; }).filter(function (o) { return o.n >= 2; }).sort(function (a, b) { return b.avgV - a.avgV; }).slice(0, 12);
    var html = '<div class="bitvf-sub2">Hashtags by average views (min 2 videos)</div>';
    if (tags.length) html += '<table class="bitvf-tbl"><tr><th>Hashtag</th><th>Count</th><th>Avg views</th><th>Avg save rate</th></tr>' + tags.map(function (o) { return '<tr><td>#' + escapeHtml(o.tag) + '</td><td>' + o.n + '</td><td>' + fmt(Math.round(o.avgV)) + '</td><td>' + pct(o.avgSR) + '</td></tr>'; }).join("") + '</table>';
    else html += '<div class="bitvf-empty-sub" style="padding:8px">Not enough hashtags yet.</div>';
    html += '<div class="bitvf-sub2" style="margin-top:12px">Sounds by average views (min 2 videos)</div>';
    if (snds.length) html += '<table class="bitvf-tbl"><tr><th>Sound</th><th>Count</th><th>Avg views</th></tr>' + snds.map(function (o) { return '<tr><td>' + (o.original ? "🎵 " : "") + escapeHtml(o.title) + '</td><td>' + o.n + '</td><td>' + fmt(Math.round(o.avgV)) + '</td></tr>'; }).join("") + '</table>';
    else html += '<div class="bitvf-empty-sub" style="padding:8px">Not enough sound data yet.</div>';
    bodyEl.innerHTML = html;
  }

  function renderRepost() {
    var all = buildList(false, false);
    var thr = M.quantile(all.map(function (r) { return r.saveRate; }).sort(asc), 0.7);
    var cands = all.filter(function (r) { return r.ageDays != null && r.ageDays >= 14 && r.saveRate >= thr && r.saveRate > 0 && (!S.getReposted(r.id) || (now() - S.getReposted(r.id)) > 45 * DAY); });
    cands.forEach(function (r) { r._ever = r.saveRate * Math.min((r.ageDays || 0) / 30, 4) * (1 + r.pSaves); });
    cands.sort(function (a, b) { return b._ever - a._ever; });
    countEl.textContent = cands.length + " repost candidates";
    var tip = '<div class="bitvf-tip">🔁 Older videos with a high save-rate that people still save — strong to repost. Click <b>✓ Reposted</b> once you have.</div>';
    if (!cands.length) { bodyEl.innerHTML = tip + '<div class="bitvf-empty"><p>No clear repost candidates right now.</p></div>'; return; }
    bodyEl.innerHTML = tip + cands.slice(0, 40).map(function (r, i) {
      var cols = '<div class="bitvf-m bitvf-m-save">' + pct(r.saveRate) + '</div><div class="bitvf-m">' + fmt(r.saves) + '</div><div class="bitvf-m"><button class="bitvf-act bitvf-repbtn" data-act="reposted" data-id="' + r.id + '">✓ Reposted</button></div>';
      return videoRow(r, i, cols);
    }).join("");
  }

  function renderTrends() {
    var all = buildList(false, false);
    var vel = all.filter(function (r) { return r.velocity != null && r.velocity > 0; }).sort(function (a, b) { return b.velocity - a.velocity; }).slice(0, 8);
    var t = now();
    function agg(fromAgo, toAgo) {
      var from = t - fromAgo * DAY, to = t - toAgo * DAY;
      var set = all.filter(function (r) { return r.created && r.created >= from && r.created < to; });
      return { count: set.length, views: set.reduce(function (s, r) { return s + r.views; }, 0), sr: set.length ? set.reduce(function (s, r) { return s + r.saveRate; }, 0) / set.length : 0 };
    }
    var cur = agg(28, 0), prev = agg(56, 28);
    function delta(a, b) { if (!b) return a ? "+∞" : "0%"; var d = (a - b) / b * 100; return (d >= 0 ? "+" : "") + d.toFixed(0) + "%"; }
    var html = '<div class="bitvf-sub2">Compare periods (by publish date)</div><table class="bitvf-tbl"><tr><th></th><th>Last 28d</th><th>Prev 28d</th><th>Δ</th></tr>' +
      '<tr><td>Videos</td><td>' + cur.count + '</td><td>' + prev.count + '</td><td>' + delta(cur.count, prev.count) + '</td></tr>' +
      '<tr><td>Total views</td><td>' + fmt(cur.views) + '</td><td>' + fmt(prev.views) + '</td><td>' + delta(cur.views, prev.views) + '</td></tr>' +
      '<tr><td>Avg save rate</td><td>' + pct(cur.sr) + '</td><td>' + pct(prev.sr) + '</td><td>' + delta(cur.sr, prev.sr) + '</td></tr></table>';
    html += '<div class="bitvf-sub2" style="margin-top:12px">🚀 Sleeper hits — biggest growth since last visit</div>';
    if (vel.length) html += vel.map(function (r, i) { return videoRow(r, i, '<div class="bitvf-m">+' + fmt(Math.round(r.velocity)) + '<span class="bitvf-sub">/day</span></div><div class="bitvf-m">' + fmt(r.views) + '</div><div class="bitvf-m bitvf-m-save">' + (r.hasSaves ? pct(r.saveRate) : "–") + '</div>'); }).join("");
    else html += '<div class="bitvf-tip">Velocity is measured between your visits. Come back in a day or two and it fills up. (' + S.snapshotCount() + ' snapshots stored so far.)</div>';
    bodyEl.innerHTML = html;
  }

  // ---------- row actions ----------
  function onBodyClick(e) {
    var btn = e.target.closest ? e.target.closest(".bitvf-act") : null; if (!btn) return;
    var act = btn.getAttribute("data-act"), id = btn.getAttribute("data-id");
    var rec = findRecord(id); if (!rec) return;
    if (act === "watch") { S.setWatch(id, !S.isWatched(id)); render(); }
    else if (act === "cover") { X.downloadCover(rec, function (ok) { toast(ok ? "Cover downloaded ⬇" : "Couldn't download cover"); }); }
    else if (act === "repurpose") { repurpose(rec); }
    else if (act === "reposted") { S.markReposted(id); toast("Marked as reposted ✓"); render(); }
  }
  function findRecord(id) { var l = S.ownVideos(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function repurpose(r) {
    var tags = P.hashtagsOf(r.title);
    var clean = (r.title || "").replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim();
    var packText = clean + "\n\n" + tags.map(function (t) { return "#" + t; }).join(" ");
    try { navigator.clipboard.writeText(packText).then(function () { toast("Title + hashtags copied ↗ (ready for Reels/Shorts)"); }, function () { toast("Couldn't copy"); }); }
    catch (e) { toast("Couldn't copy"); }
  }

  // ---------- auto-scroll ----------
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function harvest(btn) {
    if (harvesting) { harvesting = false; return; }
    harvesting = true; btn.textContent = "⏹ Stop (fetching…)";
    var lastH = 0, stable = 0, i = 0, cap = 100;
    function step() {
      if (!harvesting || i >= cap || stable >= 4) { harvesting = false; btn.textContent = "⤓ Fetch entire profile"; window.scrollTo(0, 0); toast("Fetch done · " + S.ownCount() + " videos"); return; }
      window.scrollTo(0, document.body.scrollHeight); i++;
      wait(950).then(function () { var h = document.body.scrollHeight; if (h === lastH) stable++; else { stable = 0; lastH = h; } btn.textContent = "⏹ Stop · " + S.ownCount() + " (" + i + ")"; step(); });
    }
    step();
  }

  // ---------- export ----------
  function exportRows() { var l = (activeTab === "watch") ? buildList(false, false).filter(function (r) { return r.inWatch; }) : buildList(true, true); l.sort(sorter(currentSort)); return l; }
  function exportCsv() { X.downloadText(C.DOWNLOAD_PREFIX + "-" + X.stamp() + ".csv", X.buildCsv(exportRows(), videoUrl), "text/csv;charset=utf-8"); toast("CSV exported ⬇"); }
  function exportJson() { X.downloadText(C.DOWNLOAD_PREFIX + "-" + X.stamp() + ".json", X.buildJson(exportRows(), videoUrl), "application/json"); toast("JSON exported ⬇"); }

  // ---------- toast ----------
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "bitvf-toast"; document.documentElement.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("bitvf-toast-show");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("bitvf-toast-show"); }, 2600);
  }

  function init() { ensurePanel(); updateBadge(); }

  return { init: init, render: render, queueRender: queueRender, toggle: toggle, updateBadge: updateBadge };
});
