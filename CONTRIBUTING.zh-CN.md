# 参与贡献

将世界发布在自己的公开 GitHub 仓库，在 About 设置的 Topics 中添加 **`covel-world` 或 `covel-worlds`**。任意一个即可被自动发现，无需提交登记 PR 或 JSON 条目。同仓可以包含多个世界目录。

每个世界需要有效的 `world.yaml` 和 `WORLD.md`，提供 ID、名称、简介、版本、默认及支持的语言、作者和许可证。翻译写在 `world.<locale>.yaml`；可参考 `worlds/` 的示例。媒体和第三方内容注明各自许可；官方身份只由目录配置中的仓库名单决定。

世界使用独立 ID 与 `world.yaml` 版本。执行代码作为插件单独发布。不要提交密钥、个人导出、验收过程日志或未经证实的质量声明。世界介绍关注玩法、依赖、安装和限制。

发布前，在目标 Covel 版本的仓库中运行 `pnpm validate:world --strict <世界目录>`，在世界 README 说明兼容性和限制。目录收录不代表安全或兼容认证。参见[发布说明](docs/publishing.md)。

采集每六小时触发；大型目录的断点续跑和 GitHub 搜索索引可能需要更久。资料错误的条目显示为待完善并记录诊断；移除两个标签即可退出，归档仓库默认隐藏。错误条目或内容问题可通过 [GitHub Issues](https://github.com/covel-ai/covel-worlds/issues) 反馈。

修改目录自身时使用 Node 26，运行 `npm ci`、`npm run generate`、`npm test` 和 `npm run build`。共用的采集、UI 和服务源码在 `covel-plugins` 的公共 kit 维护；这里固定 commit 同步，不能独立修改 vendor 副本。参见[目录运维说明](docs/catalog.md)。
