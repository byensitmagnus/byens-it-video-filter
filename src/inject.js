/*
 * TikTok Creator Video Filter
 * inject.js  (kører i MAIN world / sidens egen kontekst)
 *
 * Hooker fetch() og XMLHttpRequest så vi kan opfange de JSON-svar TikTok
 * Studio bruger til at vise analytics. Rå-svaret sendes videre til content.js
 * (ISOLATED world) via window.postMessage. Vi gemmer eller ændrer INTET her –
 * kun læser de svar siden alligevel henter.
 */
(function () {
  "use strict";
  if (window.__bitVFInjected) return;
  window.__bitVFInjected = true;

  var MAX_BYTES = 4000000; // spring meget store svar over (ydelse)
  // Hurtigt pre-filter: rør kun ved svar der overhovedet ligner videostatistik
  var HINT = /count|views?|like|collect|favou?rite|play|aweme|item_?id|video/i;

  function emit(url, text) {
    if (!text || text.length < 2 || text.length > MAX_BYTES) return;
    if (!HINT.test(text)) return;
    var json;
    try { json = JSON.parse(text); } catch (e) { return; }
    try {
      window.postMessage(
        { source: "bit-vf", kind: "capture", payload: { url: String(url || ""), json: json } },
        window.location.origin
      );
    } catch (e) { /* ignoreres */ }
  }

  // ---- fetch ----
  try {
    var origFetch = window.fetch;
    if (typeof origFetch === "function" && !origFetch.__bitPatched) {
      var patchedFetch = function () {
        var args = arguments;
        return origFetch.apply(this, args).then(function (res) {
          try {
            var first = args[0];
            var url = (first && first.url) || String(first || "");
            var ct = "";
            try { ct = res.headers.get("content-type") || ""; } catch (e) {}
            if (ct.indexOf("json") !== -1 || ct.indexOf("text") !== -1 || ct === "") {
              res.clone().text().then(function (t) { emit(url, t); }).catch(function () {});
            }
          } catch (e) {}
          return res;
        });
      };
      patchedFetch.__bitPatched = true;
      window.fetch = patchedFetch;
    }
  } catch (e) {}

  // ---- XMLHttpRequest ----
  try {
    var X = window.XMLHttpRequest;
    if (X && X.prototype && !X.prototype.__bitPatched) {
      var open = X.prototype.open;
      var send = X.prototype.send;
      X.prototype.open = function (method, url) {
        try { this.__bitUrl = url; } catch (e) {}
        return open.apply(this, arguments);
      };
      X.prototype.send = function () {
        try {
          var self = this;
          this.addEventListener("load", function () {
            try {
              var ct = "";
              try { ct = self.getResponseHeader("content-type") || ""; } catch (e) {}
              var rt = (self.responseType === "" || self.responseType === "text");
              if (rt && (ct.indexOf("json") !== -1 || ct.indexOf("text") !== -1 || ct === "")) {
                if (typeof self.responseText === "string") emit(self.__bitUrl, self.responseText);
              }
            } catch (e) {}
          });
        } catch (e) {}
        return send.apply(this, arguments);
      };
      X.prototype.__bitPatched = true;
    }
  } catch (e) {}
})();
