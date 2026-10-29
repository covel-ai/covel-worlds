import { readFile } from "node:fs/promises";

const template = await readFile(new URL("../vendor/catalog-kit/templates/pages.yml", import.meta.url), "utf8");
const replacements = {
  __KIND__: "worlds",
  __PACKAGE_MANAGER__: "npm",
  __INSTALL_COMMAND__: "npm ci --ignore-scripts",
  __TEST_COMMAND__: "npm test",
  __COLLECT_COMMAND__: "npm run collect",
  __GENERATE_COMMAND__: "npm run generate",
  __BUILD_COMMAND__: "npm run build:pages",
  __PUBLISH_COMMAND__: "node vendor/catalog-kit/src/publish.mjs --catalog site/public/catalog.json --releases artifacts/releases.json --receipt artifacts/publish-receipt.json",
  __CONFIG_HASH_EXPRESSION__: "hashFiles('catalog-kit.lock.json', 'catalog/config.json', 'scripts/world-adapter.mjs')",
};
let expected = template.replace(/^# Instantiate[^\n]*\n/, "");
for (const [placeholder, value] of Object.entries(replacements)) expected = expected.replaceAll(placeholder, value);
if (/__[A-Z_]+__/.test(expected)) throw new Error("Unresolved shared workflow placeholder");
const actual = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
if (actual !== expected) throw new Error("Pages workflow differs from the pinned shared template; update both consumers together");
console.log("Pages workflow matches the pinned shared template");
