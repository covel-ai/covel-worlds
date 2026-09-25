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
  for (const key of ["name", "summary"])
    if (!manifest[key]?.["en-US"] || !manifest[key]?.["zh-CN"])
      throw new Error(`${folder}: missing display translation`);
  for (const file of ["WORLD.md", "WORLD.zh-CN.md", "LICENSE"])
    await readFile(path.join(directory, file), "utf8");
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
