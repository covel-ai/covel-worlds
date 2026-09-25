# Covel Worlds

Official world examples and a community-maintained directory for [Covel](https://github.com/ackness/covel).

<!-- languages:start -->
**English** · [简体中文](README.zh-CN.md)
<!-- languages:end -->

## Install

In a Covel build with GitHub world installation support, open **Settings → Packages**, paste `https://github.com/covel-ai/covel-worlds`, preview the repository, choose a world, review its content and confirm installation. Repeat for other worlds. Downloads follow Covel's proxy settings. Older builds can import a ZIP with `world.yaml` at its root.

Worlds contain story content, prompts, settings and media. Required plugins are installed and authorized separately. A directory listing is not a security guarantee. Read [publishing and updates](docs/publishing.md).

## Directory

Official examples appear first; independently maintained community worlds have their own table.

<!-- registry:start -->
### Official worlds

| World | Description | Author | Covel version | Status | Demo | Install source |
| --- | --- | --- | --- | --- | --- | --- |
| [Clockwork Market](https://github.com/covel-ai/covel-worlds) | A bilingual world-data example with a portable lorebook source and explicit plugin policy. | Covel | &gt;=0.0.39 | Available | [Demo](https://github.com/covel-ai/covel-worlds/tree/main/worlds/clockwork-market) | [Install source](https://github.com/covel-ai/covel-worlds/tree/main/worlds/clockwork-market) |
| [Lantern Island](https://github.com/covel-ai/covel-worlds) | A compact bilingual coastal mystery, using only built-in storytelling plugins. | Covel | &gt;=0.0.39 | Available | [Demo](https://github.com/covel-ai/covel-worlds/tree/main/worlds/lantern-island) | [Install source](https://github.com/covel-ai/covel-worlds/tree/main/worlds/lantern-island) |

### Community worlds

No worlds listed yet.
<!-- registry:end -->

## Contribute

Submit a PR adding a JSON entry under `registry/worlds/`. Your world can stay in your own repository. See [CONTRIBUTING.md](CONTRIBUTING.md). Entries and translations are structured data for a future website; README tables are generated from them.

To add a README language, add its labels and filename to `registry/locales.json`, create the page with the language and registry markers, then run `npm run generate`. Missing entry translations fall back to English.

Run `npm ci` once. `npm test` checks the directory and examples. The authoring skill is [.agents/skills/create-world](.agents/skills/create-world/SKILL.md).
