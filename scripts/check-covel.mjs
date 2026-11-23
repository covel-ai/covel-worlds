// Validates every world package in this repository with a Covel checkout's
// own static validator: `COVEL_DIR=/path/to/covel npm run check:covel`.
// The checkout must have run `pnpm install`; check out the release you target.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const covel = process.env.COVEL_DIR;
if (!covel || !existsSync(path.join(covel, "scripts/validate-release-worlds.ts"))) {
  console.error("Set COVEL_DIR to a Covel checkout with dependencies installed.");
  process.exit(2);
}

const worlds = readdirSync(path.join(root, "worlds"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, "worlds", entry.name))
  .filter((dir) => existsSync(path.join(dir, "world.yaml")))
  .sort();

let failed = 0;
for (const dir of worlds) {
  const run = spawnSync("pnpm", ["validate:world", "--strict", dir], {
    cwd: covel,
    encoding: "utf8",
  });
  const output = `${run.stdout}${run.stderr}`
    .split("\n")
    .filter((line) => line && !line.startsWith("$") && !line.startsWith(">"))
    .join("\n");
  console.log(output);
  if (run.status !== 0) failed += 1;
}

console.log(`${worlds.length - failed}/${worlds.length} worlds pass Covel validation`);
process.exit(failed ? 1 : 0);
