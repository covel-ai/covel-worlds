import { parse } from "yaml";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../worlds",
);
const WORLD_ID = /^[a-z][a-z0-9-]{0,63}$/;
const LOCALE_TAG = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/;
const WORLD_MANIFEST_LOCALE = /^world\.([^/]+)\.yaml$/;
const WORLD_LORE_LOCALE = /^WORLD\.([^/]+)\.md$/;
const ids = new Set();

for (const folder of await readdir(root)) {
  const directory = path.join(root, folder);
  const manifest = parse(
    await readFile(path.join(directory, "world.yaml"), "utf8"),
  );
  for (const obsolete of ["schemaVersion", "supportedLocales", "pluginPolicy"]) {
    if (obsolete in manifest)
      throw new Error(`${folder}: obsolete world.yaml field "${obsolete}"`);
  }
  const worldId = manifest.id ?? folder;
  if (
    typeof worldId !== "string" ||
    !WORLD_ID.test(worldId) ||
    worldId !== folder ||
    ids.has(worldId)
  )
    throw new Error(`Invalid or duplicate world id: ${folder}`);
  ids.add(worldId);

  if (
    typeof manifest.defaultLocale !== "string" ||
    !LOCALE_TAG.test(manifest.defaultLocale)
  )
    throw new Error(`${folder}: invalid defaultLocale`);

  // One language per file: main files hold defaultLocale text, and additional
  // editions are discovered from sibling `world.<locale>.yaml` / `WORLD.<locale>.md`.
  for (const key of ["name", "summary"])
    if (typeof manifest[key] !== "string" || !manifest[key].trim())
      throw new Error(`${folder}: ${key} must be ${manifest.defaultLocale} text`);

  for (const file of ["WORLD.md", "LICENSE", "README.md"])
    await readFile(path.join(directory, file), "utf8");

  const locales = new Set();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match =
      WORLD_MANIFEST_LOCALE.exec(entry.name) ??
      WORLD_LORE_LOCALE.exec(entry.name);
    if (!match) continue;
    const locale = match[1];
    if (!LOCALE_TAG.test(locale) || locale === manifest.defaultLocale)
      throw new Error(`${folder}: invalid edition filename ${entry.name}`);
    locales.add(locale);
  }
  for (const locale of locales) {
    await readFile(path.join(directory, `WORLD.${locale}.md`), "utf8");
    const translation = parse(
      await readFile(path.join(directory, `world.${locale}.yaml`), "utf8"),
    );
    for (const key of ["name", "summary"])
      if (typeof translation?.[key] !== "string" || !translation[key].trim())
        throw new Error(`${folder}: world.${locale}.yaml lacks ${key}`);
  }

  const verifyPath = async (relative) => {
    if (
      typeof relative !== "string" ||
      relative
        .split("/")
        .some(
          (part) =>
            !part || part === "." || part === ".." || part.includes("\\"),
        ) ||
      path.isAbsolute(relative)
    )
      throw new Error("Unsafe source path");
    let current = directory;
    for (const part of relative.split("/")) {
      current = path.join(current, part);
      if ((await lstat(current)).isSymbolicLink())
        throw new Error("Linked sources are not portable");
    }
    return current;
  };

  if (manifest.worldData) {
    const descriptor = parse(
      await readFile(await verifyPath(manifest.worldData), "utf8"),
    );
    if ("schemaVersion" in descriptor)
      throw new Error(`${folder}: obsolete descriptor field "schemaVersion"`);
    for (const source of Object.values(descriptor.sources ?? {}))
      await verifyPath(source.path);
  }
}

console.log(`Validated ${ids.size} example world layouts`);
