#!/bin/bash
# ============================================================
# Domain Migration Script
# FROM: leads.automate.pure-kiwi.com
# TO:   leads.edscanlan.co.nz
# App:  Next.js (property-leadgen), managed by PM2
# ============================================================

set -e  # exit on any error

OLD_DOMAIN="leads.automate.pure-kiwi.com"
NEW_DOMAIN="leads.edscanlan.co.nz"
APP_DIR="/var/www/property-leadgen"   # ← adjust if different
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
confirm() {
  read -rp "$1 [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Skipped."; return 1; }
}

# ─── 0. Root check ───────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "Run as root: sudo bash change-domain.sh"
fi

echo ""
echo "=========================================="
echo " Domain Migration: $OLD_DOMAIN → $NEW_DOMAIN"
echo "=========================================="
echo ""

# ─── 1. DNS check ────────────────────────────────────────────
info "Step 1: Checking DNS for $NEW_DOMAIN..."
VPS_IP=$(curl -s https://api.ipify.org)
DNS_IP=$(dig +short "$NEW_DOMAIN" | tail -1)

echo "  VPS IP : $VPS_IP"
echo "  DNS IP : ${DNS_IP:-not resolved yet}"

if [[ "$DNS_IP" != "$VPS_IP" ]]; then
  warn "DNS for $NEW_DOMAIN does not yet point to this server ($VPS_IP)."
  warn "SSL cert will FAIL if DNS isn't propagated. Certbot needs port 80 to reach this server."
  confirm "Continue anyway?" || true
else
  info "DNS is pointing correctly to $VPS_IP ✓"
fi

echo ""

# ─── 2. Find existing Nginx config ───────────────────────────
info "Step 2: Locating Nginx config for $OLD_DOMAIN..."

NGINX_CONF=$(grep -rl "$OLD_DOMAIN" /etc/nginx/ 2>/dev/null | grep -v "\.bak" | head -1)

if [[ -z "$NGINX_CONF" ]]; then
  warn "No Nginx config found referencing $OLD_DOMAIN."
  warn "Searching all configs in $NGINX_SITES..."
  ls "$NGINX_SITES"/ 2>/dev/null || error "No configs found in $NGINX_SITES"
  read -rp "Enter the config filename to use (from $NGINX_SITES/): " CONF_NAME
  NGINX_CONF="$NGINX_SITES/$CONF_NAME"
  [[ -f "$NGINX_CONF" ]] || error "File not found: $NGINX_CONF"
else
  info "Found config: $NGINX_CONF"
fi

echo ""

# ─── 3. Backup existing config ───────────────────────────────
info "Step 3: Backing up existing config..."
cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"
info "Backup saved: ${NGINX_CONF}.bak.*"
echo ""

# ─── 4. Replace domain name in config ────────────────────────
info "Step 4: Updating server_name in Nginx config..."
sed -i "s/$OLD_DOMAIN/$NEW_DOMAIN/g" "$NGINX_CONF"
info "Replaced all occurrences of $OLD_DOMAIN with $NEW_DOMAIN in $NGINX_CONF"
echo ""

# ─── 5. Rename config files if needed ────────────────────────
info "Step 5: Renaming config files..."
CONF_DIR=$(dirname "$NGINX_CONF")
CONF_BASE=$(basename "$NGINX_CONF")

if [[ "$CONF_BASE" == *"$OLD_DOMAIN"* ]]; then
  NEW_CONF_BASE="${CONF_BASE//$OLD_DOMAIN/$NEW_DOMAIN}"
  mv "$NGINX_CONF" "$CONF_DIR/$NEW_CONF_BASE"
  NGINX_CONF="$CONF_DIR/$NEW_CONF_BASE"
  info "Renamed config to: $NGINX_CONF"

  # Update symlink in sites-enabled
  OLD_LINK="$NGINX_ENABLED/$CONF_BASE"
  NEW_LINK="$NGINX_ENABLED/$NEW_CONF_BASE"

  if [[ -L "$OLD_LINK" ]]; then
    rm "$OLD_LINK"
    ln -s "$NGINX_CONF" "$NEW_LINK"
    info "Updated symlink: $NEW_LINK → $NGINX_CONF"
  fi
else
  info "Config filename doesn't contain old domain — no rename needed."
fi
echo ""

# ─── 6. Temporarily strip SSL lines so Nginx can reload ──────
info "Step 6: Testing Nginx config before SSL..."
# Remove ssl_certificate lines temporarily if cert doesn't exist yet
CERT_PATH="/etc/letsencrypt/live/$NEW_DOMAIN/fullchain.pem"
if [[ ! -f "$CERT_PATH" ]]; then
  warn "SSL cert not yet issued. Creating a temporary HTTP-only config for port 80..."
  # Comment out ssl lines so nginx -t passes
  sed -i 's/^\(\s*listen 443\)/#TEMP \1/' "$NGINX_CONF"
  sed -i 's/^\(\s*ssl_certificate\)/#TEMP \1/' "$NGINX_CONF"
  sed -i 's/^\(\s*include.*ssl-params\)/#TEMP \1/' "$NGINX_CONF"
fi

nginx -t || error "Nginx config test failed — check $NGINX_CONF manually"
systemctl reload nginx
info "Nginx reloaded with HTTP config ✓"
echo ""

# ─── 7. Obtain SSL certificate ───────────────────────────────
info "Step 7: Obtaining SSL certificate for $NEW_DOMAIN..."
certbot --nginx -d "$NEW_DOMAIN" --non-interactive --agree-tos \
  --email admin@edscanlan.co.nz || {
  warn "Certbot failed. Try manually: certbot --nginx -d $NEW_DOMAIN"
  warn "Uncomment the #TEMP lines in $NGINX_CONF after you get the cert."
}

# Restore any lines we commented out (certbot --nginx rewrites them anyway)
sed -i 's/^#TEMP //' "$NGINX_CONF" 2>/dev/null || true
echo ""

# ─── 8. Update .env file ─────────────────────────────────────
info "Step 8: Updating .env files in $APP_DIR..."
if [[ -d "$APP_DIR" ]]; then
  find "$APP_DIR" -maxdepth 2 -name ".env*" ! -name "*.bak" | while read -r envfile; do
    if grep -q "$OLD_DOMAIN" "$envfile" 2>/dev/null; then
      cp "$envfile" "${envfile}.bak.$(date +%Y%m%d%H%M%S)"
      sed -i "s|$OLD_DOMAIN|$NEW_DOMAIN|g" "$envfile"
      info "Updated: $envfile"
    fi
  done
else
  warn "App directory $APP_DIR not found — skipping .env update."
  warn "Manually update any NEXT_PUBLIC_APP_URL or similar vars referencing $OLD_DOMAIN"
fi
echo ""

# ─── 9. Rebuild Next.js app ──────────────────────────────────
info "Step 9: Rebuilding Next.js app..."
if [[ -d "$APP_DIR" ]]; then
  cd "$APP_DIR"
  if command -v npm &>/dev/null; then
    npm run build
    info "Build complete ✓"
  else
    warn "npm not found — skipping build. Run 'npm run build' manually in $APP_DIR"
  fi
else
  warn "App directory not found — skipping build."
fi
echo ""

# ─── 10. Restart app via PM2 ─────────────────────────────────
info "Step 10: Restarting app via PM2..."
if command -v pm2 &>/dev/null; then
  pm2 list
  pm2 restart all
  info "PM2 restarted ✓"
else
  warn "PM2 not found. Restart your app manually."
fi
echo ""

# ─── 11. Final Nginx reload ──────────────────────────────────
info "Step 11: Final Nginx reload..."
nginx -t && systemctl reload nginx
info "Nginx reloaded ✓"
echo ""

# ─── 12. Setup redirect from old domain (optional) ───────────
echo ""
if confirm "Set up 301 redirect from $OLD_DOMAIN → $NEW_DOMAIN? (Only if old domain still points to this server)"; then
  OLD_CERT="/etc/letsencrypt/live/$OLD_DOMAIN/fullchain.pem"
  REDIRECT_CONF="$NGINX_SITES/$OLD_DOMAIN-redirect"

  if [[ -f "$OLD_CERT" ]]; then
    cat > "$REDIRECT_CONF" <<EOF
server {
    listen 80;
    server_name $OLD_DOMAIN;
    return 301 https://$NEW_DOMAIN\$request_uri;
}
server {
    listen 443 ssl;
    server_name $OLD_DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$OLD_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$OLD_DOMAIN/privkey.pem;
    return 301 https://$NEW_DOMAIN\$request_uri;
}
EOF
  else
    cat > "$REDIRECT_CONF" <<EOF
server {
    listen 80;
    server_name $OLD_DOMAIN;
    return 301 https://$NEW_DOMAIN\$request_uri;
}
EOF
  fi

  ln -sf "$REDIRECT_CONF" "$NGINX_ENABLED/$(basename "$REDIRECT_CONF")"
  nginx -t && systemctl reload nginx
  info "Redirect configured ✓"
fi

# ─── 13. Verify ──────────────────────────────────────────────
echo ""
info "Step 13: Verifying..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$NEW_DOMAIN" 2>/dev/null || echo "unreachable")
echo "  https://$NEW_DOMAIN → HTTP $HTTP_STATUS"

if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "301" || "$HTTP_STATUS" == "302" ]]; then
  info "Site is live ✓"
else
  warn "Got HTTP $HTTP_STATUS — check app logs: pm2 logs"
fi

echo ""
echo "=========================================="
echo " Migration complete!"
echo ""
echo " MANUAL STEPS REMAINING:"
echo " 1. Supabase dashboard → Authentication → URL Configuration"
echo "    Site URL: https://$NEW_DOMAIN"
echo "    Add redirect URL: https://$NEW_DOMAIN/**"
echo ""
echo " 2. Any OAuth providers (Google, etc.)"
echo "    Add https://$NEW_DOMAIN to Authorized redirect URIs"
echo "=========================================="
