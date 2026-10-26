// Folia 访问网关：用户名 + 密钥登录，签发 HMAC 签名 Cookie；由 nginx auth_request 调用
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.AUTH_PORT || 8790);
const SECRET = process.env.AUTH_SECRET || '';
const SIGN_KEY = process.env.AUTH_SESSION_KEY || '';
const SITE = process.env.AUTH_SITE || 'Folia';

const COOKIE_NAME = 'folia_session';
const TTL_REMEMBER = 30 * 24 * 3600;
const TTL_DEFAULT = 12 * 3600;
const MAX_FAILS = 8;
const FAIL_WINDOW = 10 * 60 * 1000;
const MAX_BODY = 4096;

if (!SECRET || !SIGN_KEY) {
    console.error('[folia-auth] 缺少 AUTH_SECRET 或 AUTH_SESSION_KEY');
    process.exit(1);
}

const fails = new Map();

function hmac(data) {
    return crypto.createHmac('sha256', SIGN_KEY).update(data).digest('base64url');
}

function issueCookie(ttl) {
    const exp = Math.floor(Date.now() / 1000) + ttl;
    return `${exp}.${hmac(String(exp))}`;
}

function verifyCookie(value) {
    if (typeof value !== 'string') return false;
    const idx = value.lastIndexOf('.');
    if (idx <= 0) return false;
    const exp = value.slice(0, idx);
    const sig = value.slice(idx + 1);
    if (!/^\d{9,12}$/.test(exp)) return false;
    const expected = hmac(exp);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;
    return Number(exp) * 1000 > Date.now();
}

function safeEqual(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) {
        crypto.timingSafeEqual(ba, ba);
        return false;
    }
    return crypto.timingSafeEqual(ba, bb);
}

function readCookie(header, name) {
    if (!header) return null;
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        if (part.slice(0, eq).trim() !== name) continue;
        try {
            return decodeURIComponent(part.slice(eq + 1).trim());
        } catch {
            return null;
        }
    }
    return null;
}

function safeNext(next) {
    if (typeof next !== 'string' || !next.startsWith('/')) return '/';
    if (next.startsWith('//') || next.startsWith('/\\')) return '/';
    if (next.startsWith('/login') || next.startsWith('/logout')) return '/';
    return next;
}

function readBody(req) {
    return new Promise((resolve) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY) {
                req.destroy();
                resolve('');
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', () => resolve(''));
    });
}

function clientIp(req) {
    const forwarded = req.headers['x-real-ip'];
    if (typeof forwarded === 'string' && forwarded) return forwarded;
    return req.socket.remoteAddress || 'unknown';
}

function isBlocked(ip) {
    const rec = fails.get(ip);
    if (!rec) return false;
    if (Date.now() - rec.first > FAIL_WINDOW) {
        fails.delete(ip);
        return false;
    }
    return rec.count >= MAX_FAILS;
}

function recordFail(ip) {
    const now = Date.now();
    const rec = fails.get(ip);
    if (!rec || now - rec.first > FAIL_WINDOW) {
        fails.set(ip, { count: 1, first: now });
    } else {
        rec.count += 1;
    }
    if (fails.size > 5000) fails.clear();
}

function clearFails(ip) {
    fails.delete(ip);
}

function html(res, status, body, extraHeaders = {}) {
    res.writeHead(status, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        ...extraHeaders,
    });
    res.end(body);
}

function redirect(res, location, headers = {}) {
    res.writeHead(302, {
        Location: location,
        'Cache-Control': 'no-store',
        ...headers,
    });
    res.end();
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[char]);
}

function page({ error = '', next = '/', remember = true }) {
    const errorBlock = error
        ? `<p class="error" role="alert">${escapeHtml(error)}</p>`
        : '';
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>登录 · ${escapeHtml(SITE)}</title>
<style>
:root {
    --bg: #0b0c0f;
    --card: rgba(23, 25, 30, .82);
    --line: rgba(255, 255, 255, .09);
    --line-strong: rgba(255, 255, 255, .16);
    --text: #e9ecf1;
    --muted: #8b93a1;
    --danger: #ff9090;
}
* { box-sizing: border-box; }
html, body { height: 100%; overflow-x: hidden; }
body {
    margin: 0;
    padding: 24px;
    display: grid;
    place-items: center;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
}
body::before {
    content: "";
    position: fixed;
    inset: -25%;
    z-index: -1;
    background:
        radial-gradient(45% 45% at 22% 16%, rgba(94, 120, 160, .32), transparent 70%),
        radial-gradient(42% 42% at 80% 80%, rgba(122, 96, 158, .26), transparent 70%);
    filter: blur(24px);
    animation: drift 26s ease-in-out infinite alternate;
}
@keyframes drift {
    from { transform: translate3d(-1.5%, -1%, 0) }
    to { transform: translate3d(1.5%, 1.5%, 0) }
}
.card {
    width: 100%;
    max-width: 370px;
    padding: 38px 30px 30px;
    border: 1px solid var(--line);
    border-radius: 22px;
    background: var(--card);
    box-shadow: 0 30px 80px rgba(0, 0, 0, .55);
    backdrop-filter: blur(18px) saturate(125%);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
    animation: rise .45s cubic-bezier(.2, .8, .2, 1);
}
@keyframes rise {
    from { opacity: 0; transform: translateY(12px) }
    to { opacity: 1; transform: none }
}
.mark {
    width: 46px;
    height: 46px;
    margin: 0 auto 18px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line-strong);
    border-radius: 14px;
    background: linear-gradient(160deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .02));
}
.mark svg { display: block; }
h1 {
    margin: 0;
    font-size: 21px;
    font-weight: 600;
    letter-spacing: .12em;
    text-align: center;
}
.sub {
    margin: 8px 0 26px;
    font-size: 12.5px;
    color: var(--muted);
    letter-spacing: .18em;
    text-align: center;
}
label.field-label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: .06em;
}
.field { position: relative; }
input[type="password"], input[type="text"] {
    width: 100%;
    height: 46px;
    padding: 0 46px 0 14px;
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    background: rgba(0, 0, 0, .32);
    color: var(--text);
    font-size: 14px;
    letter-spacing: .04em;
    outline: none;
    transition: border-color .16s, box-shadow .16s;
}
input[type="password"]:focus, input[type="text"]:focus {
    border-color: rgba(180, 200, 230, .55);
    box-shadow: 0 0 0 3px rgba(130, 160, 210, .16);
}
.reveal {
    position: absolute;
    top: 0;
    right: 0;
    width: 44px;
    height: 46px;
    display: grid;
    place-items: center;
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    border-radius: 0 12px 12px 0;
}
.reveal:hover { color: var(--text); }
.remember {
    position: relative;
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 16px 0 0;
    font-size: 12.5px;
    color: var(--muted);
    cursor: pointer;
    user-select: none;
}
.remember input {
    position: absolute;
    left: 0;
    top: 50%;
    width: 16px;
    height: 16px;
    margin: 0;
    transform: translateY(-50%);
    opacity: 0;
    cursor: pointer;
}
.remember .box {
    position: relative;
    flex: none;
    width: 16px;
    height: 16px;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: rgba(0, 0, 0, .34);
    transition: background .16s, border-color .16s;
}
.remember input:checked + .box {
    border-color: rgba(190, 210, 235, .75);
    background: linear-gradient(180deg, #eef2f7, #cfd7e3);
}
.remember input:checked + .box::after {
    content: "";
    position: absolute;
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid #12141a;
    border-width: 0 2px 2px 0;
    transform: rotate(42deg);
}
.remember input:focus-visible + .box {
    box-shadow: 0 0 0 3px rgba(130, 160, 210, .28);
}
.submit {
    width: 100%;
    height: 46px;
    margin-top: 20px;
    border: 0;
    border-radius: 12px;
    background: linear-gradient(180deg, #eef2f7, #cfd7e3);
    color: #12141a;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: .06em;
    cursor: pointer;
    transition: filter .16s, transform .12s;
}
.submit:hover { filter: brightness(1.05); }
.submit:active { transform: scale(.987); }
.error {
    margin: 0 0 16px;
    padding: 10px 12px;
    border: 1px solid rgba(255, 110, 110, .26);
    border-radius: 10px;
    background: rgba(255, 110, 110, .1);
    color: var(--danger);
    font-size: 12.5px;
    line-height: 1.5;
}
.foot {
    margin: 22px 0 0;
    font-size: 11.5px;
    color: rgba(139, 147, 161, .72);
    text-align: center;
    letter-spacing: .04em;
}
@media (max-width: 420px) {
    body { padding: 16px; }
    .card { padding: 32px 22px 26px; border-radius: 18px; }
    /* iOS 上 16px 以下的输入框会触发自动放大 */
    input[type="password"], input[type="text"] { font-size: 16px; }
}
</style>
</head>
<body>
<main class="card">
    <div class="mark" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dfe6ef" stroke-width="1.7" stroke-linecap="round">
            <path d="M4 12h2.2M8.6 7.5v9M12 4.8v14.4M15.4 7.5v9M19.8 12h.2"/>
        </svg>
    </div>
    <h1>${escapeHtml(SITE)}</h1>
    <p class="sub">歌词入境 · 听歌归简</p>
    ${errorBlock}
    <form method="post" action="/login" autocomplete="on">
        <input type="hidden" name="next" value="${escapeHtml(next)}">
        <label class="field-label" for="key">访问密钥</label>
        <div class="field">
            <input id="key" name="key" type="password" autocomplete="current-password" autofocus required spellcheck="false" placeholder="输入管理员密钥">
            <button class="reveal" type="button" id="reveal" aria-label="显示密钥">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1.8 12S5.4 5.5 12 5.5 22.2 12 22.2 12 18.6 18.5 12 18.5 1.8 12 1.8 12Z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </button>
        </div>
        <label class="remember">
            <input type="checkbox" name="remember" value="1"${remember ? ' checked' : ''}>
            <span class="box" aria-hidden="true"></span>
            保持登录 30 天
        </label>
        <button class="submit" type="submit">进入</button>
    </form>
    <p class="foot">私有实例，仅限管理员访问</p>
</main>
<script>
(function () {
    var btn = document.getElementById('reveal');
    var input = document.getElementById('key');
    btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? '隐藏密钥' : '显示密钥');
        input.focus();
    });
})();
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'https://localhost');
    const path = url.pathname;
    const ip = clientIp(req);
    const cookie = readCookie(req.headers.cookie, COOKIE_NAME);
    const authed = verifyCookie(cookie);

    if (path === '/verify') {
        res.writeHead(authed ? 200 : 401, {
            'Cache-Control': 'no-store',
            'X-Auth-User': authed ? 'admin' : '',
        });
        res.end(authed ? 'ok' : 'no');
        return;
    }

    if (path === '/login' && req.method === 'GET') {
        if (authed) {
            redirect(res, safeNext(url.searchParams.get('next')));
            return;
        }
        html(res, 200, page({ next: safeNext(url.searchParams.get('next')) }));
        return;
    }

    if (path === '/login' && req.method === 'POST') {
        if (isBlocked(ip)) {
            html(res, 429, page({ error: '尝试次数过多，请 10 分钟后再试', next: '/' }), {
                'Retry-After': '600',
            });
            return;
        }
        const body = await readBody(req);
        const form = new URLSearchParams(body);
        const key = form.get('key') || '';
        const next = safeNext(form.get('next'));
        const remember = form.get('remember') === '1';
        if (safeEqual(key, SECRET)) {
            clearFails(ip);
            const ttl = remember ? TTL_REMEMBER : TTL_DEFAULT;
            const value = issueCookie(ttl);
            console.log(`[folia-auth] 登录成功 ${ip} ttl=${ttl}s`);
            redirect(res, next, {
                'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}`,
            });
            return;
        }
        recordFail(ip);
        console.warn(`[folia-auth] 登录失败 ${ip}`);
        html(res, 403, page({ error: '密钥不正确', next, remember }));
        return;
    }

    if (path === '/logout') {
        redirect(res, '/login', {
            'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[folia-auth] listening on 127.0.0.1:${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 3000);
    });
}
