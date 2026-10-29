import path from "node:path";
import { pathToFileURL } from "node:url";

// CI always uses the exact upstream commit in catalog-kit.lock.json.
if (process.env.CI && process.env.COVEL_CATALOG_KIT) throw new Error("CI must use the pinned catalog kit");
const directory = process.env.COVEL_CATALOG_KIT
  ? pathToFileURL(`${path.resolve(process.env.COVEL_CATALOG_KIT)}/`)
  : new URL("../vendor/catalog-kit/", import.meta.url);
export const github = await import(new URL("src/github.mjs", directory));
export const schema = await import(new URL("src/schema.mjs", directory));
export const hashing = await import(new URL("src/hash.mjs", directory));
export const kitModule = (name) => {
  if (!/^[a-z-]+$/.test(name)) throw new Error("Invalid kit module name");
  return import(new URL(`src/${name}.mjs`, directory));
};
