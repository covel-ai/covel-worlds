---
name: create-world
description: Create or update a Covel world package and its directory entry, including localized lore, plugin policy and world-data sources. Use for world authoring and publishing in covel-worlds.
---

# Create a Covel world

Build the requested world under `worlds/<unique-id>/`. Read the compact `worlds/lantern-island` example first; use `worlds/clockwork-market` when the world needs imported data. Scale the lore and dimensions to the requested experience.

- Write `world.yaml` with schemaVersion, id, name, summary, version, defaultLocale and supportedLocales. Use English fallback text and locale-keyed display fields. Keep `WORLD.md` as the default lore and add `WORLD.<locale>.md` when translated.
- Declare required/recommended plugins in `pluginPolicy`; verify their IDs and capabilities against the targeted Covel version. This repository does not contain the framework or built-in plugins. Installing a world never installs or authorizes those dependencies.
- Keep paths inside the world directory. Put data in `data/`, media in `media/`, and document licenses. Do not embed executable plugin code, API keys or local exports.
- For structured data, use a `worldData` descriptor and validate each source against its target schema. See the matching Covel checkout's [world-data reference](https://github.com/ackness/covel/blob/main/docs/reference/world-data.md) and `packages/shared/src/schemas/world.ts`; current upstream may differ from a released version.
- Add a registry entry using `maintainer: community` unless the user is publishing a Covel-maintained official example. Describe gameplay and installation, not internal test transcripts.

Install validation tools with `npm ci` when needed. Run `npm run generate` and `npm test`. These checks validate the directory and sample layout; additionally validate manifests and referenced data against the target Covel checkout and run world-data preflight when available. Report any unrun gameplay or runtime checks plainly. Follow [publishing and updates](../../../docs/publishing.md) for versions, release refs and edited-world handling.
