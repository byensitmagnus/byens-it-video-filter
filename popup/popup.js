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
})();
