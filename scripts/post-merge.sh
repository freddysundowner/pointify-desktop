#!/bin/bash
set -e

# Pointify is a proxy web app (no database / no Drizzle migrations), so there is
# no db:push step. We just reinstall dependencies for root, client and server so
# the merged code runs. The client requires --legacy-peer-deps.
npm install
(cd client && npm install --legacy-peer-deps)
(cd server && npm install)
