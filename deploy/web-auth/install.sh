#!/usr/bin/env bash
# 安装 Web 访问密钥门：系统用户、认证服务、systemd 单元。反向代理配置仍需按 nginx.conf.example 手动接入。
set -euo pipefail

SITE="${1:-Folia}"
APP_DIR=/opt/folia-auth
ENV_DIR=/etc/folia-auth
SERVICE_USER=folia-auth
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [ "$(id -u)" -ne 0 ]; then
    echo "请用 root 运行：sudo ./install.sh music.example.com" >&2
    exit 1
fi

if [ -z "$NODE_BIN" ]; then
    echo "找不到 node，请先安装 Node.js 20 或更高版本" >&2
    exit 1
fi

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
    echo "已创建系统用户 $SERVICE_USER"
fi

mkdir -p "$APP_DIR" "$ENV_DIR"
install -m 755 -o root -g root "$(dirname "$0")/server.mjs" "$APP_DIR/server.mjs"

if [ -f "$ENV_DIR/env" ]; then
    echo "$ENV_DIR/env 已存在，保留原有密钥，不覆盖"
else
    printf '访问密钥（输入时不回显）：'
    read -r -s ACCESS_SECRET
    printf '\n'
    if [ -z "$ACCESS_SECRET" ]; then
        echo "访问密钥不能为空" >&2
        exit 1
    fi
    SESSION_KEY="$("$NODE_BIN" -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
    umask 077
    cat > "$ENV_DIR/env" <<EOF
AUTH_SECRET=$ACCESS_SECRET
AUTH_SESSION_KEY=$SESSION_KEY
AUTH_SITE=$SITE
AUTH_PORT=8790
EOF
    chmod 600 "$ENV_DIR/env"
    echo "已写入 $ENV_DIR/env"
fi

sed "s|__NODE_BIN__|$NODE_BIN|" "$(dirname "$0")/folia-auth.service" > /etc/systemd/system/folia-auth.service
chmod 644 /etc/systemd/system/folia-auth.service

systemctl daemon-reload
systemctl enable folia-auth >/dev/null
systemctl restart folia-auth

sleep 1
if curl -fsS -o /dev/null http://127.0.0.1:8790/login; then
    echo "认证服务已启动：http://127.0.0.1:8790"
else
    echo "认证服务未就绪，请查看：journalctl -u folia-auth -n 50" >&2
    exit 1
fi

cat <<'EOF'

下一步：把 nginx.conf.example 里的域名、证书路径与站点目录换成自己的，
接入 auth_request 后执行 nginx -t && nginx -s reload。
改密钥只需编辑 /etc/folia-auth/env 并 systemctl restart folia-auth。
EOF
