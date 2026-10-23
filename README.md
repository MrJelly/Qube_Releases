# 轻匣下载

[下载最新版本](https://github.com/MrJelly/Qube_Releases/releases/latest) · [源码](https://github.com/MrJelly/Qube)

主程序、功能插件、共享引擎与对应源码放在 Releases 附件中。

## 安装

1. 下载并运行 `qingxia-windows-x64.exe`。
2. 点击右上角拼图，多选导入需要的 `.qxp` 插件与 `.qxe` 引擎包。
3. 插件可以单独启停和卸载，个人数据保留。

| 功能 | 插件 | 引擎 |
|---|---|---|
| 取色 | color.qxp | 无 |
| 截图 | shot.qxp | OCR 需要 ocr.qxe |
| 互传 | transfer.qxp | 无 |
| 热榜 | hot.qxp | 无；内容需要联网 |
| 预览 | preview.qxp | 资源已包含在插件中 |
| 下载 | video.qxp | download.qxe（视频解析另需 media.qxe） |
| 录屏 | record.qxp | media.qxe、audio.qxe |
| 转换 | convert.qxp | convert.qxe |

主程序只包含基础框架，功能按需安装。点击右上角拼图 → 在线下载，可安装本仓库最新公开 Release 的官方插件，并自动补齐缺少的引擎；也支持本地包安装。下载和录屏共享媒体引擎，不必重复安装。

对应源码为 `qingxia-source.zip`，许可文本为 `licenses.zip`；各插件也保留所需许可。文件校验见 `SHA256SUMS.txt`，`catalog.json` 为签名发布清单。

## 维护发布

将代码推送到源码仓库的 main 后，GitHub Actions 自动构建主程序、插件和共享引擎，核对上传附件的 SHA-256，再公开发布 Release 并设为最新版，验证成功后删除旧版 Release 和标签。已发布的版本自动跳过，发布新版前需提升版本号。无需手动运行工作流或发布草稿。一次性配置见源码仓库的“仓库与发布.md”。

在源码项目运行 `npm run prepare-release`，更新本仓库元数据和本地附件。附件位于 `release-assets/current`，此目录不提交到 Git。

需要手动上传本地构建产物时，可双击 `upload-release.cmd`。首次根据提示登录 GitHub，脚本校验附件并上传草稿；由维护者检查后点击发布。

`node upload-release.mjs --check` 只检查本地文件，不联网或上传。发布工具、登录信息和本机配置均不进入 Git 历史。
