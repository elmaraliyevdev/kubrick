#!/bin/bash
# Kubrick — EC2 one-time setup script
# Run as root on a fresh Ubuntu 22.04+ EC2 instance
# Usage: sudo bash setup.sh

set -e

echo "=== Kubrick EC2 Setup ==="

# 1. System packages
echo "[1/7] Installing system packages..."
apt update
apt install -y python3 python3-venv python3-pip nginx postgresql certbot python3-certbot-nginx libmagic1 git curl

# Install Node.js 20 (LTS)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo "  Node: $(node --version)"
echo "  Python: $(python3 --version)"
echo "  Nginx: $(nginx -v 2>&1)"

# 2. Create kubrick system user
echo "[2/7] Creating kubrick user..."
if ! id kubrick &>/dev/null; then
    useradd -m -s /bin/bash kubrick
    echo "  Created user: kubrick"
else
    echo "  User kubrick already exists"
fi

# 3. PostgreSQL setup
echo "[3/7] Setting up PostgreSQL..."
PG_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='kubrick_prod'" | grep -q 1 || {
    sudo -u postgres psql -c "CREATE USER kubrick_prod WITH PASSWORD '${PG_PASSWORD}';"
    sudo -u postgres psql -c "CREATE DATABASE kubrick_prod OWNER kubrick_prod;"
    echo "  Database created. Save this password: ${PG_PASSWORD}"
    echo "  DATABASE_URL=postgresql://kubrick_prod:${PG_PASSWORD}@localhost:5432/kubrick_prod"
}

# 4. Clone repo (or skip if already present)
echo "[4/7] Setting up application..."
if [ ! -d /home/kubrick/kubrick ]; then
    echo "  Please clone the repo to /home/kubrick/kubrick"
    echo "  Example: sudo -u kubrick git clone <your-repo-url> /home/kubrick/kubrick"
else
    echo "  Repo already present at /home/kubrick/kubrick"
fi

# 5. Nginx config
echo "[5/7] Configuring nginx..."
cp /home/kubrick/kubrick/deploy/nginx/kubrick.conf /etc/nginx/sites-available/kubrick
ln -sf /etc/nginx/sites-available/kubrick /etc/nginx/sites-enabled/kubrick
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  Nginx configured"

# 6. Systemd service
echo "[6/7] Installing systemd service..."
cp /home/kubrick/kubrick/deploy/kubrick-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable kubrick-api
echo "  Service installed (not started — run deploy.sh first)"

# 7. SSL (run after DNS is pointed to this server)
echo "[7/7] SSL setup..."
echo "  After pointing DNS A records for kubrick.app, app.kubrick.app, api.kubrick.app, and wildcard *.kubrick.app to this server, run:"
echo "  sudo certbot --nginx -d kubrick.app -d app.kubrick.app -d api.kubrick.app"
echo "  For public career subdomains, issue a wildcard certificate with DNS challenge:"
echo "  sudo certbot certonly --manual --preferred-challenges dns -d \"*.kubrick.app\" -d kubrick.app"

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Clone repo to /home/kubrick/kubrick (if not done)"
echo "  2. Create /home/kubrick/kubrick/backend/.env with production values"
echo "  3. Point DNS A records to this server's IP"
echo "  4. Run: sudo -u kubrick bash /home/kubrick/kubrick/deploy/deploy.sh"
echo "  5. Run certbot for SSL (command above)"
