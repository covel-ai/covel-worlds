# Publishing and updates / 发布与更新

A world directory contains `world.yaml`, an English fallback `WORLD.md`, optional `WORLD.<locale>.md`, and referenced data/media files. All paths remain inside the package. No build/install scripts run during import.

世界包目录包含 manifest、默认英文设定、可选语言文件，以及引用的数据和媒体。路径不可越出包目录。导入时不会执行构建或安装脚本。

Each world has its own version, independent of Covel. Branch installs track that branch; repository URLs track the default branch. Tags/commits are pinned. To choose another tag, paste the same repository and world directory with a new ref, for example `https://github.com/covel-ai/covel-worlds/tree/lantern-island%2Fv1.0.0/worlds/lantern-island` after publishing that tag. This is a URL example, not an existing release.

每个世界独立版本化。分支安装跟踪分支，仓库链接跟踪默认分支；标签和 commit 固定版本。切换版本需提供同一仓库、同一目录的新 ref 链接。

Check updates in Settings → Packages. Compare versions, commits and changed files; consent stages an update for backend restart. Files with local changes and worlds edited in Covel are protected from replacement. Export and resolve changes first. Update application preserves saves and overrides; it does not silently synchronize existing sessions. Use world-data preflight/sync to review imported data changes and conflicts separately. A failed file promotion restores the previous package; this does not undo gameplay or data migrations.

在设置中检查更新，查看版本、commit 与文件变化，确认后将在后端重启时应用。本地修改的文件及在 Covel 中编辑过的世界会阻止覆盖，请先导出并处理修改。更新保留存档与 overrides，不会静默同步现有会话；数据变化和冲突由 world-data preflight/sync 单独处理。文件替换失败可恢复旧包，不代表可以撤销玩法或数据迁移。

For complete runtime validation, use a matching Covel checkout's `worldManifestSchema`, `loadSingleWorld` and world-data preflight. This repository's checks validate registry consistency and the shipped examples' portable file layout; they do not replace gameplay verification or compatibility tests. Record test evidence in PRs, not promotional descriptions.
