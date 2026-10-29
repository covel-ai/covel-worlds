# Contributing

Publish a world in your own public GitHub repository and add **`covel-world` or `covel-worlds`** to its Topics (About → settings). Either topic joins the automatic directory; no registration PR or JSON entry is needed. Multiple world directories in one repository are supported.

Each package needs a valid `world.yaml` and `WORLD.md`. Include its ID, name, summary, version, default/supported locales, author and license. Keep translated display text in `world.<locale>.yaml`. See the examples in `worlds/`. Give media and third-party content their own attribution/license. Only configured repositories receive the official designation.

Use an independent world ID and `world.yaml` version. Keep executable plugins in their own packages. Never include credentials, personal exports, acceptance-test transcripts or unverifiable quality claims. Explain gameplay, dependencies, installation and limitations in the package README.

Before publishing, run `pnpm validate:world --strict <path-to-world>` from the targeted Covel checkout and explain compatibility and limitations in your package README. A directory entry alone does not certify content safety or compatibility. See [publishing](docs/publishing.md).

Collection is scheduled every six hours; large resumable runs and GitHub search indexing can take longer. Invalid metadata stays visible as pending with diagnostics. To leave, remove both topics; archived repositories are hidden by default. Report incorrect listings or content through [GitHub Issues](https://github.com/covel-ai/covel-worlds/issues).

For changes to this directory, use Node 26, `npm ci`, `npm run generate`, `npm test`, and `npm run build`. Shared collection/UI/service changes belong in the canonical kit in [covel-catalog](https://github.com/covel-ai/covel-catalog); consumers update by a pinned commit rather than editing vendor files. See [catalog operations](docs/catalog.md).
