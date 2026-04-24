#!/bin/bash
# Start both the Express server and Vite dev server concurrently

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start the Express backend on port 1999
cd "$ROOT_DIR/server" && npm run dev &
SERVER_PID=$!

# Give server a moment to start
sleep 2

# Start the Vite frontend on port 5000
cd "$ROOT_DIR/client" && npm run dev

# If frontend exits, kill backend too
kill $SERVER_PID 2>/dev/null
