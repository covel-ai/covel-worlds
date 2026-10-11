import { parse } from "yaml";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../worlds",
);
const ids = new Set();
for (const folder of await readdir(root)) {
  const directory = path.join(root, folder);
  const manifest = parse(
    await readFile(path.join(directory, "world.yaml"), "utf8"),
  );
  if (manifest.id !== folder || ids.has(manifest.id))
    throw new Error(`Invalid or duplicate world id: ${folder}`);
  ids.add(manifest.id);
  // One language per file: main files hold defaultLocale text, and every other
  // supported locale has its own translation files beside them.
  for (const key of ["name", "summary"])
    if (typeof manifest[key] !== "string" || !manifest[key].trim())
      throw new Error(`${folder}: ${key} must be ${manifest.defaultLocale} text`);
  const locales = manifest.supportedLocales ?? [];
  if (!locales.includes(manifest.defaultLocale))
    throw new Error(`${folder}: supportedLocales must include defaultLocale`);
  for (const file of ["WORLD.md", "LICENSE", "README.md"])
    await readFile(path.join(directory, file), "utf8");
  for (const locale of locales) {
    if (locale === manifest.defaultLocale) continue;
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
    for (const source of Object.values(descriptor.sources))
      await verifyPath(source.path);
  }
}
console.log(`Validated ${ids.size} example world layouts`);
