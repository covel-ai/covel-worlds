import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { collectLocal, collectRemote, writeCatalog, validateConfig } from "./collect.mjs";
import { extractWorlds, parseYaml, findWorlds } from "./world-adapter.mjs";
import { github, schema, kitModule } from "./kit.mjs";

const config = JSON.parse(await readFile(new URL("../catalog/config.json", import.meta.url), "utf8"));
const manifest = await readFile(new URL("../worlds/lantern-island/world.yaml", import.meta.url), "utf8");
const metadata = (id = 1, name = `creator/worlds-${id}`) => ({
  id, name: name.split("/")[1], full_name: name, private: false, default_branch: "main", topics: ["covel-world"],
  owner: { id: 12, login: name.split("/")[0] }, stargazers_count: 3, license: { spdx_id: "MIT" },
});
function source(files) {
  const blobs = new Map();
  const tree = Object.entries(files).map(([filename, content]) => {
    const sha = createHash("sha1").update(content).digest("hex");
    blobs.set(sha, content);
    return { path: filename, sha, type: "blob", mode: "100644", size: Buffer.byteLength(content) };
  });
  return { tree, blobs, read: async (file) => blobs.get(file.sha) };
}
const worldSource = () => source({ "world.yaml": manifest, "WORLD.md": "# Lore", "README.md": "# Read me", "world.zh-CN.yaml": "name: 灯塔岛\nsummary: 海岛谜案" });
const now = new Date("2026-10-29T00:00:00Z");

test("official local worlds come from manifests with honest unknown metrics and compatibility", async () => {
  const catalog = await collectLocal(config);
  assert.equal(catalog.mode, "local");
  assert.equal(catalog.generatedAt, null);
  assert.equal(catalog.stats.packages, 2);
  assert.equal(catalog.stats.repositories, 1);
  for (const entry of catalog.entries) {
    assert.equal(entry.status, "indexed");
    assert.equal(entry.official, true);
    assert.equal(entry.covelVersion, null);
    assert.equal(entry.stars, null);
    assert.equal(entry.downloadRequests, null);
    assert.equal(entry.contentHash, null);
    assert.ok(entry.translations["zh-CN"].name);
  }
  schema.parseCatalog(catalog);
});

test("one malformed sibling remains a pending package without dropping a valid world", async () => {
  const files = source({ "worlds/good/world.yaml": manifest, "worlds/good/WORLD.md": "Lore", "worlds/bad/world.yaml": "name: [" });
  const result = await extractWorlds({ repo: metadata(), ...files, config, discovery: "topic", commitSha: "a".repeat(40) });
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries.find((entry) => entry.path === "worlds/good").status, "indexed");
  const pending = result.entries.find((entry) => entry.path === "worlds/bad");
  assert.equal(pending.status, "pending");
  assert.equal(pending.installUrl, null);
  assert.equal(result.issues.length, 1);
});

test("indexed metadata does not grant official status; links and translations stay on the collected SHA", async () => {
  const files = worldSource();
  const result = await extractWorlds({ repo: metadata(), ...files, config, discovery: "topic", commitSha: "a".repeat(40) });
  const entry = result.entries[0];
  assert.equal(entry.official, false);
  assert.match(entry.readmeUrl, new RegExp(`/blob/${"a".repeat(40)}/README.md$`));
  assert.match(entry.pinnedUrl, new RegExp(`/tree/${"a".repeat(40)}$`));
  assert.equal(entry.translations["zh-CN"].name, "灯塔岛");
  assert.match(entry.sourceTreeHash, /^[a-f0-9]{64}$/);
  assert.equal(entry.contentHash, null);
  assert.equal(entry.hashScheme, null);
});

test("missing manifest uses a repository candidate; archived packages have no install action", async () => {
  const empty = await extractWorlds({ repo: metadata(), ...source({ "README.md": "coming soon" }), config, discovery: "topic" });
  assert.equal(empty.entries[0].path, null);
  assert.equal(empty.entries[0].status, "pending");
  const archived = await extractWorlds({ repo: { ...metadata(), archived: true }, ...worldSource(), config, discovery: "topic", commitSha: "a".repeat(40) });
  assert.equal(archived.entries[0].status, "archived");
  assert.equal(archived.entries[0].installUrl, null);
});

test("invalid YAML/aliases/inline locales cannot become display metadata", () => {
  for (const value of ["[1, 2]", "a: 1\na: 2", "a: !execute x", "a: &a [*a]"]) assert.throws(() => parseYaml(value), github.MetadataError);
  assert.throws(() => parseYaml("x".repeat(github.MAX_FILE_BYTES + 1)), /256 KiB/);
});

test("invalid translation degrades that locale, while an API error aborts publication", async () => {
  const files = source({ "world.yaml": manifest, "WORLD.md": "Lore", "world.zh-CN.yaml": "name: [" });
  const result = await extractWorlds({ repo: metadata(), ...files, config, discovery: "topic" });
  assert.equal(result.entries[0].status, "indexed");
  assert.deepEqual(result.entries[0].translations, {});
  assert.equal(result.issues.length, 1);
  await assert.rejects(extractWorlds({ repo: metadata(), tree: files.tree, read: async () => { throw new github.GitHubError("rate limit", 429); }, config, discovery: "topic" }), (error) => error.status === 429);
});

test("package tree fingerprint ignores changes to a monorepo sibling", async () => {
  const first = source({ "worlds/a/world.yaml": manifest, "worlds/a/WORLD.md": "Lore", "worlds/b/world.yaml": manifest, "worlds/b/WORLD.md": "Old" });
  const next = source({ "worlds/a/world.yaml": manifest, "worlds/a/WORLD.md": "Lore", "worlds/b/world.yaml": manifest, "worlds/b/WORLD.md": "New" });
  const a = await extractWorlds({ repo: metadata(), ...first, config, discovery: "topic" });
  const b = await extractWorlds({ repo: metadata(), ...next, config, discovery: "topic" });
  assert.equal(a.entries[0].sourceTreeHash, b.entries[0].sourceTreeHash);
  assert.notEqual(a.entries[1].sourceTreeHash, b.entries[1].sourceTreeHash);
});

test("unsafe and linked manifest paths are excluded from discovery", () => {
  const file = { type: "blob", mode: "100644", sha: "a".repeat(40) };
  assert.deepEqual(findWorlds([
    { ...file, path: "../world.yaml" }, { ...file, path: "node_modules/a/world.yaml" },
    { ...file, path: "world.yaml", mode: "120000" },
  ]), []);
});

function fixtureGet(repos, getOverride) {
  const files = worldSource();
  return async (endpoint, options) => {
    if (getOverride) {
      const response = await getOverride(endpoint, options);
      if (response !== undefined) return response;
    }
    if (endpoint.startsWith("/search/")) return { total_count: repos.length, incomplete_results: false, items: repos.map(({ id, full_name }) => ({ id, full_name })) };
    if (endpoint.startsWith("/repositories/")) return repos.find((repo) => repo.id === Number(endpoint.split("/").at(-1))) ?? null;
    if (endpoint.includes("/tags?")) return [];
    if (endpoint.includes("/commits/")) return { sha: "a".repeat(40), commit: { tree: { sha: "b".repeat(40) } } };
    if (endpoint.includes("/git/trees/")) return { truncated: false, tree: files.tree };
    if (endpoint.includes("/git/blobs/")) return { encoding: "base64", content: Buffer.from(files.blobs.get(endpoint.split("/").at(-1))).toString("base64") };
    const name = endpoint.slice("/repos/".length);
    return repos.find((repo) => repo.full_name.toLowerCase() === name) ?? null;
  };
}

test("remote topic OR discovery deduplicates and rechecks live removals, private repos and seeds", async () => {
  const repos = [metadata(1), { ...metadata(2), topics: [] }, { ...metadata(3), private: true }, metadata(4, "covel-ai/covel-worlds")];
  const catalog = await collectRemote(config, { get: fixtureGet(repos), now });
  assert.equal(catalog.stats.repositories, 2);
  assert.equal(catalog.stats.entries, 2);
  assert.equal(catalog.entries.filter((entry) => entry.official).length, 1);
  assert.ok(catalog.entries.every((entry) => entry.commitSha === "a".repeat(40)));
});

test("repository rename retains stable identity without inheriting official status", async () => {
  const moved = metadata(44, "new-owner/worlds");
  const catalog = await collectRemote(config, { now, get: fixtureGet([], async (endpoint) => ["/repos/covel-ai/covel-worlds", "/repositories/44"].includes(endpoint) ? moved : undefined) });
  assert.equal(catalog.entries[0].repositoryId, 44);
  assert.equal(catalog.entries[0].official, false);
  assert.equal(catalog.entries[0].discovery, "topic");
});

test("rate-limited collection never overwrites the last valid catalog and resumes its round", async () => {
  const { memoryCheckpoint } = await kitModule("round");
  const checkpoint = memoryCheckpoint();
  const dir = await mkdtemp(path.join(tmpdir(), "covel-world-catalog-"));
  try {
    const filename = path.join(dir, "catalog.json");
    await writeFile(filename, "last successful publication");
    const repos = [metadata(1), metadata(2)];
    const scoped = { ...config, seedRepositories: [] };
    const onComplete = (catalog) => writeCatalog(catalog, filename);
    await assert.rejects(collectRemote(scoped, { now, checkpoint, onComplete, get: fixtureGet(repos, async (endpoint) => {
      if (endpoint === "/repos/creator/worlds-2") throw new github.GitHubError("budget exhausted", 429);
    }) }), /budget exhausted/);
    assert.equal(await readFile(filename, "utf8"), "last successful publication");
    const result = await collectRemote(scoped, { now, checkpoint, onComplete, get: fixtureGet(repos, async (endpoint) => {
      if (endpoint === "/repos/creator/worlds-1") throw new Error("completed repository must not refetch");
    }) });
    assert.equal(result.stats.repositories, 2);
    schema.parseCatalog(JSON.parse(await readFile(filename, "utf8")));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("config rejects malformed topics, identity lists and unexplained exclusions", () => {
  validateConfig(config);
  assert.throws(() => validateConfig({ ...config, topics: ["covel-world", "covel-world"] }));
  assert.throws(() => validateConfig({ ...config, seedRepositories: ["../../private"] }));
  assert.throws(() => validateConfig({ ...config, excludeRepositories: { "a/b": "" } }));
});

test("world release sidecar binds manifest version and keeps the parsed commit", async () => {
  const repos = [metadata(1)];
  const version = /version:\s*['"]?([^\s'"\n]+)/.exec(manifest)[1];
  let received;
  const result = await collectRemote({ ...config, seedRepositories: [] }, { now, get: fixtureGet(repos, async (endpoint) => {
    if (endpoint.includes("/tags?")) return [{ name: `v${version}`, commit: { sha: "a".repeat(40) } }];
    if (endpoint.includes("/git/ref/tags/")) return { ref: `refs/tags/v${version}`, object: { type: "commit", sha: "a".repeat(40) } };
  }), onComplete: async (catalog, releases, issues) => { received = { catalog, releases, issues }; } });
  assert.equal(result.entries.length, 1);
  assert.equal(received.releases.length, 1);
  assert.deepEqual(received.releases[0].sourceRef, { type: "tag", name: `v${version}` });
  assert.equal(received.releases[0].commitSha, result.entries[0].commitSha);
  assert.equal(received.releases[0].releasePublishedAt, null);
});

test("a seed made private before finalization is removed even from a resumable result", async () => {
  const repos = [metadata(1, "covel-ai/covel-worlds")];
  const catalog = await collectRemote(config, { now, get: fixtureGet(repos, async (endpoint) => endpoint === "/repositories/1" ? { ...repos[0], private: true } : undefined) });
  assert.equal(catalog.stats.entries, 0);
});
