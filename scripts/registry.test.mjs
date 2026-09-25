import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  validateEntry,
  validateLocales,
  renderTable,
  renderDirectory,
  generate,
} from "./registry.mjs";
const schema = JSON.parse(
  await readFile(new URL("../registry/schema.json", import.meta.url), "utf8"),
);
const example = JSON.parse(
  await readFile(
    new URL("../registry/worlds/lantern-island.json", import.meta.url),
    "utf8",
  ),
);
const entry = {
  ...example,
  repository: "https://github.com/example/worlds",
  maintainer: "community",
  status: "pending",
  license: null,
  covelVersion: null,
};
const locales = JSON.parse(
  await readFile(new URL("../registry/locales.json", import.meta.url), "utf8"),
);
const english = locales.find((locale) => locale.locale === "en-US");
const chinese = locales.find((locale) => locale.locale === "zh-CN");

test("pending entries do not become recommended before licensing and compatibility are supplied", () => {
  validateEntry(schema, entry, "lantern-island.json");
  assert.throws(() =>
    validateEntry(
      schema,
      { ...entry, status: "active" },
      "lantern-island.json",
    ),
  );
  assert.throws(() =>
    validateEntry(
      schema,
      { ...entry, maintainer: "official" },
      "lantern-island.json",
    ),
  );
});
test("rejects unknown metadata and traversal refs", () => {
  assert.throws(() =>
    validateEntry(
      schema,
      { ...entry, trust: "builtin" },
      "lantern-island.json",
    ),
  );
  assert.throws(() =>
    validateEntry(schema, { ...entry, ref: "../main" }, "lantern-island.json"),
  );
});
test("untrusted base and translated labels cannot create HTML or extra table rows", () => {
  for (const locale of locales) {
    const label = "<img>|[link]\nextra";
    const table = renderTable(
      [{ ...entry, name: label, translations: { "zh-CN": { name: label } } }],
      locale,
    );
    assert.ok(!table.includes("<img>"));
    assert.equal(table.split("\n").length, 3);
    assert.ok(table.includes("&#124;"));
  }
});
test("renders official packages first and falls back per translated field", () => {
  const community = {
    ...entry,
    name: "Community name",
    description: "English description",
    translations: { "zh-CN": { name: "社区名称" } },
  };
  const official = {
    ...entry,
    id: "zz-official",
    name: "Official name",
    maintainer: "official",
    translations: {},
  };
  const en = renderDirectory([community, official], english);
  assert.ok(en.indexOf("Official name") < en.indexOf("Community name"));
  assert.ok(en.includes("### Community worlds"));
  assert.ok(!en.includes("社区名称"));
  const zh = renderDirectory([community, official], chinese);
  assert.ok(zh.includes("[社区名称]"));
  assert.ok(zh.includes("English description"));
  assert.ok(zh.includes("Official name"));
  assert.ok(renderDirectory([community], english).includes(english.empty));
});
test("validates translation fields and safe, unique README locale filenames", () => {
  for (const translations of [
    { "zh-cn": { name: "x" } },
    { "zh-CN": { repository: "x" } },
    { "en-US": { name: "x" } },
    { "zh-CN": { name: "" } },
  ]) {
    assert.throws(() =>
      validateEntry(schema, { ...entry, translations }, "lantern-island.json"),
    );
  }
  validateLocales(locales);
  assert.throws(() => validateLocales([...locales, chinese]));
  assert.throws(() => validateLocales([chinese, english]));
  assert.throws(() =>
    validateLocales([english, { ...chinese, readme: "../README.zh-CN.md" }]),
  );
});
test("generates and checks every locale, links added languages, and validates pages before writing", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "covel-registry-"));
  try {
    await mkdir(path.join(root, "registry/worlds"), { recursive: true });
    await writeFile(
      path.join(root, "registry/schema.json"),
      JSON.stringify(schema),
    );
    await writeFile(
      path.join(root, "registry/worlds/lantern-island.json"),
      JSON.stringify(entry),
    );
    const added = {
      ...english,
      locale: "ja",
      label: "日本語",
      readme: "README.ja.md",
    };
    const configured = [english, chinese, added];
    await writeFile(
      path.join(root, "registry/locales.json"),
      JSON.stringify(configured),
    );
    const template =
      "# Directory\n\n<!-- languages:start -->\n<!-- languages:end -->\n\n<!-- registry:start -->\n<!-- registry:end -->\n";
    for (const locale of configured)
      await writeFile(path.join(root, locale.readme), template);
    await generate(false, root);
    await generate(true, root);
    const en = await readFile(path.join(root, "README.md"), "utf8");
    assert.ok(en.includes("[日本語](README.ja.md)"));
    const ja = await readFile(path.join(root, added.readme), "utf8");
    assert.ok(ja.includes(entry.description));
    assert.ok(ja.includes("**日本語**"));
    await writeFile(path.join(root, "README.zh-CN.md"), template);
    await assert.rejects(generate(true, root), /README.zh-CN.md is stale/);
    await writeFile(path.join(root, added.readme), "Missing markers");
    await assert.rejects(
      generate(false, root),
      /expected exactly one languages section/,
    );
    assert.equal(
      await readFile(path.join(root, "README.zh-CN.md"), "utf8"),
      template,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
