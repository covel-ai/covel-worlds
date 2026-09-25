# Covel 世界库

[Covel](https://github.com/ackness/covel) 的官方世界示例与社区世界目录。

<!-- languages:start -->
[English](README.md) · **简体中文**
<!-- languages:end -->

## 安装

在支持 GitHub 世界安装的 Covel 版本中，进入 **设置 → 资源包**，输入 `https://github.com/covel-ai/covel-worlds`，预览并选择一个世界，检查内容后确认安装。多个世界请分别安装。下载遵循 Covel 的代理设置。较早版本可导入 ZIP，压缩包根目录应包含 `world.yaml`。

世界包包含剧情、提示词、设置及媒体，所需插件需另行安装与授权。目录收录不代表安全保证。详见[发布与更新](docs/publishing.md)。

## 世界目录

官方示例优先展示，独立维护的社区世界单独列出。

<!-- registry:start -->
### 官方世界

| 世界 | 功能 | 作者 | Covel 版本 | 状态 | 演示 | 安装来源 |
| --- | --- | --- | --- | --- | --- | --- |
| [发条集市](https://github.com/covel-ai/covel-worlds) | 包含可移植知识条目与明确插件策略的双语世界数据示例。 | Covel | &gt;=0.0.39 | 可用 | [演示](https://github.com/covel-ai/covel-worlds/tree/main/worlds/clockwork-market) | [安装来源](https://github.com/covel-ai/covel-worlds/tree/main/worlds/clockwork-market) |
| [灯塔岛](https://github.com/covel-ai/covel-worlds) | 仅使用内置叙事插件的双语海岛谜案，展示最小世界包。 | Covel | &gt;=0.0.39 | 可用 | [演示](https://github.com/covel-ai/covel-worlds/tree/main/worlds/lantern-island) | [安装来源](https://github.com/covel-ai/covel-worlds/tree/main/worlds/lantern-island) |

### 社区世界

暂无收录的世界。
<!-- registry:end -->

## 参与贡献

通过 PR 向 `registry/worlds/` 添加 JSON 条目，世界内容可以保留在作者自己的仓库。参见[贡献说明](CONTRIBUTING.zh-CN.md)。结构化条目可用于后续网页目录，README 表格由条目生成。

新增语言时，在 `registry/locales.json` 添加文案和文件名，创建含 language 与 registry 标记的 README，再运行 `npm run generate`。未翻译的条目回退英文。

先运行 `npm ci` 安装校验工具，再运行 `npm test` 检查目录与示例。[世界创作技能](.agents/skills/create-world/SKILL.md) 位于 `.agents/skills/create-world`。
