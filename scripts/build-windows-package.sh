#!/bin/bash
# =============================================================
# Pointify POS — Windows Self-Contained Package Builder
# Produces: dist/PointifyPOS-Windows.zip
# No Node.js installation needed on the target Windows machine.
# =============================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="20.19.3"
PACKAGE_DIR="$ROOT_DIR/dist/PointifyPOS-Windows"
ZIP_OUT="$ROOT_DIR/dist/PointifyPOS-Windows.zip"
ESBUILD="$ROOT_DIR/node_modules/.bin/esbuild"

cd "$ROOT_DIR"

echo ""
echo "=========================================="
echo " Pointify POS Windows Package Builder"
echo "=========================================="
echo ""

# ── 1. Build client ────────────────────────────────────────────
echo "[1/6] Building client..."
(cd client && npm install --legacy-peer-deps --silent && npm run build --silent)
echo "   ✓ Client built ($(du -sh client/dist | cut -f1))"

# ── 2. Build server (bundled, firebase-admin external) ─────────
echo "[2/6] Building server..."
# Install all server deps (including dev) for the build step
cd "$ROOT_DIR/server" && npm install 2>&1 | tail -3; cd "$ROOT_DIR"

# Bundle everything except firebase-admin and its native ecosystem.
"$ESBUILD" server/src/index.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=server/dist/index.cjs \
  '--external:firebase-admin' \
  '--external:@firebase/*' \
  '--external:@google-cloud/*' \
  '--external:google-gax' \
  '--external:@grpc/*' \
  '--external:protobufjs' \
  '--external:google-auth-library' \
  '--external:gcp-metadata' \
  '--external:@opentelemetry/*' \
  '--external:fast-xml-parser' \
  '--external:jose' \
  '--external:multer'
echo "   ✓ Server built ($(du -sh server/dist/index.cjs | cut -f1))"

# ── 3. Install production-only server deps ─────────────────────
echo "[3/6] Installing server production dependencies..."
(cd server && npm install --omit=dev --silent)
echo "   ✓ Production deps ready"

# ── 4. Assemble package folder ─────────────────────────────────
echo "[4/6] Assembling package..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/server/dist"
mkdir -p "$PACKAGE_DIR/server/node_modules"
mkdir -p "$PACKAGE_DIR/client"

# Built server
cp server/dist/index.cjs "$PACKAGE_DIR/server/dist/"
cp server/package.json   "$PACKAGE_DIR/server/"

# Copy only the packages that are still external (firebase-admin ecosystem)
for pkg in firebase-admin '@firebase' '@google-cloud' google-gax '@grpc' \
           protobufjs google-auth-library gcp-metadata '@opentelemetry' \
           fast-xml-parser jose multer; do
  src="server/node_modules/$pkg"
  if [ -d "$src" ]; then
    cp -r "$src" "$PACKAGE_DIR/server/node_modules/"
  fi
done

# Built frontend
cp -r client/dist "$PACKAGE_DIR/client/dist"

echo "   ✓ Files assembled"

# ── 5. Download portable Windows node.exe ─────────────────────
echo "[5/6] Downloading Node.js $NODE_VERSION for Windows..."
NODE_ZIP="node-v${NODE_VERSION}-win-x64.zip"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}"
NODE_TMP="/tmp/${NODE_ZIP}"

if [ ! -f "$NODE_TMP" ]; then
  curl -L --progress-bar -o "$NODE_TMP" "$NODE_URL"
else
  echo "   (using cached copy)"
fi

unzip -o -j "$NODE_TMP" "node-v${NODE_VERSION}-win-x64/node.exe" -d "$PACKAGE_DIR" > /dev/null
echo "   ✓ node.exe included ($(du -sh "$PACKAGE_DIR/node.exe" | cut -f1))"

# ── 6. Generate config and startup script ─────────────────────
echo "[6/6] Creating config and startup script..."

SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -1)

cat > "$PACKAGE_DIR/.env" << EOF
# Pointify POS Configuration
# Edit POINTIFY_API_URL only if you use your own API server.
# All other settings work out of the box.

SESSION_SECRET=${SESSION_SECRET}
PORT=3000
POINTIFY_API_URL=https://api.pointifypos.com
POINTIFY_OFFLINE_API_URL=https://api.pointifypos.com
NODE_ENV=production
EOF

# Windows startup batch (uses bundled node.exe — no Node.js install needed)
cat > "$PACKAGE_DIR/Start Pointify POS.bat" << 'BATEOF'
@echo off
setlocal enabledelayedexpansion
title Pointify POS Server

if not exist "%~dp0.env" (
    echo ERROR: .env file not found next to this script.
    pause & exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    set "ln=%%A"
    if not "!ln:~0,1!"=="#" if not "%%A"=="" set "%%A=%%B"
)

echo.
echo  ============================================
echo   Pointify POS  ^|  Port %PORT%
echo  ============================================
echo   Other tills: open a browser and go to
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /R "IPv4"') do (
    set "ip=%%I"
    set "ip=!ip: =!"
    if not "!ip!"=="127.0.0.1" echo     http://!ip!:%PORT%
)
echo  ============================================
echo   Keep this window open. Press Ctrl+C to stop.
echo.

"%~dp0node.exe" "%~dp0server\dist\index.cjs"
pause
BATEOF

cp SETUP.md "$PACKAGE_DIR/README.txt"

# ── 7. Zip ─────────────────────────────────────────────────────
rm -f "$ZIP_OUT"
mkdir -p "$(dirname "$ZIP_OUT")"
(cd "$(dirname "$PACKAGE_DIR")" && zip -r "$ZIP_OUT" "$(basename "$PACKAGE_DIR")/" -x '*.DS_Store')

SIZE=$(du -sh "$ZIP_OUT" | cut -f1)
UNZIPPED=$(du -sh "$PACKAGE_DIR" | cut -f1)

echo ""
echo "=========================================="
echo " Package ready!"
echo " File:      dist/PointifyPOS-Windows.zip"
echo " Zip size:  $SIZE"
echo " Unzipped:  $UNZIPPED"
echo "=========================================="
echo ""
echo " How to use:"
echo "   1. Download the zip to any Windows PC"
echo "   2. Extract it (right-click → Extract All)"
echo "   3. Double-click 'Start Pointify POS.bat'"
echo "   4. Other tills open the URL shown on screen"
echo ""
