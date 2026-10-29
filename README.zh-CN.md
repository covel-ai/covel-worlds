# Covel 世界库

[Covel](https://github.com/ackness/covel) 的官方世界示例与自动采集的社区世界目录。

<!-- languages:start -->
[English](README.md) · **简体中文**
<!-- languages:end -->

## 安装

在支持 GitHub 世界安装的 Covel 版本中，进入 **设置 → 资源包**，输入 `https://github.com/covel-ai/covel-worlds`，预览并选择一个世界，检查内容后确认安装。多个世界请分别安装。下载遵循 Covel 的代理设置。较早版本可导入 ZIP，压缩包根目录应包含 `world.yaml`。

世界包包含剧情、提示词、设置及媒体，所需插件需另行安装与授权。目录收录不代表安全保证。详见[发布与更新](docs/publishing.md)。

## 世界目录

[浏览世界目录](https://covel-ai.github.io/covel-worlds/) · [浏览插件目录](https://covel-ai.github.io/covel-plugins/)

在公开仓库 About 区域的 Topics 中添加 **`covel-world` 或 `covel-worlds`**，即可自动发现；同时添加也只收录一次。采集器从 `world.yaml` 和翻译文件读取介绍，支持同仓多个世界。每六小时、主分支更新或手动触发时采集，GitHub 搜索索引可能存在延迟。

缺少有效元数据的仓库显示为待完善；归档仓库可筛选。普通社区仓库移除两个标签后退出，明确记录的历史迁移种子除外；公开性和黑名单规则始终生效。

仓库提供[灯塔岛](worlds/lantern-island/)和[发条集市](worlds/clockwork-market/)两个官方示例。页面介绍来自世界清单，不再维护 README 表格。

## 参与贡献

世界内容保留在作者自己的仓库，通过 Topics 自动加入，无需提交登记 PR。元数据要求见[贡献说明](CONTRIBUTING.zh-CN.md)。

使用 Node 26，运行 `npm ci` 安装依赖。`npm run generate` 从本地示例生成离线目录；`npm run collect` 查询 GitHub；`npm test` 检查公共模块和世界适配器；`npm run build` 构建网站。服务 API 配置、部署与公共代码升级见[目录运维说明](docs/catalog.md)。

世界与插件目录共用同一套有版本的采集模块、UI 和服务协议。[共同规范](vendor/catalog-kit/SPEC.md) · [世界创作技能](.agents/skills/create-world/SKILL.md)。
