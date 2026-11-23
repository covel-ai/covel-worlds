---
name: create-world
description: Create or update a Covel world package and its directory entry, including localized lore, plugin selection and world-data sources. Use for world authoring and publishing in covel-worlds.
---

# Create a Covel world

Build the requested world under `worlds/<unique-id>/`. Read the compact `worlds/lantern-island` example first; use `worlds/clockwork-market` when the world has custom data paths outside the conventional locations. Scale lore and data to the requested experience.

Field tables, data contracts and the plugin catalogue are **not copied into this skill**. Query them from a Covel checkout of the version you target (`git clone https://github.com/ackness/covel`, check out the release tag, `pnpm install`), so this skill does not go stale when the framework changes. The current examples target Covel `>=0.0.54`.

## 1. Ask the target Covel what a world can contain

In the Covel checkout:

```bash
pnpm describe:authoring          # files of a world package, data targets, plugin catalogue
pnpm describe:authoring --json   # the same, machine-readable
```

It lists every kind of content a world can preload, the plugin that receives it, its conventional `path` (or `characterField`, such as `blueprint`), a valid example, and each plugin's ID, contracts and `pluginSettings`. Use only the plugin IDs, contracts and settings it prints; add `--plugins <dir>` to scan community plugins too. Authoritative references in that checkout: `docs/reference/schema/world-manifest.md`, `docs/reference/world-data.md`, `docs/reference/world-installation.md`.

## 2. Select gameplay and plugins

- Pick a built-in pack in `plugins` using `pack:<id>`: `traditional-story`, `dialogue-mode`, `low-cost`, or `narrative-only`. Worlds cannot define custom packs.
- Choose preloaded data types that match the concept; preloaded files infer unique qualifying receivers automatically, so do not redundantly list data plugins in `plugins`. Write `plugin:<id>` only when a plugin has no seeded data or you need to disambiguate among multiple candidates.
- The first `pack:` entry selects the initial pack, and subsequent `pack:` entries become alternatives; redundant duplicate references are rejected. Omitting `plugins` uses Covel's core defaults. Use `contract:<name>@<version>` for capability requests without hardcoding a specific plugin ID.
- Use `pluginPitch` (`label`, `description`, `reason`) only when overriding public card text; by default, Covel derives it from `name`, `summary`, and `tags`.
- For visual-novel worlds, set `defaultViewMode: stage`; portraits and scene backgrounds remain progressive enhancements.

## 3. Write the package

```
worlds/<id>/
├── world.yaml             # current-contract fields in defaultLocale only
├── world.<locale>.yaml    # optional translations of display text, same keys
├── WORLD.md               # lore in defaultLocale
├── WORLD.<locale>.md      # full lore in another language edition
├── data/
│   ├── dimensions.yaml    # omit worldData when using conventional paths
│   └── ...
├── characters/
│   └── characters.json    # single character file with plugin fields inline
├── media/
├── README.md
└── LICENSE
```

- Start `world.yaml` with `# yaml-language-server: $schema=https://raw.githubusercontent.com/ackness/covel/v0.0.54/packages/shared/schemas/world-manifest.schema.json` (replace `v0.0.54` with your target release tag). Write `name`, `version`, `summary`, and `defaultLocale`.
- Do **not** write `schemaVersion`, `supportedLocales`, or `pluginPolicy` (or `schemaVersion` inside `world.data.yaml`). Omit `id` in `world.yaml` (Covel derives the ID from the folder name).
- **One language per file.** Main files hold only `defaultLocale` text. Never write inline maps (`name: { en-US: ..., zh-CN: ... }`); Covel rejects them (`inline-locale-map`). Add other editions as `<name>.<locale>.<ext>` beside each file (`world.zh-CN.yaml`, `WORLD.zh-CN.md`, `data/rules.zh-CN.json`), using full BCP 47 tags (`zh-CN`, not `.zh` or `.en`). Editions are discovered automatically from sibling translation files.
- **Conventional data imports automatically:** Files placed at conventional paths printed by `describe:authoring` (`data/dimensions.yaml`, `data/lorebook.yaml`, `characters/characters.json`, plugin-declared paths) import with no `world.data.yaml` and no `worldData` field. Only write `data/world.data.yaml` and `worldData` when data lives elsewhere (as in `worlds/clockwork-market`), two plugins share a path, or you need explicit ordering/overrides (`enabled: false`).
- Keep one `characters/characters.json` per world; store plugin-owned character fields inside each character record instead of creating parallel files. Use `characterSchema` (`abilities`, `stats`, `social`, `bio`, `equipment`) when customizing character types or attributes.
- Optional metadata: `tags`, `author` (`name`, `url`, `about`, `links`), `license`, `homepage` (`https` URLs only; never invent attribution), `cover` (`.png`/`.jpg`/`.webp` one level under `media/`), `accentColor`, `themeMusic` (`.mp3`/`.wav` one level under `media/`).
- Hide spoilers from players inside standalone `<!-- narrator-only -->` ... `<!-- /narrator-only -->` lines at matching positions in every language edition of `WORLD.md`.
- Keep all IDs (`worlds/<id>/`, source IDs, record IDs) lowercase kebab-case ASCII and keep every file path inside the world directory without symlinks, executable plugin code, or credentials. Document media licenses.

## 4. Register the world

Publish the package in a public repository and add either `covel-world` or `covel-worlds` to its GitHub Topics. The directory discovers both and reads `world.yaml`, file-derived language editions, and package paths automatically. No registration JSON or README table is required. Only configured Covel repositories receive the official designation; a package cannot declare itself official. Document compatibility evidence in the package README.

## 5. Validate

In this repository, use Node 26: `npm ci` once, then `npm run generate` and `npm test` (offline catalog, shared contracts, and layout checks).

Against the target Covel checkout (real manifest, lore, plugin IDs, contracts, translations, and per-record data validation):

```bash
pnpm validate:world --strict /path/to/covel-worlds/worlds/<id>
```

Or validate every official world in this repo from here with:

```bash
COVEL_DIR=/path/to/covel npm run check:covel
```

Fix every error and review any warnings. Report plainly which checks did not run, such as a live play session.

Follow [publishing and updates](../../../docs/publishing.md) for versions, release refs, and edited-world handling.
