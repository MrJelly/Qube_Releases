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
| 下载 | video.qxp | media.qxe |
| 录屏 | record.qxp | media.qxe、audio.qxe |
| 转换 | convert.qxp | convert.qxe |

主程序只包含基础框架，功能按需安装；当前尚不提供在线自动安装。下载和录屏共享媒体引擎，不必重复安装。

对应源码为 `qingxia-source.zip`，许可文本为 `licenses.zip`；各插件也保留所需许可。文件校验见 `SHA256SUMS.txt`，`catalog.json` 为签名发布清单。

## 维护发布

推荐在源码仓库执行 `release.cmd` 或 `npm run release`，由 GitHub Actions 构建主程序、插件和共享引擎，更新本仓库并上传 Release 草稿。维护者检查后发布。一次性配置见源码仓库的“仓库与发布.md”。

在源码项目运行 `npm run prepare-release`，更新本仓库元数据和本地附件。附件位于 `release-assets/版本号`，此目录不提交到 Git。

需要手动上传本地构建产物时，可双击 `upload-release.cmd`。首次根据提示登录 GitHub，脚本校验附件并上传草稿；由维护者检查后点击发布。

`node upload-release.mjs --check` 只检查本地文件，不联网或上传。发布工具、登录信息和本机配置均不进入 Git 历史。
