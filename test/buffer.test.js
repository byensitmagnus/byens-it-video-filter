"use strict";
const test = require("node:test");
const assert = require("node:assert");
const B = require("../src/buffer.js");

test("orgsRequest builds a bearer-authed POST to api.buffer.com", () => {
  const r = B.orgsRequest("KEY123");
  assert.strictEqual(r.url, "https://api.buffer.com");
  assert.strictEqual(r.method, "POST");
  assert.strictEqual(r.headers.Authorization, "Bearer KEY123");
  assert.strictEqual(r.headers["Content-Type"], "application/json");
  assert.ok(JSON.parse(r.body).query.includes("organizations"));
});

test("channelsRequest passes organizationId as a GraphQL variable", () => {
  const r = B.channelsRequest("K", "org_9");
  const body = JSON.parse(r.body);
  assert.deepStrictEqual(body.variables, { input: { organizationId: "org_9" } });
  assert.ok(body.query.includes("channels"));
});

test("createPostRequest builds the post mutation with the May-2026 video asset format", () => {
  const r = B.createPostRequest("K", { channelId: "ch_1", text: "hi #fps", videoUrl: "https://v/x.mp4" });
  const body = JSON.parse(r.body);
  const input = body.variables.input;
  assert.strictEqual(input.channelId, "ch_1");
  assert.strictEqual(input.text, "hi #fps");
  assert.deepStrictEqual(input.assets, [{ video: { url: "https://v/x.mp4" } }]);
  assert.ok(body.query.includes("createPost"));
});

test("createPostRequest with no videoUrl yields empty assets and supports a schedule", () => {
  const r = B.createPostRequest("K", { channelId: "c", text: "t", dueAt: "2026-06-10T10:00:00Z" });
  const input = JSON.parse(r.body).variables.input;
  assert.deepStrictEqual(input.assets, []);
  assert.strictEqual(input.dueAt, "2026-06-10T10:00:00Z");
});

test("every request targets only api.buffer.com (no other host can be reached)", () => {
  ["orgsRequest", "channelsRequest", "createPostRequest"].forEach((fn) => {
    const r = fn === "orgsRequest" ? B.orgsRequest("k") : fn === "channelsRequest" ? B.channelsRequest("k", "o") : B.createPostRequest("k", { channelId: "c" });
    assert.ok(r.url.startsWith("https://api.buffer.com"), fn + " must target api.buffer.com");
  });
});

test("pickTikTok finds the TikTok channel by service", () => {
  const ch = B.pickTikTok([{ id: "1", service: "Instagram" }, { id: "2", service: "TikTok" }]);
  assert.strictEqual(ch.id, "2");
  assert.strictEqual(B.pickTikTok([]), null);
});
