# 参与贡献

参照已有条目与 `registry/schema.json`，新增 `registry/worlds/<id>.json`。社区投稿使用 `maintainer: community`；`official` 由 Covel 团队用于自己维护的世界。提供公开仓库、准确的目录与 ref、介绍、作者、许可证、语言和兼容 Covel 版本；尚未确认兼容性时填 `covelVersion: null`。媒体与第三方内容应注明各自来源和许可。

世界使用独立 ID 与 `world.yaml` 版本。执行代码作为插件单独发布。不要提交密钥、个人导出、验收过程日志或未经证实的质量声明。世界介绍关注玩法、依赖、安装和限制。

运行 `npm run generate` 与 `npm test`，提交条目和更新后的 README。PR 中写明内容与验证结果。收录不代表安全认证。参见[发布说明](docs/publishing.md)。
