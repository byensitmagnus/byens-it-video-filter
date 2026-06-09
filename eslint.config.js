"use strict";
// ESLint 9 flat config (CommonJS). Lints the extension modules (browser + Node UMD)
// and the test/build scripts. Pragmatic ruleset: catches real mistakes without
// fighting the existing ES5-style, dependency-free codebase.
const js = require("@eslint/js");

module.exports = [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        // Browser / extension content-script globals
        window: "readonly", document: "readonly", self: "readonly", navigator: "readonly",
        location: "readonly", URL: "readonly", Blob: "readonly", console: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", chrome: "readonly", fetch: "readonly", BITVF: "readonly",
        // Node (UMD wrapper, tests, build script)
        module: "writable", require: "readonly", process: "readonly", __dirname: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-empty": "off",
      "no-cond-assign": "off",
      "no-prototype-builtins": "off",
      "no-control-regex": "off"
    }
  }
];
