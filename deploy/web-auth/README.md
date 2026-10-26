# Folia Plain Web 访问密钥门

给自托管的 Web 部署加一个登录页：浏览器必须先输入管理员密钥才能进入，静态资源与在线音乐代理一并通过校验。

本目录提供反向代理侧的完整实现，不修改前端源码，`npm run build` 之后仍然生效。

## 适用范围

| 运行方式 | 是否受本方案影响 | 原因 |
| --- | --- | --- |
| Web（浏览器、PWA 安装） | 需要密钥 | 请求经过你自己的反向代理 |
| 桌面版（Electron，Windows / macOS / Linux） | 不受影响 | 直连各平台接口，不经过本站点 |

桌面版没有要用本方案的理由：它的在线音乐由主进程内嵌的后端提供，既没有共享的 Web 入口，也不需要浏览器 Cookie。本目录只解决「Web 站点对外开放、谁都能打开并播放」的问题。

## 架构

```text
浏览器 ──TLS──> 反向代理 ─┬─ auth_request /_auth/verify ──> folia-auth (127.0.0.1:8790)
                          │        200 放行；401 跳转登录页
                          ├─ /login, /logout ─────────────> folia-auth
                          ├─ /netease/ ──────────────────> 在线音乐 API
                          └─ / ──────────────────────────> dist 静态文件
```

- 认证服务是一个无依赖的 Node 脚本，只监听回环地址，由 systemd 托管。
- 会话是 `exp.HMAC-SHA256(exp)` 形式的 Cookie，`HttpOnly; Secure; SameSite=Lax`；勾选「保持登录」有效期 30 天，否则 12 小时。
- 同一 IP 十分钟内失败八次后返回 429，锁定十分钟。
- 密钥与签名密钥由 systemd 环境文件注入，进程用户无文件读权限。

## 部署

要求已经用 HTTPS 对外提供 `dist`。下面以 Ubuntu 24.04、nginx 1.24、站点目录 `/var/www/folia` 为例。

### 1. 安装认证服务

```sh
sudo ./install.sh music.example.com
```

脚本会创建系统用户、复制服务、生成随机签名密钥、提示输入访问密钥、安装并启动 systemd 单元。逐项说明见 `install.sh` 内的输出；也可以按下面的步骤手动部署。

手动部署时：

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin folia-auth
sudo mkdir -p /opt/folia-auth /etc/folia-auth
sudo cp server.mjs /opt/folia-auth/server.mjs
sudo cp folia-auth.env.example /etc/folia-auth/env
sudo chmod 600 /etc/folia-auth/env
sudo cp folia-auth.service /etc/systemd/system/folia-auth.service
sudo systemctl daemon-reload
sudo systemctl enable --now folia-auth
```

改完 `/etc/folia-auth/env` 后执行 `sudo systemctl restart folia-auth`，不需要动反向代理。

### 2. 配置反向代理

把 `nginx.conf.example` 里的域名、证书路径、站点目录换成自己的，放进 `sites-available` 并启用。示例包含三处容易漏掉的处理：

- **80 与 443 分成两个 server 块。** 80 只保留 ACME 验证与 301 跳转，避免凭据走明文。
- **ACME 路径在 80 和 443 都放行 `auth_request`。** 启用 CDN 强制 HTTPS 后，证书续签会走 443，只在 80 放行会让续签失败。
- **拦截 PWA 的 Service Worker。** 见下一节。

改完先 `nginx -t`，再重载。

### 3. 构建前端

与普通 Web 部署一致：

```sh
npm ci
cp .env.example .env.local
npm run build
```

`.env.local` 里的 `VITE_NETEASE_API_BASE` 指向本站的 `/netease`，同源请求会带上会话 Cookie。

### 4. 验证

```sh
curl -o /dev/null -w '%{http_code}\n' https://music.example.com/            # 302 到登录页
curl -o /dev/null -w '%{http_code}\n' https://music.example.com/login       # 200
curl -o /dev/null -w '%{http_code}\n' -d 'key=错误' https://music.example.com/login  # 403
curl -o /dev/null -w '%{http_code}\n' https://music.example.com/netease/   # 401 JSON
```

登录一次后再用 Cookie 访问 `/` 与 `/netease/`，应当都是 200。如果有 CDN，还要确认 `/sw.js` 与 `/registerSW.js` 没有被缓存成构建产物，见下一节。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `AUTH_SECRET` | 是 | 登录密钥 |
| `AUTH_SESSION_KEY` | 是 | Cookie 签名密钥，更换后所有已登录会话立即失效 |
| `AUTH_SITE` | 否 | 登录页标题，默认 `Folia` |
| `AUTH_PORT` | 否 | 监听端口，默认 `8790` |

失败次数上限、锁定时间在 `server.mjs` 顶部的常量里调整。

## PWA 离线缓存会绕过访问控制

这是本方案唯一需要特别处理的地方，容易在部署后表现为「登录后在线音乐全部 401」。

Folia 的 Web 构建包含 `vite-plugin-pwa` 生成的 Service Worker，`sw.js` 预缓存了 `index.html`，并注册 `NavigationRoute(createHandlerBoundToURL('index.html'))`。结果是**导航请求由 Service Worker 直接从缓存返回，完全不经过网络**，浏览器因此从未建立过会话 Cookie；页面能打开，但所有 `/netease` 请求都被判定未登录。

`nginx.conf.example` 用三处处理让它失效：

1. `location = /sw.js` 返回自注销脚本：注销注册、清空 `caches`、通知客户端刷新。
2. `location = /registerSW.js` 返回空脚本，不再注册新的 Service Worker。
3. `location /` 用 `sub_filter` 移除注册标签，并在 `</body>` 前注入一次注销调用，作为兜底。

代价是 Web 端失去离线可用能力。对需要访问控制的私有部署来说，这与「只有管理员能打开」直接冲突，取舍上优先访问控制。

如果前面挂了 CDN，注意 `sw.js` 这类静态扩展名可能已经被缓存（Cloudflare 默认按扩展名缓存，且遵守源站 30 天的 `max-age`）。部署或调整之后先清一次 CDN 缓存，否则客户端拿到的仍是旧的 Worker，看不到自注销脚本。

## 已知限制

- **登出只有 URL。** 访问 `/logout` 会清除 Cookie 并回到登录页；前端目前没有登出入口，需要的话可以自行加一个按钮。
- **限速以反向代理看到的来源地址为准。** 前面有 CDN 时拿到的是 CDN 节点地址。要让限速和日志落到真实客户端 IP，按 CDN 厂商的地址段配置 `set_real_ip_from`，不要让任意来源都能伪造转发头。
- **PWA 安装版需要重新安装一次。** Service Worker 注销后，已安装的桌面/主屏幕入口会退回普通网页行为。
- 本目录只处理 Web 入口的访问控制，不替代平台自己的登录与账号权限。
