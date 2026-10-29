import { execFileSync } from "node:child_process";
export default function setup() {
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--outDir", "../.cache/ui-api"], {
    env: { ...process.env, VITE_CATALOG_API: "https://registry.test" }, stdio: "pipe",
  });
}
