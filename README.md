# Covel Worlds

Official world examples and an automatically collected community directory for [Covel](https://github.com/ackness/covel).

<!-- languages:start -->
**English** · [简体中文](README.zh-CN.md)
<!-- languages:end -->

## Install

In a Covel build with GitHub world installation support, open **Settings → Packages**, paste `https://github.com/covel-ai/covel-worlds`, preview the repository, choose a world, review its content and confirm installation. Repeat for other worlds. Downloads follow Covel's proxy settings. Older builds can import a ZIP with `world.yaml` at its root.

Worlds contain story content, prompts, settings and media. Required plugins are installed and authorized separately. A directory listing is not a security guarantee. Read [publishing and updates](docs/publishing.md).

## Directory

[Browse worlds](https://covel-ai.github.io/covel-worlds/) · [Browse plugins](https://covel-ai.github.io/covel-plugins/)

Add **`covel-world` or `covel-worlds`** to the Topics in your public repository's About section. Either topic is sufficient; both are deduplicated. The collector reads `world.yaml` and translations, supports multiple worlds per repository, and runs every six hours, on main-branch pushes, or manually. GitHub search indexing can delay discovery.

Repositories without usable metadata remain visible as pending entries. Archived repositories are filterable. Removing both topics removes a community repository unless it is an explicitly recorded migration seed. Public visibility and moderation rules always apply.

The included examples are [Lantern Island](worlds/lantern-island/) and [Clockwork Market](worlds/clockwork-market/). Their manifests are the source of display metadata; this README no longer maintains a table.

## Contribute

Worlds stay in their authors' repositories. No registration PR is needed; see [CONTRIBUTING.md](CONTRIBUTING.md) for the metadata and Topics requirements.

Use Node 26 and `npm ci`. `npm run generate` produces an offline catalog from the examples; `npm run collect` queries GitHub. `npm test` checks the shared kit and world adapter, and `npm run build` builds the site. See [catalog operations](docs/catalog.md) for API configuration, deployment and shared-code upgrades.

The worlds and plugins directories consume the same versioned catalog kit, UI and service protocols. [Shared specification](vendor/catalog-kit/SPEC.md) · [World authoring skill](.agents/skills/create-world/SKILL.md).
