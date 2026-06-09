"use strict";
const test = require("node:test");
const assert = require("node:assert");
const X = require("../src/export.js");

function row(o) {
  return Object.assign(
    { id: "1", title: "", created: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, saveRate: 0, engagement: 0, velocity: null, score: 0, musicTitle: "" },
    o
  );
}
const urlFor = (r) => "https://www.tiktok.com/@x/video/" + r.id;

test("buildCsv neutralizes formula-injection in title and sound cells", () => {
  const csv = X.buildCsv([row({ id: "100", title: "=HYPERLINK(\"http://evil\")", musicTitle: "@cmd" })], urlFor);
  const lines = csv.split("\r\n");
  assert.strictEqual(lines.length, 2, "header + 1 data row");
  const dataRow = lines[1];
  assert.ok(dataRow.includes("'=HYPERLINK"), "a cell starting with = must be prefixed with a single quote");
  assert.ok(dataRow.includes("'@cmd"), "a cell starting with @ must be prefixed with a single quote");
});

test("buildCsv escapes leading +, - too", () => {
  const csv = X.buildCsv([row({ id: "1", title: "+1", musicTitle: "-2" })], urlFor);
  const dataRow = csv.split("\r\n")[1];
  assert.ok(dataRow.includes("'+1"), "leading + escaped");
  assert.ok(dataRow.includes("'-2"), "leading - escaped");
});

test("buildCsv leaves normal titles untouched, uses ; separator and a BOM", () => {
  const csv = X.buildCsv([row({ id: "101", title: "Normal title" })], urlFor);
  assert.strictEqual(csv.charCodeAt(0), 0xfeff, "starts with a UTF-8 BOM");
  assert.ok(csv.split("\r\n")[0].indexOf(";") !== -1, "semicolon separated");
  assert.ok(csv.indexOf("Normal title") !== -1, "title present");
  assert.ok(csv.indexOf("'Normal title") === -1, "normal title is not prefixed");
});

test("buildCsv guards missing saveRate/engagement (no NaN in output)", () => {
  const csv = X.buildCsv([row({ id: "102", title: "x", saveRate: undefined, engagement: undefined })], urlFor);
  assert.strictEqual(csv.indexOf("NaN"), -1, "no NaN should leak into the CSV");
});

test("buildJson produces valid, round-tripping JSON", () => {
  const json = X.buildJson([row({ id: "103", title: "t", views: 10, saves: 2 })], urlFor);
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].id, "103");
  assert.strictEqual(parsed[0].views, 10);
  assert.strictEqual(parsed[0].url, "https://www.tiktok.com/@x/video/103");
});
