---
name: create-world
description: Create or update a Covel world package and its directory entry, including localized lore, plugin policy and world-data sources. Use for world authoring and publishing in covel-worlds.
---

# Create a Covel world

Build the requested world under `worlds/<unique-id>/`. Read the compact `worlds/lantern-island` example first; use `worlds/clockwork-market` when the world needs imported data. Scale the lore and data to the requested experience.

Field tables, data contracts and the plugin catalogue are **not copied into this skill**. Query them from a Covel checkout of the version you target (`git clone https://github.com/ackness/covel`, check out the release tag, `pnpm install`), so this skill does not go stale when the framework changes. The current examples target Covel `>=0.0.50`.

## 1. Ask the target Covel what a world can contain

In the Covel checkout:

```bash
pnpm describe:authoring          # files of a world package, data targets, plugin catalogue
pnpm describe:authoring --json   # the same, machine-readable
```

It lists every kind of content a world can preload, the plugin that receives it, the file path it belongs at, a valid example, and each plugin's ID, contracts and `pluginSettings`. Use only the plugin IDs, contracts and settings it lists; add `--plugins <dir>` to include community plugins. Authoritative references in that checkout: `docs/reference/schema/world-manifest.md`, `docs/reference/world-data.md`, `docs/reference/world-installation.md`.

## 2. Write the package

```
worlds/<id>/
├── world.yaml             # one language: defaultLocale
├── world.<locale>.yaml    # translations of world.yaml display text, same keys
├── WORLD.md               # lore in the default language
├── WORLD.<locale>.md      # full lore in another supported locale
├── data/, characters/, media/
├── README.md
└── LICENSE
```

- `world.yaml` starts with `# yaml-language-server: $schema=https://raw.githubusercontent.com/ackness/covel/<tag>/packages/shared/schemas/world-manifest.schema.json` and declares `schemaVersion`, `id` (equal to the directory name), `name`, `version`, `summary`, `defaultLocale` and `supportedLocales`.
- **One language per file.** Main files hold only the `defaultLocale` text. Never write inline maps such as `name: { en-US: …, zh-CN: … }`; Covel rejects them (`inline-locale-map`). Put each other language in `<name>.<locale>.<ext>` beside the file, with only the translated text under the same keys and ids (`world.zh-CN.yaml`, `data/rules.zh-CN.json`). Spell `<locale>` exactly as `supportedLocales` does (`zh-CN`, not `zh`); a bare-language file is rejected.
- `pluginPolicy` uses `presetId` (a built-in pack such as `traditional-story`, `dialogue-mode`, `low-cost`, or one of the world's own `packs`), `requested` (enabled by default), `recommended` (suggested only) and `requires` (contract IDs such as `action-check@1`, satisfied by any installed provider). Installing a world never installs or authorizes plugins.
- Files at the conventional paths that `describe:authoring` prints are imported without a descriptor. Write `data/world.data.yaml` and `worldData` only when a file is elsewhere, a kind of content spans several files, or import order matters; then list every source. Lorebook records need `id` and `content`, and `keys` when `strategy: selective`.
- Optional credits: `author` (`name`, `url`, `about`, `links`), `license`, `homepage`, all `https`. Do not invent an author or links the user did not give.
- Optional presentation: `cover` and `accentColor`, `themeMusic`, `defaultViewMode`. A `cover` must name an existing image one directory under `media/`.
- Hide spoilers from the player inside `<!-- narrator-only -->` … `<!-- /narrator-only -->` lines in every language edition of `WORLD.md`.
- Keep every path inside the world directory. Do not embed executable plugin code, API keys, personal exports or test transcripts. Document media licenses.

## 3. Register the world

Publish the package in a public repository and add either `covel-world` or `covel-worlds` to its GitHub Topics. The directory discovers both and reads `world.yaml`, supported translations and package paths automatically. No registration JSON or README table is required. Only configured Covel repositories receive the official designation; a package cannot declare itself official. Document compatibility evidence in the package README; missing authoritative compatibility metadata remains unknown.

## 4. Validate

In this repository, use Node 26: `npm ci` once, then `npm run generate` and `npm test` (offline catalog, shared contracts and the portable layout of the shipped examples).

Against the target Covel checkout (the real manifest, lore, plugin-ID, contract and per-record data validation):

```bash
pnpm validate:world --strict /path/to/covel-worlds/worlds/<id>
```

Fix every error and judge each warning (a missing translation is a warning). Report plainly which checks did not run, such as an actual play session.

Follow [publishing and updates](../../../docs/publishing.md) for versions, release refs and edited-world handling.
