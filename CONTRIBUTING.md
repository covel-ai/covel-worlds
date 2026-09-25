# Contributing

Add `registry/worlds/<id>.json` using an existing entry and `registry/schema.json` as references. Use `maintainer: community` for submissions; the Covel team assigns `official` to worlds it maintains. Include a public repository, exact package path/ref, description, author, license, supported languages and the compatible Covel version. Use `covelVersion: null` if compatibility has not been established. Give media and third-party content their own attribution/license when needed.

Use an independent world ID and `world.yaml` version. Keep executable plugins in their own packages. Never include credentials, personal exports, acceptance-test transcripts or unverifiable quality claims. Explain gameplay, dependencies, installation and limitations in the package README.

Run `npm run generate` and `npm test`, then commit the entry and regenerated READMEs. Include a concise content description and validation evidence in the PR. A directory entry alone does not certify code or content safety. See [publishing](docs/publishing.md).
