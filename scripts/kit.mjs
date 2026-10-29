import path from "node:path";
import { pathToFileURL } from "node:url";

if (process.env.CI && process.env.COVEL_CATALOG_KIT) throw new Error("CI must use the pinned catalog kit");
const directory = process.env.COVEL_CATALOG_KIT
  ? pathToFileURL(`${path.resolve(process.env.COVEL_CATALOG_KIT)}/`) : null;
export const kitModule = (name) => {
  if (!/^[a-z-]+$/.test(name)) throw new Error("Invalid kit module name");
  return directory ? import(new URL(`src/${name}.mjs`, directory)) : import(`@covel/catalog-kit/${name}`);
};
export const kitAdapter = (kind) => {
  if (!["worlds", "plugins"].includes(kind)) throw new Error("Invalid catalog kind");
  return directory ? import(new URL(`adapters/${kind}.mjs`, directory)) : import(`@covel/catalog-kit/adapters/${kind}`);
};
export const github = await kitModule("github");
export const schema = await kitModule("schema");
export const hashing = await kitModule("hash");
