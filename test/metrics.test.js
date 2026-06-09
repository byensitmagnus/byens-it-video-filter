"use strict";
const test = require("node:test");
const assert = require("node:assert");
const metrics = require("../src/metrics.js");

const DAY = 86400000;
const NOW = Date.UTC(2026, 5, 9); // 2026-06-09

function rec(o) {
  return Object.assign({ id: "x", views: 0, likes: 0, comments: 0, shares: 0, saves: 0, created: 0, hasViews: true, hasSaves: true }, o);
}

function prep(records) {
  const list = records.map((r) => metrics.deriveOne(r, null, NOW));
  return metrics.decorate(list);
}

test("deriveOne computes save-rate, engagement and age", () => {
  const d = metrics.deriveOne(rec({ views: 1000, saves: 50, likes: 100, comments: 10, shares: 5, created: NOW - 10 * DAY }), null, NOW);
  assert.strictEqual(d.saveRate, 0.05);
  assert.ok(Math.abs(d.ageDays - 10) < 0.001);
  assert.ok(d.engagement > 0);
});

test("badges: viral, repost, too-early are assigned as expected", () => {
  const list = prep([
    rec({ id: "viral", views: 1000000, saves: 50000, likes: 80000, created: NOW - 30 * DAY }),
    rec({ id: "early", views: 100, saves: 1, likes: 5, created: NOW - 2 * DAY }),
    rec({ id: "evergreen", views: 5000, saves: 500, likes: 300, created: NOW - 60 * DAY })
  ]);
  const byId = {};
  list.forEach((r) => (byId[r.id] = r.badges.map((b) => b.c)));
  assert.ok(byId["viral"].includes("viral"), "top-views video should be Viral Reach");
  assert.ok(byId["early"].includes("new"), "2-day-old video should be Too Early");
  assert.ok(byId["evergreen"].includes("repost"), "old high-save-rate video should be a Repost Candidate");
});

test("badges: Missing Fresh Data when hasViews is false", () => {
  const list = prep([rec({ id: "a", views: 0, hasViews: false, created: NOW - 30 * DAY })]);
  assert.ok(list[0].badges.some((b) => b.c === "stale"));
});

test("getRange returns full range for 'all' and a bounded range for '28'", () => {
  const all = metrics.getRange("all", "", "", NOW);
  assert.strictEqual(all[0], 0);
  assert.strictEqual(all[1], Infinity);
  const r28 = metrics.getRange("28", "", "", NOW);
  assert.strictEqual(r28[0], NOW - 28 * DAY);
  assert.ok(metrics.inPeriod(rec({ created: NOW - 5 * DAY }), r28));
  assert.ok(!metrics.inPeriod(rec({ created: NOW - 40 * DAY }), r28));
});
