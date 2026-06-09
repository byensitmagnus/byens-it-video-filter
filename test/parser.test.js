"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const parser = require("../src/parser.js");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8"));
}

test("extracts all videos from a profile response (ignores music/author/video sub-objects)", () => {
  const vids = parser.extractVideos(load("tiktok-profile-response.json"));
  assert.strictEqual(vids.length, 3);
});

test("parses metrics correctly from a profile response", () => {
  const vids = parser.extractVideos(load("tiktok-profile-response.json"));
  const v = vids.find((x) => x.id === "7300000000000000001");
  assert.ok(v, "video should be found");
  assert.strictEqual(v.views, 1250000);
  assert.strictEqual(v.likes, 84000);
  assert.strictEqual(v.comments, 1200);
  assert.strictEqual(v.shares, 5400);
  assert.strictEqual(v.saves, 39000);
  assert.strictEqual(v.author, "creator_demo");
  assert.strictEqual(v.hasViews, true);
  assert.strictEqual(v.hasSaves, true);
});

test("converts createTime (unix seconds) to milliseconds", () => {
  const vids = parser.extractVideos(load("tiktok-profile-response.json"));
  const v = vids.find((x) => x.id === "7300000000000000001");
  assert.strictEqual(v.created, 1709251200 * 1000);
});

test("captures music title and original flag", () => {
  const vids = parser.extractVideos(load("tiktok-profile-response.json"));
  const v = vids.find((x) => x.id === "7300000000000000001");
  assert.strictEqual(v.musicOriginal, true);
  assert.ok(v.musicTitle.length > 0);
});

test("extracts TikTok Studio analytics videos incl. saves, with no author", () => {
  const vids = parser.extractVideos(load("tiktok-studio-analytics-response.json"));
  assert.strictEqual(vids.length, 2);
  const v = vids.find((x) => x.id === "7300000000000000010");
  assert.ok(v);
  assert.strictEqual(v.views, 90000);
  assert.strictEqual(v.saves, 5100);
  assert.strictEqual(v.author, "");
  assert.strictEqual(v.hasSaves, true);
});

test("hashtagsOf parses hashtags, lowercased, without the #", () => {
  assert.deepStrictEqual(parser.hashtagsOf("Hello #Gaming #FPS world #pcTips"), ["gaming", "fps", "pctips"]);
  assert.deepStrictEqual(parser.hashtagsOf("no tags here"), []);
});

test("repurposeText builds a clean caption + hashtags pack", () => {
  assert.strictEqual(parser.repurposeText("Boost FPS now #fps #Gaming"), "Boost FPS now\n\n#fps #gaming");
  assert.strictEqual(parser.repurposeText("plain title, no tags"), "plain title, no tags");
  assert.strictEqual(parser.repurposeText(""), "");
  assert.strictEqual(parser.repurposeText("#only #tags"), "\n\n#only #tags");
});

test("parses shorthand numbers like 1.2K / 3M", () => {
  assert.strictEqual(parser.num("1.2K"), 1200);
  assert.strictEqual(parser.num("3M"), 3000000);
  assert.strictEqual(parser.num("12,345"), 12345);
});

test("ignores objects that are not videos", () => {
  assert.strictEqual(parser.extractVideos({ foo: "bar", count: 5 }).length, 0);
  assert.strictEqual(parser.extractVideos(null).length, 0);
});

test("dedupes by id keeping the highest metric values", () => {
  const json = { itemList: [
    { id: "7300000000000000050", desc: "x", stats: { playCount: 100, collectCount: 5 } },
    { id: "7300000000000000050", desc: "x", stats: { playCount: 400, collectCount: 2 } }
  ] };
  const vids = parser.extractVideos(json);
  assert.strictEqual(vids.length, 1);
  assert.strictEqual(vids[0].views, 400);
  assert.strictEqual(vids[0].saves, 5);
});

test("getStats resets per extractVideos call and reports parsed count", () => {
  parser.extractVideos({ itemList: [{ id: "7300000000000000051", desc: "y", stats: { playCount: 10, collectCount: 1 } }] });
  assert.strictEqual(parser.getStats().parsed, 1);
  // A subsequent call with no videos must reset the counters, not accumulate.
  parser.extractVideos({ foo: "bar" });
  const st = parser.getStats();
  assert.strictEqual(st.parsed, 0);
  assert.strictEqual(st.looked, 0);
  assert.strictEqual(st.unreadable, 0);
});

test("breakage detection: stat-container objects with unreadable ids are flagged", () => {
  // Objects that look like videos (have a stat container) but whose id is not a
  // 6+ digit number -> 0 parsed, flagged as unreadable (likely TikTok format change).
  const json = { itemList: [
    { id: "abc", stats: { foo: 1 } },
    { id: "xyz", statistics: { bar: 2 } },
    { id: "qwe", stats: { baz: 3 } }
  ] };
  const vids = parser.extractVideos(json);
  assert.strictEqual(vids.length, 0);
  const st = parser.getStats();
  assert.strictEqual(st.parsed, 0);
  assert.ok(st.unreadable >= 3, "look-alike videos with bad ids should be flagged unreadable");
});
