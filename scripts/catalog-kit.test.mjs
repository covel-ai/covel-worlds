import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkKit, syncKit } from "./catalog-kit.mjs";

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
