#!/bin/bash
# =============================================================
# Pointify POS — macOS Self-Contained Package Builder
# Produces: dist/PointifyPOS-Mac.zip
# No Node.js installation needed on the target Mac.
# Works on both Intel (x64) and Apple Silicon (arm64) Macs.
# =============================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="20.19.3"
PACKAGE_DIR="$ROOT_DIR/dist/PointifyPOS-Mac"
ZIP_OUT="$ROOT_DIR/dist/PointifyPOS-Mac.zip"
ESBUILD="$ROOT_DIR/node_modules/.bin/esbuild"

cd "$ROOT_DIR"

echo ""
echo "=========================================="
echo " Pointify POS Mac Package Builder"
echo "=========================================="
echo ""

# ── 1. Build client ────────────────────────────────────────────
echo "[1/6] Building client..."
(cd client && npm install --legacy-peer-deps --silent && npm run build --silent)
echo "   ✓ Client built ($(du -sh client/dist | cut -f1))"

# ── 2. Build server (bundle everything except firebase-admin) ──
echo "[2/6] Building server..."
cd "$ROOT_DIR/server" && npm install 2>&1 | tail -3; cd "$ROOT_DIR"

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

# ── 3. Install server production deps ──────────────────────────
echo "[3/6] Installing server production dependencies..."
cd "$ROOT_DIR/server" && npm install --omit=dev 2>&1 | tail -3; cd "$ROOT_DIR"
echo "   ✓ Production deps ready"

# ── 4. Assemble package folder ─────────────────────────────────
echo "[4/6] Assembling package..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/server/dist"
mkdir -p "$PACKAGE_DIR/server/node_modules"
mkdir -p "$PACKAGE_DIR/client"

cp server/dist/index.cjs "$PACKAGE_DIR/server/dist/"
cp server/package.json   "$PACKAGE_DIR/server/"

for pkg in firebase-admin '@firebase' '@google-cloud' google-gax '@grpc' \
           protobufjs google-auth-library gcp-metadata '@opentelemetry' \
           fast-xml-parser jose multer; do
  src="server/node_modules/$pkg"
  if [ -d "$src" ]; then
    cp -r "$src" "$PACKAGE_DIR/server/node_modules/"
  fi
done

cp -r client/dist "$PACKAGE_DIR/client/dist"
echo "   ✓ Files assembled"

# ── 5. Download portable Mac node binaries (Intel + Apple Silicon)
echo "[5/6] Downloading Node.js $NODE_VERSION for macOS..."
for ARCH in x64 arm64; do
  NODE_TAR="node-v${NODE_VERSION}-darwin-${ARCH}.tar.gz"
  NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TAR}"
  NODE_TMP="/tmp/${NODE_TAR}"
  NODE_DEST="$PACKAGE_DIR/node-${ARCH}"

  if [ ! -f "$NODE_TMP" ]; then
    echo "   Downloading node-${ARCH}..."
    curl -L --progress-bar -o "$NODE_TMP" "$NODE_URL"
  else
    echo "   (using cached node-${ARCH})"
  fi

  tar -xzf "$NODE_TMP" -C /tmp "node-v${NODE_VERSION}-darwin-${ARCH}/bin/node" 2>/dev/null
  cp "/tmp/node-v${NODE_VERSION}-darwin-${ARCH}/bin/node" "$NODE_DEST"
  chmod +x "$NODE_DEST"
  echo "   ✓ node-${ARCH} included ($(du -sh "$NODE_DEST" | cut -f1))"
done

# ── 6. Generate config and scripts ────────────────────────────
echo "[6/6] Creating config and startup scripts..."

SESSION_SECRET=$(openssl rand -hex 32)

cat > "$PACKAGE_DIR/.env" << EOF
# Pointify POS Configuration
SESSION_SECRET=${SESSION_SECRET}
PORT=3000
POINTIFY_API_URL=https://api.pointifypos.com
POINTIFY_OFFLINE_API_URL=https://api.pointifypos.com
NODE_ENV=production
EOF

# ── Start Pointify POS.command (double-clickable on Mac) ───────
cat > "$PACKAGE_DIR/Start Pointify POS.command" << 'CMDEOF'
#!/bin/bash
# Double-click this file to start the Pointify POS server.
cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found."
  read -p "Press Enter to exit..."
  exit 1
fi

# Load environment variables
set -a; source .env; set +a

# Pick the right node binary for this Mac
if [ "$(uname -m)" = "arm64" ]; then
  NODE="./node-arm64"
else
  NODE="./node-x64"
fi

echo ""
echo "  ============================================"
echo "   Pointify POS  |  Port $PORT"
echo "  ============================================"
echo "   Other tills: open a browser and go to"
ifconfig | grep "inet " | grep -v "127.0.0.1" | awk -v port="$PORT" '{print "     http://" $2 ":" port}'
echo "  ============================================"
echo "   Keep this window open. Press Ctrl+C to stop."
echo ""

"$NODE" server/dist/index.cjs
read -p "Server stopped. Press Enter to close..."
CMDEOF
chmod +x "$PACKAGE_DIR/Start Pointify POS.command"

# ── setup-autostart.sh (launchd — starts silently at boot) ─────
PLIST_LABEL="com.pointifypos.server"

cat > "$PACKAGE_DIR/setup-autostart.sh" << 'AUTOEOF'
#!/bin/bash
# Run ONCE to make Pointify POS start automatically at login.
# No console window — runs silently in the background.
cd "$(dirname "$0")"
INSTALL_DIR="$(pwd)"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  echo "ERROR: .env not found. Set it up first."
  exit 1
fi

# Load env to get PORT
set -a; source "$INSTALL_DIR/.env"; set +a

# Pick node binary
if [ "$(uname -m)" = "arm64" ]; then
  NODE="$INSTALL_DIR/node-arm64"
else
  NODE="$INSTALL_DIR/node-x64"
fi

PLIST_LABEL="com.pointifypos.server"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"

# Write the launchd plist
cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE}</string>
        <string>${INSTALL_DIR}/server/dist/index.cjs</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${INSTALL_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key><string>production</string>
        <key>PORT</key><string>${PORT}</string>
        <key>POINTIFY_API_URL</key><string>${POINTIFY_API_URL}</string>
        <key>POINTIFY_OFFLINE_API_URL</key><string>${POINTIFY_OFFLINE_API_URL}</string>
        <key>SESSION_SECRET</key><string>${SESSION_SECRET}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/pointifypos.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/pointifypos-error.log</string>
</dict>
</plist>
PLIST

# Load it now (no reboot needed)
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo ""
echo "  SUCCESS! Auto-start registered."
echo "  Pointify POS is now running in the background."
echo "  It will start automatically every time this Mac logs in."
echo ""
echo "  To check logs:   cat /tmp/pointifypos.log"
echo "  To remove:       launchctl unload ~/Library/LaunchAgents/${PLIST_LABEL}.plist"
echo "                   rm ~/Library/LaunchAgents/${PLIST_LABEL}.plist"
echo ""
AUTOEOF
chmod +x "$PACKAGE_DIR/setup-autostart.sh"

# ── README ─────────────────────────────────────────────────────
cat > "$PACKAGE_DIR/README.txt" << 'READMEEOF'
Pointify POS — Mac Setup
========================

QUICK START
-----------
1. Extract this folder anywhere (e.g. Desktop)
2. Double-click "Start Pointify POS.command"
   (If macOS blocks it: right-click → Open → Open)
3. A terminal shows the address for other tills, e.g.:
     http://192.168.1.15:3000
4. On every other till: open Chrome → go to that address

AUTO-START (optional)
---------------------
To make the server start automatically at login (no window needed):

1. Open Terminal
2. Drag "setup-autostart.sh" into the Terminal window
3. Press Enter
4. Done — the server now starts silently at every login

To stop auto-start:
  launchctl unload ~/Library/LaunchAgents/com.pointifypos.server.plist
  rm ~/Library/LaunchAgents/com.pointifypos.server.plist

CONFIGURATION
-------------
Edit the ".env" file to change settings (PORT, API URL, etc.)
If you change .env after setting up auto-start, run setup-autostart.sh again.

WORKS ON
--------
- Apple Silicon Macs (M1/M2/M3) — uses node-arm64
- Intel Macs — uses node-x64
READMEEOF

# ── Zip (preserve executable permissions) ──────────────────────
echo ""
echo "Packaging..."
rm -f "$ZIP_OUT"
mkdir -p "$(dirname "$ZIP_OUT")"
cd "$(dirname "$PACKAGE_DIR")"
zip -r "$ZIP_OUT" "$(basename "$PACKAGE_DIR")/" -x '*.DS_Store'

SIZE=$(du -sh "$ZIP_OUT" | cut -f1)
UNZIPPED=$(du -sh "$PACKAGE_DIR" | cut -f1)

echo ""
echo "=========================================="
echo " Package ready!"
echo " File:     dist/PointifyPOS-Mac.zip"
echo " Zip size: $SIZE"
echo " Unzipped: $UNZIPPED"
echo "=========================================="
echo ""
echo " How to use:"
echo "   1. Copy the zip to any Mac and extract it"
echo "   2. Double-click 'Start Pointify POS.command'"
echo "   3. Other tills open the URL shown on screen"
echo ""
