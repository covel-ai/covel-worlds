# Catalog operations / 目录运维

Worlds and plugins use one [shared protocol](../vendor/catalog-kit/SPEC.md), one
shadcn/ui implementation and one service. The public sites are GitHub Pages shells;
the shared Node 26 service owns persistent revisions, query pagination, moderation,
private ZIP artifacts and request counters. Hosting that service is a separate
deployment decision from building this repository.

## Production Cloudflare deployment (2026-10-29)

Production uses `https://api.covel.cc` from [covel-catalog-cloudflare](https://github.com/covel-ai/covel-catalog-cloudflare), with Workers, D1 and private R2. Its trusted Actions runner owns collection, checkpoints and ingestion for both directories. The Node deployment and combined collection workflow described below remain available for other deployments; they are not the active production pipeline.

The active consumer workflow is **Publish site with Cloudflare catalog** (`.github/workflows/site.yml`): push to main or dispatch, validate the pinned kit, check the current API policy/catalog, build with `VITE_CATALOG_API`, then deploy the static shell. Configure repository **variable** `DIRECTORY_API_URL=https://api.covel.cc`. This consumer needs no catalog write token or Cloudflare credential. Local fixture `catalog.json` is excluded from the production artifact; the browser reads paginated live API summaries.

Keep the legacy **Collect worlds and publish Pages** (`pages.yml`) workflow disabled in GitHub Actions and its `CATALOG_API_URL` variable unset. It uses the Node-only proxy and must not run against Cloudflare. Do not enable both pipelines. The shared legacy template remains byte-checked for consumers choosing the Node backend.

Until custom-domain ownership and DNS are verified, `DIRECTORY_SITE_URL` and `DIRECTORY_SIBLING_URL` point to the two `https://covel-ai.github.io/covel-*/` project URLs. After binding both custom domains, delete those two optional repository variables and dispatch `site.yml` in both repositories to restore the source defaults.

Pages uses the GitHub Actions source and custom domain `worlds.covel.cc`. Set its DNS-only CNAME to `covel-ai.github.io`, then enable HTTPS enforcement after certificate issuance. To restore a previous site, revert the relevant site change and push main (or dispatch at that reviewed main revision); do not roll back the independent API policy or append-only version history. Collection/rule operations and D1/R2 recovery belong to the Cloudflare deployment repository.

## Public domains

The chosen domains are `worlds.covel.cc` and `plugins.covel.cc`. The shared sidebar
links the two directories. `VITE_SITE_URL` and `VITE_SIBLING_URL` can override those
addresses for a local preview. API configuration remains separate: `api.covel.cc`
is the proposed shared backend origin, not another GitHub Pages site.

In each repository's **Settings → Pages**, choose GitHub Actions and set its
respective custom domain before configuring DNS. In the `covel.cc` DNS zone, add
`CNAME worlds → covel-ai.github.io` and `CNAME plugins → covel-ai.github.io` (no
repository path or protocol). Enable Enforce HTTPS after verification/certificate
issuance. With an Actions publishing workflow, a repository CNAME file is not
required. See [GitHub's custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

Cloudflare Workers + D1 + private R2 is being evaluated as a managed alternative
to operating the Node service. It requires a backend adapter and an asynchronous
CI packaging queue; the current Node SQLite/filesystem implementation is not a
Worker deployment. The two sites keep the same public API contract and UI.

## Local development

```sh
npm ci
npm run generate          # official manifests, offline and deterministic
npm test
npm run build
npm run dev
```

An offline preview is explicitly labeled: repository stars, host compatibility and
downloads remain unknown when not measured. It does not pretend to enforce current
policy or offer live gateway downloads. Production should configure the shared API
using `VITE_CATALOG_API` before building. Only localhost HTTP is allowed for
development; a public API uses HTTPS. Browser code never receives a GitHub token.

```sh
npm run collect           # public GitHub discovery; GITHUB_TOKEN is optional locally
npm run build:pages       # build using the successfully collected snapshot
```

The collector recognizes both Topics and discovers regular `world.yaml` files.
It reads metadata by immutable Git blobs from one resolved commit per repository.
Package descriptions and README links refer to that commit. `contentHash` remains
null until the service reads actual package bytes; `sourceTreeHash` is the separate
cheap change detector. Missing world host-range metadata remains unknown.

HTTP checkpoints and completed repository results are stored in `.cache/`. A failed
or rate-limited run must not overwrite the last complete catalog. A resumed round
reconciles Topics again, removes departed repositories and continues pending work.
The request budget is configurable through `GITHUB_REQUEST_BUDGET` (default 900).
With `CATALOG_API_URL` and the scoped `CATALOG_INGEST_TOKEN`, CI uses the shared
service's serialized GitHub proxy instead; both collectors and downloads share its
quota. A proxy limit also preserves checkpoints for the next run. The token is
used only by server-side scripts and is never included in the Pages bundle.
`artifacts/collection-report.json` contains counts and metadata diagnostics, not
credentials. These caches are not the service's version history or statistics.

Tags are observed through a separate resumable queue. `artifacts/releases.json`
contains packages whose manifest version matches `<id>/v<version>` or
`<package-path>/v<version>`. A single root package may also use `v<version>` or
`<version>`. Unrelated monorepo tags do not publish every package. Annotated tags
are dereferenced to commits. `artifacts/release-issues.json` explains excluded
observations; valid prereleases remain historical records, never stable updates.
GitHub tag pagination is not transactional, so this sidecar does not claim to be
an exhaustive history. The durable service retains previously observed versions.

`node scripts/smoke.mjs` is an explicit online acceptance check. It performs real
GitHub discovery and prepares one official example ZIP, with a 300-request ceiling;
it does not publish or record a platform download. PR tests remain offline. The
manual **Controlled online GitHub smoke** workflow runs this check separately.

## Shared source upgrades

`vendor/catalog-kit` comes from `covel-ai/covel-catalog/packages/catalog-kit`, at the commit in `catalog-kit.lock.json`. Both kinds use its canonical adapters and UI; this repository retains thin entry points. The lock
records upstream repository/path, kit version and every source-file SHA256. CI
rejects changed, missing or additional vendor files. Do not fix a shared bug here:
fix the canonical source, test it, then update both consumers.

```sh
npm run kit:check
npm run kit:sync -- --commit <full-upstream-commit-sha>
# During joint development, a local canonical checkout can supply that exact commit:
npm run kit:sync -- --commit <full-upstream-commit-sha> --source /root/covel-catalog
# Refresh the local package metadata/lock, then reinstall its exact files:
npm install --package-lock-only --ignore-scripts @covel/catalog-kit@file:vendor/catalog-kit
npm ci --ignore-scripts
```

`COVEL_CATALOG_KIT` is an explicit local testing override for a working canonical
checkout. CI rejects it. Never record an uncommitted working tree as a vendor release.
Commit the generated lock and copy together, then run shared and adapter tests.
`.npmrc` keeps local dependencies as installed copies rather than symlinks, so npm
does not write dependency directories into the immutable vendor tree. Use a clean
`npm ci` after synchronizing; an existing installed copy may still contain the old
kit even when npm has refreshed its dependency metadata.

Shared service setup, policy publication and SQLite recovery are maintained in
[covel-catalog operations](https://github.com/covel-ai/covel-catalog/blob/main/docs/operations.md).
The initial deployment uses one Node process, SQLite and private disk storage.

## Deployment and policy

The site workflow runs at `17 */6 * * *`, on main pushes, and manually. Collection
and build have read-only GitHub permissions; the deployment job alone can publish
Pages. Failed collection prevents deployment, preserving the previous site. This
schedule is a trigger, not a guaranteed refresh latency during large initial crawls.
GitHub search indexing and rate limits can delay collection.

Enable **Settings → Pages → Source: GitHub Actions**. Configure the public shared
API URL as repository variable `CATALOG_API_URL`. The service must ingest the
complete worlds snapshot through its authenticated administrative endpoint; a
static artifact upload alone does not update the durable service ledger. API URLs
are public configuration; administrative tokens must never use a `VITE_` variable.
Set secret `CATALOG_INGEST_TOKEN` to the service's worlds-scoped credential. The
shared publisher checks active policy, refuses redirects, and ingests catalog plus
releases through `/admin/snapshots/worlds`. Only a successful ingestion enables the
Pages deployment job. Without the API variable, CI produces a labeled local preview
artifact for review and does not deploy. Progress caches are saved even on failure.

Blacklists belong to the shared service's versioned policy. Publish rules separately
from catalog collection. Rules can target repository/owner IDs, a package directory,
a commit or an artifact. Topic matches and official/seed status do not override
them. The gateway checks current rules before issuing and serving a download,
including old tickets and cache hits. Neither this site nor the gateway controls
upstream GitHub links; Covel's native GitHub installer needs a separate integration.

The legacy repository-name exclusions in `catalog/config.json` are a collection
filter, not a replacement for current-ID service policy. `catalog/legacy/` preserves
old directory data for migration/reference only. Display text comes from manifests;
legacy compatibility text does not establish current host compatibility.

## Integrity and metrics

The service stores source refs and full commits, append-only package revisions,
package byte hashes, packager versions, and immutable artifact SHA256 separately.
Same-version release conflicts and moved tags retain old mappings. Development
snapshots are labeled as such. README content and downloadable files use the selected
revision; a default branch is not substituted for an old version.

GitHub Stars belong to the repository. Platform `downloadRequests` counts validated,
artifact-ready ticket issuance with retry idempotency; ticket reuse and Range reads
do not count again. It is not completed downloads or installations. Missing metrics
are null. Back up and restore the service database independently from build caches.

The current directory does not write Covel installation locks, replace installed
packages or migrate saves. Existing branch/pinned update rules, confirmation and
world-data preflight/sync remain described in [publishing](publishing.md).
