#!/usr/bin/env bash
# Build the production image locally and ship it to the server over SSH.
#
#   scripts/deploy.sh            # build, upload, restart the container, reload Nginx
#   SKIP_BUILD=1 scripts/deploy.sh
#
# The server (Tehran) can't reach the npm registry or Docker Hub's CDN, so nothing is built or
# pulled there: `docker save | ssh docker load` streams the finished image instead. Secrets live
# in /opt/triplem/.env on the server (uploaded from the local .env when it's missing).
#
# HTTPS: the first deploy after DNS points at the server issues a ZeroSSL certificate with acme.sh
# (Let's Encrypt is unreachable from the server) and switches Nginx to triplem.dev.conf. acme.sh
# must already be installed with a registered ZeroSSL account; its cron job handles renewals.
set -euo pipefail

HOST="${DEPLOY_HOST:-root@94.184.41.181}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/triplem-dev}"
IMAGE="triplem.dev:latest"
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST")

cd "$(dirname "$0")/.."

if [[ -z "${SKIP_BUILD:-}" ]]; then
    docker build -t "$IMAGE" .
fi

echo "Uploading image..."
docker save "$IMAGE" | gzip -1 | "${SSH[@]}" "gunzip | docker load"

"${SSH[@]}" "mkdir -p /opt/triplem && test -f /opt/triplem/.env" || {
    echo "Uploading .env..."
    "${SSH[@]}" "umask 077 && cat > /opt/triplem/.env" < .env
}

echo "Uploading Nginx config..."
"${SSH[@]}" "mkdir -p /etc/nginx/triplem"
for file in triplem-proxy.conf triplem.dev.conf triplem.dev.http.conf; do
    "${SSH[@]}" "cat > /etc/nginx/triplem/$file" < "deploy/nginx/$file"
done

echo "Restarting container..."
"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
docker rm -f triplem >/dev/null 2>&1 || true
docker run -d --name triplem --restart unless-stopped \
    -p 127.0.0.1:3000:3000 \
    --env-file /opt/triplem/.env \
    --memory 512m \
    triplem.dev:latest >/dev/null
docker image prune -f >/dev/null

up=""
for _ in $(seq 1 30); do
    curl -fsS -o /dev/null http://127.0.0.1:3000/ && { up=1; break; }
    sleep 2
done
if [[ -z "$up" ]]; then
    echo "Container did not answer in 60s:" >&2
    docker logs --tail 50 triplem >&2
    exit 1
fi
echo "Container is up."

# Nginx: the HTTPS site once the certificate exists, the HTTP-only bootstrap before that.
cert=/etc/nginx/ssl/triplem.dev
use_site() {
    cp "/etc/nginx/triplem/$1" /etc/nginx/sites-available/triplem.dev
    nginx -t -q && systemctl reload nginx
}
cp /etc/nginx/triplem/triplem-proxy.conf /etc/nginx/snippets/triplem-proxy.conf
ln -sf /etc/nginx/sites-available/triplem.dev /etc/nginx/sites-enabled/triplem.dev
rm -f /etc/nginx/sites-enabled/default

if [[ -s "$cert/fullchain.pem" ]]; then
    use_site triplem.dev.conf
    echo "Nginx serves HTTPS."
    exit 0
fi

use_site triplem.dev.http.conf
echo "No certificate yet, requesting one from ZeroSSL..."
acme=/root/.acme.sh/acme.sh
status=0
"$acme" --issue --server zerossl -d triplem.dev -d www.triplem.dev --stateless \
    --keylength ec-256 || status=$?
# 2 means acme.sh already holds a valid certificate that just isn't installed yet.
if [[ $status -ne 0 && $status -ne 2 ]]; then
    echo "Certificate not issued (do both A records point here?). Site stays on HTTP." >&2
    exit 0
fi
mkdir -p "$cert"
"$acme" --install-cert -d triplem.dev --ecc \
    --fullchain-file "$cert/fullchain.pem" \
    --key-file "$cert/key.pem" \
    --reloadcmd "systemctl reload nginx"
use_site triplem.dev.conf
echo "Nginx serves HTTPS."
REMOTE
