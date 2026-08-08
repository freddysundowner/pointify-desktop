#!/bin/bash
# Run ONCE to make Pointify POS start automatically at login.
# No console window — runs silently in the background.
cd "$(dirname "$0")"
INSTALL_DIR="$(pwd)"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  echo "ERROR: .env not found. Set it up first."
  exit 1
fi

set -a; source "$INSTALL_DIR/.env"; set +a

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  NODE="$INSTALL_DIR/node-arm64"
else
  NODE="$INSTALL_DIR/node-x64"
fi

LABEL="com.pointifypos.server"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

cat > "$PLIST" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE}</string>
        <string>${INSTALL_DIR}/server/dist/index.cjs</string>
    </array>
    <key>WorkingDirectory</key><string>${INSTALL_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key><string>production</string>
        <key>PORT</key><string>${PORT}</string>
        <key>SESSION_SECRET</key><string>${SESSION_SECRET}</string>
        <key>POINTIFY_API_URL</key><string>${POINTIFY_API_URL}</string>
        <key>POINTIFY_OFFLINE_API_URL</key><string>${POINTIFY_OFFLINE_API_URL}</string>
    </dict>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>/tmp/pointifypos.log</string>
    <key>StandardErrorPath</key><string>/tmp/pointifypos-error.log</string>
</dict>
</plist>
PLISTEOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo ""
echo "  SUCCESS! Auto-start registered."
echo "  Pointify POS is now running in the background."
echo "  It will start automatically every time this Mac logs in."
echo ""
echo "  To check logs:   cat /tmp/pointifypos.log"
echo "  To stop auto-start:"
echo "    launchctl unload ~/Library/LaunchAgents/${LABEL}.plist"
echo "    rm ~/Library/LaunchAgents/${LABEL}.plist"
echo ""
