# Folia Plain Web 部署包 / Web deployment

`dist/` 是已构建的网站，部署到站点根路径。不要直接双击 HTML，也不要把 Web 包当作桌面安装器。

Serve `dist/` at the root of an HTTP(S) website. Do not open the HTML directly from disk.

## 运行 / Serve

安装 Node.js 24+ 后，在解压目录运行 `npx serve dist -l 8080`，浏览器打开 `http://localhost:8080`。生产部署可用 Nginx 或其他静态网站服务器，参考随包的 `nginx.conf.example`。本地导入和歌词预览可以先体验；文件夹访问等浏览器能力需要 HTTPS 或 localhost。

With Node.js 24+, run `npx serve dist -l 8080`, then open `http://localhost:8080`. For production, use a static web server such as Nginx. Folder access and similar browser capabilities require HTTPS or localhost.

## 在线音乐与 AI / Online music and AI

发布包不包含音乐后端、账号或 API 密钥。预构建页面按同源 `/netease/`、`/qq/`、`/kugou/` 访问音乐接口；服务端按示例配置反向代理。`/api/` 对接 Folia Web API，歌词代理及 AI 等能力需要对应服务。单独托管静态文件不会自动启动这些接口。

The prebuilt frontend expects same-origin `/netease/`, `/qq/` and `/kugou/` music backends and `/api/` for Folia Web API features. Configure reverse proxies to your services; static hosting alone does not provide them. No accounts or API secrets are bundled.

完整 Web 堆栈可从本项目源码运行：

https://github.com/ithtelab/Folia-Plain/blob/main/deploy/docker/README.md

需要不同的接口地址时，从对应版本源码配置 `.env.local` 并重新运行 `npm ci`、`npm run build`。不要把秘密写入 `VITE_*` 变量，它们会进入浏览器文件。

To use different API paths, build from source with your `.env.local`. Never put secrets in `VITE_*` variables: they become public browser assets.

Windows 桌面版的 GPU 开关、桌面歌词、系统托盘及内置音乐后端不属于此静态包。macOS 和 Linux 桌面安装包在同一 Release 单独提供。

Desktop integration and bundled desktop backends are not part of this static archive. Desktop packages are separate release attachments.

源码与反馈 / Source and issues: https://github.com/ithtelab/Folia-Plain
