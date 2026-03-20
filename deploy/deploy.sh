#!/bin/bash
# Kubrick — deployment script
# Run as the kubrick user: sudo -u kubrick bash deploy.sh
# Or from CI: ssh kubrick@<server> 'bash ~/kubrick/deploy/deploy.sh'

set -e

APP_DIR="/home/kubrick/kubrick"
cd "$APP_DIR"

echo "=== Deploying Kubrick ==="

# 1. Pull latest code
echo "[1/5] Pulling latest code..."
git pull origin main

# 2. Backend
echo "[2/5] Updating backend..."
cd "$APP_DIR/backend"
.venv/bin/pip install -q -r requirements.txt
.venv/bin/alembic upgrade head
echo "  Backend dependencies installed, migrations applied"

# 3. Frontend
echo "[3/5] Building frontend..."
cd "$APP_DIR/frontend"
npm ci --silent
npm run build
echo "  Frontend built"

# 4. Restart backend
echo "[4/5] Restarting API..."
sudo systemctl restart kubrick-api
sleep 2

# 5. Health check
echo "[5/5] Health check..."
if curl -sf http://127.0.0.1:8000/health > /dev/null; then
    echo "  API is healthy"
else
    echo "  WARNING: Health check failed!"
    sudo journalctl -u kubrick-api --no-pager -n 20
    exit 1
fi

echo ""
echo "=== Deployment complete ==="
