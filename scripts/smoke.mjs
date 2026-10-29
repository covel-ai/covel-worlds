import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectRemote, root } from "./collect.mjs";
import { github, kitModule } from "./kit.mjs";

// Explicit online test, never imported by the PR fixture suite. No publication.
const config = JSON.parse(await readFile(path.join(root, "catalog/config.json"), "utf8"));
const get = github.createGitHubClient({ maxRequests: 300 });
let releases = [];
const catalog = await collectRemote(config, { get, onComplete: async (_catalog, sidecar) => { releases = sidecar; } });
const example = catalog.entries.find((entry) => entry.official && entry.status === "indexed");
if (!example) throw new Error("Online smoke requires a public indexed official example");
const { createPackager, validateWorldPackage } = await kitModule("packager");
const artifact = await createPackager({ get, cacheDir: path.join(root, ".cache/smoke-artifacts"), validatePackage: (_kind, files, entry) => validateWorldPackage(files, entry) }).prepare(example);
const report = { generatedAt: catalog.generatedAt, repositories: catalog.stats.repositories, packages: catalog.stats.packages,
  releaseObservations: releases.length, example: { key: example.key, commitSha: example.commitSha, sourceTreeHash: example.sourceTreeHash,
    contentHash: artifact.contentHash, artifactSha256: artifact.artifactSha256, size: artifact.size }, api: get.stats() };
await mkdir(path.join(root, "artifacts"), { recursive: true });
await writeFile(path.join(root, "artifacts/online-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
