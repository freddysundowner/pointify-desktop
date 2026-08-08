#!/bin/bash
# Double-click this file to start the Pointify POS server.
cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found."
  read -p "Press Enter to exit..."
  exit 1
fi

set -a; source .env; set +a

# Pick the right node binary for this Mac
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  NODE="./node-arm64"
else
  NODE="./node-x64"
fi

echo ""
echo "  ============================================"
echo "   Pointify POS  |  Port $PORT"
echo "  ============================================"
echo "   Other tills: open a browser and go to"
ifconfig | grep "inet " | grep -v "127.0.0.1" | \
  awk -v p="$PORT" '{print "     http://" $2 ":" p}'
echo "  ============================================"
echo "   Keep this window open. Press Ctrl+C to stop."
echo ""

"$NODE" server/dist/index.cjs
read -p "Server stopped. Press Enter to close..."
