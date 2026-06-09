"use strict";
/*
 * Builds a Chrome Web Store-ready ZIP into /dist with manifest.json at the ROOT.
 * Cross-platform (Node + archiver). Run: npm run build:zip
 */
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const version = manifest.version;

const distDir = path.join(root, "dist");
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
const outPath = path.join(distDir, `tiktok-creator-video-filter-v${version}.zip`);
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

const output = fs.createWriteStream(outPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Built ${path.relative(root, outPath)} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
  console.log("manifest.json is at the ZIP root — ready for Chrome Web Store upload.");
});
archive.on("warning", (err) => { if (err.code !== "ENOENT") throw err; });
archive.on("error", (err) => { throw err; });
archive.pipe(output);

// Runtime files only (manifest at root). Everything else (tests, docs, store,
// tools, package files, .git) is intentionally excluded.
archive.file(path.join(root, "manifest.json"), { name: "manifest.json" });
["icons", "popup", "src"].forEach((dir) => archive.directory(path.join(root, dir), dir));

archive.finalize();
