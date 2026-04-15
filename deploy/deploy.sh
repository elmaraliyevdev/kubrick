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
# Must be set at build time for Vite (override in shell profile or before calling this script).
export VITE_API_URL="${VITE_API_URL:-https://api.kubrick.app/api}"
npm ci --silent
npm run build
echo "  Frontend built"

# 4. Restart backend
echo "[4/5] Restarting API..."
sudo systemctl restart kubrick-api

# 5. Health check
echo "[5/5] Health check..."
# Allow the API process time to fork workers and finish startup hooks.
HEALTH_URL="http://127.0.0.1:8000/health"
MAX_ATTEMPTS=30
SLEEP_SECONDS=2

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    if curl -sf "$HEALTH_URL" > /dev/null; then
        echo "  API is healthy (attempt ${attempt}/${MAX_ATTEMPTS})"
        break
    fi

    if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
        echo "  WARNING: Health check failed after ${MAX_ATTEMPTS} attempts."
        sudo systemctl status kubrick-api --no-pager || true
        sudo journalctl -u kubrick-api --no-pager -n 50
        exit 1
    fi

    sleep "$SLEEP_SECONDS"
done

echo ""
echo "=== Deployment complete ==="
