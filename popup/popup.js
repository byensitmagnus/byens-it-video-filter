/* TikTok Creator Video Filter · popup.js */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  function withActiveTab(cb) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        void chrome.runtime.lastError;
        if (tabs && tabs[0]) cb(tabs[0]);
      });
    } catch (e) {}
  }

  // Indlæs gemt brugernavn + antal videoer
  try {
    chrome.storage.local.get(["bit_settings", "bit_videos"], function (res) {
      void chrome.runtime.lastError;
      if (res && res.bit_settings && res.bit_settings.username) $("user").value = res.bit_settings.username;
      var n = res && res.bit_videos ? Object.keys(res.bit_videos).length : 0;
      $("cnt").textContent = n ? (n + " videos collected") : "No data yet";
    });
  } catch (e) {}

  $("open").addEventListener("click", function () {
    try { chrome.tabs.create({ url: "https://www.tiktok.com/tiktokstudio/analytics" }); } catch (e) {}
  });

  $("toggle").addEventListener("click", function () {
    withActiveTab(function (t) {
      try {
        chrome.tabs.sendMessage(t.id, { type: "bit-toggle" }, function () {
          void chrome.runtime.lastError; // ignorér hvis siden ikke er en TikTok-fane
          window.close();
        });
      } catch (e) {}
    });
  });

  function saveUser() {
    var username = ($("user").value || "").trim().replace(/^@/, "");
    try {
      chrome.storage.local.get("bit_settings", function (res) {
        void chrome.runtime.lastError;
        var s = Object.assign({}, res && res.bit_settings, { username: username });
        chrome.storage.local.set({ bit_settings: s });
      });
    } catch (e) {}
    withActiveTab(function (t) {
      try { chrome.tabs.sendMessage(t.id, { type: "bit-set-username", username: username }, function () { void chrome.runtime.lastError; }); } catch (e) {}
    });
  }

  $("user").addEventListener("change", saveUser);
  $("user").addEventListener("blur", saveUser);

  // ---- optional Buffer auto-repost setup ----
  function bufStatus(msg, cls) { var el = $("bufstatus"); el.style.display = "block"; el.className = cls || ""; el.textContent = msg; }
  function bufStore(patch) {
    try { chrome.storage.local.get("bit_settings", function (res) { void chrome.runtime.lastError; var s = Object.assign({}, res && res.bit_settings, patch); chrome.storage.local.set({ bit_settings: s }); }); } catch (e) {}
  }
  function bufSend(request, cb) {
    try { chrome.runtime.sendMessage({ type: "bit-buffer", request: request }, function (resp) { void chrome.runtime.lastError; cb(resp || { ok: false, error: "no response" }); }); }
    catch (e) { cb({ ok: false, error: String(e) }); }
  }

  try {
    chrome.storage.local.get("bit_settings", function (res) {
      void chrome.runtime.lastError;
      var s = (res && res.bit_settings) || {};
      if (s.bufferKey) $("bufkey").value = s.bufferKey;
      if (s.bufferChannelName) bufStatus("Connected · posting to " + s.bufferChannelName, "ok");
    });
  } catch (e) {}

  if ($("bufconnect")) $("bufconnect").addEventListener("click", function () {
    var key = ($("bufkey").value || "").trim();
    if (!key) { bufStatus("Paste your Buffer API key first.", "err"); return; }
    if (!window.BITVF || !BITVF.buffer) { bufStatus("Internal error: Buffer module not loaded.", "err"); return; }
    bufStore({ bufferKey: key });
    bufStatus("Connecting to Buffer…");
    bufSend(BITVF.buffer.orgsRequest(key), function (resp) {
      if (!resp.ok) { bufStatus("Buffer rejected the key: " + (resp.error || resp.status || "error"), "err"); return; }
      var dd = resp.data && resp.data.data;
      var acct = dd && dd.account;
      var orgs = (acct && acct.organizations) || (dd && dd.organizations) || [];
      if (!orgs.length) { bufStatus("Connected, but no organizations were returned.", "err"); return; }
      var orgId = orgs[0].id;
      bufStore({ bufferOrgId: orgId });
      bufSend(BITVF.buffer.channelsRequest(key, orgId), function (r2) {
        if (!r2.ok) { bufStatus("Couldn't load channels: " + (r2.error || r2.status), "err"); return; }
        var channels = (r2.data && r2.data.data && r2.data.data.channels) || [];
        var tiktoks = channels.filter(function (c) { return String(c.service || "").toLowerCase().indexOf("tiktok") !== -1; });
        if (!tiktoks.length) { bufStatus("No TikTok channel found in Buffer — connect one in Buffer first.", "err"); return; }
        var sel = $("bufchan"); sel.innerHTML = "";
        tiktoks.forEach(function (c) { var o = document.createElement("option"); o.value = c.id; o.textContent = c.name || c.descriptor || c.id; sel.appendChild(o); });
        $("bufchanrow").style.display = "block";
        var first = tiktoks[0];
        bufStore({ bufferChannelId: first.id, bufferChannelName: first.name || first.descriptor || first.id });
        bufStatus("Connected · posting to " + (first.name || first.descriptor), "ok");
      });
    });
  });

  if ($("bufchan")) $("bufchan").addEventListener("change", function () {
    var sel = $("bufchan"), name = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value;
    bufStore({ bufferChannelId: sel.value, bufferChannelName: name });
    bufStatus("Posting to " + name, "ok");
  });
})();
