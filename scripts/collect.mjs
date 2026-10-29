import { readFile, readdir, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { github, schema, kitModule } from "./kit.mjs";
import { candidate, extractWorlds } from "./world-adapter.mjs";

export const root = fileURLToPath(new URL("../", import.meta.url));

export function validateConfig(config) {
  if (!Array.isArray(config.topics) || !config.topics.length || config.topics.some((topic) => !/^[a-z0-9][a-z0-9-]{0,49}$/.test(topic)) || new Set(config.topics).size !== config.topics.length) throw new Error("Invalid discovery topics");
  for (const field of ["officialRepositories", "seedRepositories"]) {
    if (!Array.isArray(config[field])) throw new Error(`Missing ${field}`);
    config[field].forEach(github.repositoryPath);
  }
  if (!config.excludeRepositories || typeof config.excludeRepositories !== "object" || Array.isArray(config.excludeRepositories)) throw new Error("Invalid exclusion map");
  for (const [name, reason] of Object.entries(config.excludeRepositories)) {
    github.repositoryPath(name);
    if (typeof reason !== "string" || !reason.trim()) throw new Error("Exclusions need a reason");
  }
  if (!Number.isInteger(config.maxWorldsPerRepository) || config.maxWorldsPerRepository < 1 || config.maxWorldsPerRepository > 500) throw new Error("Invalid world count limit");
  return config;
}

export async function collectRemote(config, { get = github.createGitHubClient(), now = new Date(), checkpoint, releaseCheckpoint, onComplete = async () => {} } = {}) {
  validateConfig(config);
  const { collectRound } = await kitModule("round");
  const discovered = await github.discoverRepositories(get, config.topics, { now });
  const seeds = new Set(config.seedRepositories.map((name) => name.toLowerCase()));
  const excluded = new Set(Object.keys(config.excludeRepositories).map((name) => name.toLowerCase()));
  const names = [...new Set([...discovered, ...seeds].map((name) => name.toLowerCase()))].filter((name) => !excluded.has(name)).sort();
  const fetchedAt = now.toISOString();
  const roundConfig = { adapterVersion: 2, ...config };
  const round = await collectRound({ names, config: roundConfig, checkpoint, now: () => fetchedAt,
    collect: async (name) => {
      const repo = await get(github.repositoryPath(name), { optional: true });
      if (!repo || repo.private !== false || repo.disabled) return null;
      github.repositoryPath(repo.full_name);
      if (!Number.isSafeInteger(repo.id) || repo.id < 1) throw new github.GitHubError("Repository is missing its numeric identity");
      if (excluded.has(repo.full_name.toLowerCase())) return null;
      const topic = config.topics.some((topic) => repo.topics?.includes(topic));
      if (!topic && !seeds.has(name)) return null;
      const discovery = topic ? "topic" : "seed";
      const source = await github.repositoryTree(get, repo);
      if (!source) return { repositoryId: repo.id, repo, seed: seeds.has(name), entries: [candidate(repo, { config, discovery, fetchedAt, problems: ["empty-repository"] })], issues: [] };
      const result = await extractWorlds({ repo, tree: source.tree, commitSha: source.commitSha, config, discovery, fetchedAt,
        read: (file) => github.readBlob(get, github.repositoryPath(repo.full_name), file) });
      return { repositoryId: repo.id, repo, seed: seeds.has(name), ...result };
    },
    finalize: (results, { completedAt }) => {
      // A rename may leave both the old seed and new topic name in membership.
      // Keep one coherent observation of that repository, not mixed package trees.
      const repositories = new Map(results.filter(Boolean).map((result) => [result.repositoryId, result]));
      const entries = [...repositories.values()].flatMap((result) => result.entries);
      const issues = [...repositories.values()].flatMap((result) => result.issues);
      return { catalog: schema.createCatalog({ kind: "worlds", entries, topics: config.topics, generatedAt: completedAt, mode: "github", issues }), repositories: [...repositories.values()] };
    },
  });
  // Seed exceptions are a small fixed migration list. Recheck their public
  // identity even when their result was completed in an earlier budget run.
  const unavailable = new Set();
  for (const result of round.result.repositories.filter((item) => item.seed)) {
    const live = await get(`/repositories/${result.repositoryId}`, { optional: true });
    if (!live || live.private !== false || live.disabled || live.id !== result.repositoryId || live.owner?.id !== result.repo.owner?.id || live.full_name !== result.repo.full_name || live.archived !== result.repo.archived) unavailable.add(result.repositoryId);
  }
  const original = round.result.catalog;
  const repositories = round.result.repositories.filter((item) => !unavailable.has(item.repositoryId));
  const catalog = schema.createCatalog({ ...original, entries: original.entries.filter((entry) => !unavailable.has(entry.repositoryId)), issues: original.issues.filter((issue) => !round.result.repositories.some((item) => unavailable.has(item.repositoryId) && item.repo.full_name === issue.repository)) });
  const { collectReleases } = await kitModule("releases");
  const releases = await collectReleases({ get, repositories: repositories.map((item) => item.repo), entries: catalog.entries, checkpoint: releaseCheckpoint, config: roundConfig, now,
    extractAtCommit: async (repo, commitSha) => {
      const source = await github.repositoryTree(get, { ...repo, default_branch: commitSha });
      if (!source || source.commitSha !== commitSha) throw new github.GitHubError("Release commit resolution changed");
      const discovery = catalog.entries.find((entry) => entry.repositoryId === repo.id)?.discovery ?? "topic";
      return extractWorlds({ repo, ...source, config, discovery, fetchedAt,
        read: (file) => github.readBlob(get, github.repositoryPath(repo.full_name), file) });
    },
  });
  await onComplete(catalog, releases.releases, releases.issues);
  await releases.acknowledge();
  await round.acknowledge();
  return catalog;
}

export async function collectLocal(config, directory = root) {
  validateConfig(config);
  const tree = [];
  async function walk(relative) {
    for (const item of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      if (item.isSymbolicLink() || [".git", "node_modules"].includes(item.name)) continue;
      const filename = path.posix.join(relative, item.name);
      if (item.isDirectory()) await walk(filename);
      else if (item.isFile()) tree.push({ path: filename, type: "blob", mode: "100644" });
    }
  }
  await walk("worlds");
  const repo = { id: null, name: "covel-worlds", full_name: "covel-ai/covel-worlds", private: false, default_branch: "main", owner: { login: "covel-ai" }, topics: [], license: { spdx_id: "MIT" } };
  const result = await extractWorlds({ repo, tree, config, discovery: "local", read: async (file) => {
    const bytes = await readFile(path.join(directory, file.path));
    if (bytes.length > github.MAX_FILE_BYTES) throw new github.MetadataError("Manifest exceeds 256 KiB");
    return bytes.toString("utf8");
  } });
  return schema.createCatalog({ kind: "worlds", topics: config.topics, mode: "local", ...result });
}

export async function writeCatalog(catalog, filename) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(schema.parseCatalog(catalog), null, 2)}\n`);
  await rename(temporary, filename);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((arg) => arg !== "--local")) throw new Error("Usage: node scripts/collect.mjs [--local]");
  const config = JSON.parse(await readFile(path.join(root, "catalog/config.json"), "utf8"));
  const get = process.env.CATALOG_API_URL && !process.argv.includes("--local")
    ? (await kitModule("proxy-client")).createRegistryGitHubClient({ apiUrl: process.env.CATALOG_API_URL, token: process.env.CATALOG_INGEST_TOKEN, kind: "worlds" })
    : github.createGitHubClient({ cache: github.diskCache(path.join(root, ".cache/github")), maxRequests: Number(process.env.GITHUB_REQUEST_BUDGET ?? 900) });
  const output = path.join(root, "site/public/catalog.json");
  let catalog;
  if (process.argv.includes("--local")) {
    catalog = await collectLocal(config);
    await writeCatalog(catalog, output);
  } else {
    const { fileCheckpoint } = await kitModule("round");
    catalog = await collectRemote(config, { get, checkpoint: fileCheckpoint(path.join(root, ".cache/round/worlds.json")), releaseCheckpoint: fileCheckpoint(path.join(root, ".cache/round/world-releases.json")),
      onComplete: async (result, releases, issues) => {
        await mkdir(path.join(root, "artifacts"), { recursive: true });
        await writeFile(path.join(root, "artifacts/releases.json"), `${JSON.stringify(releases, null, 2)}\n`);
        await writeFile(path.join(root, "artifacts/release-issues.json"), `${JSON.stringify(issues, null, 2)}\n`);
        await writeCatalog(result, output);
      },
    });
  }
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await writeFile(path.join(root, "artifacts/collection-report.json"), JSON.stringify({ generatedAt: catalog.generatedAt, stats: catalog.stats, issues: catalog.issues, api: get.stats() }, null, 2));
  const summary = `Collected ${catalog.stats.packages} package records and ${catalog.stats.entries - catalog.stats.packages} repository candidates from ${catalog.stats.repositories} repositories; ${catalog.stats.issues} metadata issues.`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, { flag: "a" });
}
