#!/usr/bin/env bash
# 在全新的 Ubuntu 22.04 / 24.04 云服务器上运行一次：
#   sudo bash server-setup.sh 你的域名
# 会安装 Node.js 24 和 Caddy，创建运行账号、数据目录、systemd 服务和 HTTPS 配置。
# 重复运行是安全的：已经装好的部分会跳过或覆盖成同样的配置，不会动照片数据。
set -euo pipefail

# 不填域名时先用 http://服务器IP 访问，用于域名审核期间的测试；域名好了再带上域名重新运行一次。
DOMAIN="${1:-}"
SITE="${DOMAIN:-:80}"
if [[ $EUID -ne 0 ]]; then
  echo "请用 sudo 运行" >&2
  exit 1
fi

APP_DIR=/opt/photo-share/app
DATA_DIR=/var/lib/photo-share

echo "== 安装基础工具"
apt-get update
apt-get install -y curl gnupg ca-certificates debian-keyring debian-archive-keyring apt-transport-https

echo "== 安装 Node.js 24"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "== 安装 Caddy（自动申请和续期 HTTPS 证书）"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi
caddy version

echo "== 创建运行账号和目录"
id trip >/dev/null 2>&1 || useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin trip
mkdir -p "$APP_DIR" "$DATA_DIR"
chown -R trip:trip "$DATA_DIR"
chmod 700 "$DATA_DIR"

echo "== 写入 systemd 服务"
cat > /etc/systemd/system/photo-share.service <<EOF
[Unit]
Description=旅行本照片共享
After=network.target

[Service]
User=trip
Group=trip
WorkingDirectory=$APP_DIR
Environment=HOST=127.0.0.1
Environment=PORT=8787
Environment=DATA_DIR=$DATA_DIR
ExecStart=/usr/bin/node server/main.ts
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable photo-share

echo "== 写入 Caddy 配置"
cat > /etc/caddy/Caddyfile <<EOF
$SITE {
	# 不开 gzip：照片本身已经压缩过，开了还可能让实时通知（SSE）被缓冲延迟
	reverse_proxy 127.0.0.1:8787
}
EOF
systemctl reload caddy || systemctl restart caddy

echo
echo "完成。下一步在你自己的电脑上运行 deploy/upload.ps1 上传代码。"
if [[ -n "$DOMAIN" ]]; then
  echo "如果 https://$DOMAIN 打不开，检查：域名解析是否指向本机公网 IP，云控制台防火墙是否放行 80 和 443 端口。"
else
  echo "现在没有域名，用 http://服务器公网IP 访问。这是不加密的临时地址，只用来测试，PIN 别用常用密码。"
  echo "域名审核通过并加好解析后，运行 sudo bash server-setup.sh 你的域名，就会切换到 HTTPS。"
fi
