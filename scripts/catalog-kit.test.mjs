import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkKit, syncKit } from "./catalog-kit.mjs";
import { themeBootstrap } from "@covel/catalog-kit/tools/theme-bootstrap";

test("site head uses the pinned shared theme bootstrap before external assets", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  const blocks = [...html.matchAll(/<!-- covel-theme:start -->[\s\S]*?<!-- covel-theme:end -->/g)];
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0][0], themeBootstrap());
  assert.match(html, /<html[^>]*class="dark"/);
  assert.ok(html.indexOf('name="viewport"') < blocks[0].index);
  assert.ok(blocks[0].index < html.indexOf('<link'));
  assert.ok(blocks[0].index < html.indexOf('type="module"'));
});

test("vendor lock rejects changed, missing, extra and linked files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "covel-vendor-"));
  try {
    await cp(new URL("../vendor", import.meta.url), path.join(directory, "vendor"), { recursive: true });
    await cp(new URL("../catalog-kit.lock.json", import.meta.url), path.join(directory, "catalog-kit.lock.json"));
    const lock = await checkKit(directory);
    const filename = path.join(directory, "vendor/catalog-kit", Object.keys(lock.files)[0]);
    const original = await readFile(filename);
    await writeFile(filename, "modified"); await assert.rejects(checkKit(directory), /modified/);
    await rm(filename); await assert.rejects(checkKit(directory), /missing or extra/);
    await writeFile(filename, original);
    const extra = path.join(directory, "vendor/catalog-kit/unexpected.txt");
    await writeFile(extra, "unexpected"); await assert.rejects(checkKit(directory), /missing or extra/);
    await rm(extra); await symlink(filename, extra); await assert.rejects(checkKit(directory), /Linked file/);
    await rm(extra); await checkKit(directory);
    await assert.rejects(syncKit({ commit: "main", directory }), /full fixed commit/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
