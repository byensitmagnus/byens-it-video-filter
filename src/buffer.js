/*
 * TikTok Creator Video Filter · buffer.js
 * OPT-IN Buffer-integration (auto-repost via Buffer → TikToks officielle API).
 *
 * Bygger RENE GraphQL-request-deskriptorer ({url, method, headers, body}) til
 * Buffers API (https://api.buffer.com). Selve fetch'et udføres af service
 * workeren (krydsoprindelse), så dette modul er DOM/chrome-frit og unit-testbart.
 *
 * VIGTIGT: dette er den ENESTE del af udvidelsen der kan kontakte en ekstern
 * server, og kun hvis brugeren selv har indsat sin personlige Buffer-API-nøgle.
 * Nøglen gemmes lokalt (chrome.storage.local) og sendes kun til Buffer.
 * UMD: self.BITVF.buffer / module.exports.
 */
;(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof self !== "undefined") { self.BITVF = self.BITVF || {}; self.BITVF.buffer = api; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ENDPOINT = "https://api.buffer.com";

  function gql(query, variables, key) {
    return {
      url: ENDPOINT,
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (key || "") },
      body: JSON.stringify({ query: query, variables: variables || {} })
    };
  }

  // Hent organisationer (for at få organizationId til channels-queryet).
  function orgsRequest(key) {
    return gql("query { account { id organizations { id name } } }", {}, key);
  }

  // Hent kanaler i en organisation — bruges til at finde TikTok-kanalens id.
  function channelsRequest(key, orgId) {
    var query = "query Channels($input: ChannelsInput!) { channels(input: $input) { id name service descriptor } }";
    return gql(query, { input: { organizationId: orgId } }, key);
  }

  // Opret/queue et opslag på en kanal. assets-format pr. Buffers maj-2026-migration:
  // en ordnet liste af typede items, video = { video: { url } }.
  function createPostRequest(key, opts) {
    opts = opts || {};
    var input = {
      channelId: opts.channelId,
      text: opts.text || "",
      assets: opts.videoUrl ? [{ video: { url: opts.videoUrl } }] : [],
      schedulingType: "automatic",
      mode: "addToQueue"
    };
    if (opts.dueAt) input.dueAt = opts.dueAt; // ISO-dato → planlæg i stedet for kø
    var query = "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { __typename ... on PostActionSuccess { post { id } } } }";
    return gql(query, { input: input }, key);
  }

  // Find den (første) TikTok-kanal i et channels-svar.
  function pickTikTok(channels) {
    if (!Array.isArray(channels)) return null;
    for (var i = 0; i < channels.length; i++) {
      var s = String(channels[i].service || "").toLowerCase();
      if (s.indexOf("tiktok") !== -1) return channels[i];
    }
    return null;
  }

  return {
    ENDPOINT: ENDPOINT,
    orgsRequest: orgsRequest,
    channelsRequest: channelsRequest,
    createPostRequest: createPostRequest,
    pickTikTok: pickTikTok
  };
});
