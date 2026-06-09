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

test("badges: viral, repost, too-early are assigned as expected (sample >= minSampleSize)", () => {
  // Percentile-based badges only activate once the dataset is large enough, so
  // pad with low-performing filler videos to reach the minimum sample size.
  const filler = [200, 300, 400, 600, 800].map((v, i) =>
    rec({ id: "f" + i, views: v, saves: Math.round(v * 0.01), likes: Math.round(v * 0.05), created: NOW - 25 * DAY }));
  const list = prep([
    rec({ id: "viral", views: 1000000, saves: 50000, likes: 80000, created: NOW - 30 * DAY }),
    rec({ id: "early", views: 100, saves: 1, likes: 5, created: NOW - 2 * DAY }),
    rec({ id: "evergreen", views: 5000, saves: 500, likes: 300, created: NOW - 60 * DAY })
  ].concat(filler));
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

test("small datasets suppress percentile badges and flag low sample", () => {
  const list = prep([
    rec({ id: "a", views: 1000000, saves: 50000, likes: 80000, created: NOW - 30 * DAY }),
    rec({ id: "b", views: 5000, saves: 500, likes: 300, created: NOW - 60 * DAY })
  ]);
  list.forEach((r) => {
    assert.strictEqual(r.lowSample, true, "tiny dataset should be flagged lowSample");
    const cs = r.badges.map((b) => b.c);
    assert.ok(
      !cs.includes("viral") && !cs.includes("repost") && !cs.includes("more") && !cs.includes("utility"),
      "percentile-based badges must be suppressed on a tiny dataset"
    );
  });
});

test("non-percentile badges (Too Early / Missing Fresh Data) still show on tiny datasets", () => {
  const list = prep([rec({ id: "x", views: 0, hasViews: false, created: NOW - 1 * DAY })]);
  const cs = list[0].badges.map((b) => b.c);
  assert.ok(cs.includes("new"), "1-day-old video should still be Too Early");
  assert.ok(cs.includes("stale"), "missing view data should still flag Missing Fresh Data");
});

test("undated videos are excluded from bounded periods but kept in 'all'", () => {
  const r28 = metrics.getRange("28", "", "", NOW);
  assert.ok(!metrics.inPeriod(rec({ created: 0 }), r28), "undated excluded from a 28-day window");
  const all = metrics.getRange("all", "", "", NOW);
  assert.ok(metrics.inPeriod(rec({ created: 0 }), all), "undated kept under 'all'");
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
