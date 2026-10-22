# Folia Plain 维护说明

Folia Plain 是 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 的独立分支。初始基线为 `f3a90708afbec884934d8bca16bbd0a35feeb6a7`（上游 0.7.21）。它与 Minecraft 服务端 [PaperMC/Folia](https://github.com/PaperMC/Folia) 无关。

## 这次改了什么

- 用几何图案替换群唱的内置角色头像、表情和预览封面，保留用户导入功能与资源 ID。
- 将内置预览歌词换为原创中性示例；中和加载提示，移除设置页图片彩蛋。
- 移除旧宣传图和含角色的演示截图；README 使用本分支的新素材。
- 统一应用名称、仓库、问题反馈、更新源、PWA 与桌面包身份。
- 修复继承的视频导出退出清理问题，避免文件句柄被重复关闭。
- 新桌面版本使用独立的应用数据目录；不自动读取或覆盖上游的桌面数据。浏览器设置仍按站点来源隔离，原有导入导出格式及存储键保持兼容。
- 将上游维护者专属的发布、AUR、自动分类和定时工作流移到 `.github/upstream-workflows/` 留作参考；只在 `.github/workflows/` 启用本分支的检查与手动构建。

这是默认素材和产品身份的整理。在线音乐分类、日文歌词支持、动画引擎 `animejs` 都照常工作；播放内容由用户选择。

## 本地开发

需要 Node.js 24 或更高版本。

```sh
npm ci
cp .env.example .env.local
npm run dev -- --host 127.0.0.1
```

Windows PowerShell 复制配置文件：

```powershell
Copy-Item .env.example .env.local
```

浏览器打开终端打印的本地地址。首次运行无需填入 AI 密钥即可查看界面、导入本地音乐与试用歌词预览。在线平台、AI 主题、跨设备同步需要分别配置对应服务。不要把 `.env.local`、登录凭据或个人音乐提交到仓库。

```sh
npm run typecheck
npm run test:unit
npm run build
npm run preview -- --host 127.0.0.1
```

`npm run dev` 只启动前端；在线平台服务不会自动随它启动。桌面开发入口为 `npm run dev:electron`，该模式通过 Electron 内嵌后端访问支持的平台。

## 打包和更新

- 新应用包名：`folia-plain`；桌面显示名：`Folia Plain`；应用 ID：`io.github.ithtelab.foliaplain`。
- 产品身份的唯一数据源在 `shared/productIdentity.json`，渲染进程、构建配置与 Electron 共用。
- 桌面自动更新只指向 `ithtelab/Folia-Plain`。新仓库尚无正式安装包时，不会回退到上游安装包。
- Windows Releases 提供 x64 NSIS 安装包、免安装 ZIP、自动更新元数据与 `SHA256SUMS.txt`。发布前检查打包资源、应用身份、隔离配置目录中的实际启动与 preload 接口。
- macOS 提供 arm64 / x64 DMG 和 ZIP，Linux 提供 x64 DEB、RPM 和便携 TAR.GZ。macOS 包未签名公证，首次打开见[说明](desktop/macos-app-damaged.md)。Web 部署 ZIP 包含单独构建的静态网站与[部署说明](../packaging/web/README.md)。
- 在 GitHub Actions 的 **Build desktop** 工作流手动选择平台可生成构建产物；默认不发布。勾选 `publish` 后，仅在构建和验证通过后发布本仓库 Release。版本来自 `package.json`，说明来自 `docs/releases/v<版本>.md`；同一版本不能重复创建。
- 已完成的构建可用 **Publish verified desktop build** 工作流直接发布，输入成功构建的运行 ID 和平台；它检查来源提交、校验文件与 GitHub 接收的摘要，支持续传同一提交的草稿，不覆盖已公开版本。
- 平台选择 `all` 时三系统并行构建；Web 包随 Windows 任务生成。发布时选择 `All`，逐个平台校验并合并附件，生成统一的校验文件后再公开。
- 本地 `npm run build:electron` 包含平台原生辅助工具与模型下载步骤，需要联网，并可能需要 Rust、CMake 和平台编译工具。Web 构建通过不等于桌面安装包已经通过验证。
- 上游技术文档中的 Realeco / Limo / Cielo、网盘、Docker Hub、AUR 和社区入口属于上游，不能当作本分支的下载地址。

## 更新上游

本分支使用独立的提交历史；`upstream` 远端指向原项目，`origin` 指向本分支。更新时按提交或文件审查上游差异，将需要的补丁应用为本分支的新提交，并在说明中记录上游提交或 PR 来源。

```sh
git fetch upstream
git switch -c sync/upstream
```

逐项审查素材目录、公共产品身份、更新源和工作流，应用补丁后执行检查。避免直接合并上游历史，以保持本分支的独立贡献统计；同时检查补丁是否重新引入角色素材。

## 开源来源

继续使用根目录的 AGPL-3.0 许可证。保留上游代码版权声明和来源记录，上游贡献者名单存档在 `docs/upstream/CONTRIBUTORS.md`；本分支新增的矢量素材同样按 AGPL-3.0 发布。第三方音乐、封面、歌词和服务仍归各自权利人所有。

上游的使用文档和外部依赖链接仍有参考价值。保留模型与 FFmpeg 的上游下载地址是运行依赖的来源说明，不代表将应用自身的更新交给上游。
