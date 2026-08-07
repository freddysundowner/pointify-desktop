# Pointify POS — Windows Server Till Setup Guide

This guide sets up one Windows PC as the POS server. All other tills connect to it through a browser — no software needed on those machines.

---

## Architecture

```
[Server Till — this PC]          [Other Tills — any device on the same Wi-Fi/LAN]
  Runs: Node.js + POS server  ←→   Browser → http://<server-ip>:3000
  Connects to: Pointify cloud API (when online)
  Falls back to: offline mode (when internet is down)
```

---

## One-time setup on the server till

### Step 1 — Install Node.js

1. Go to **https://nodejs.org** and download the **LTS** version
2. Run the installer (keep all defaults, make sure "Add to PATH" is checked)
3. Restart the PC after installing
4. Verify: open Command Prompt, type `node --version` — you should see a version number

### Step 2 — Build the app (on Replit)

On your Replit workspace, open the Shell and run:

```
npm run build
```

This produces:
- `server/dist/index.cjs` — the server
- `client/dist/` — the frontend (served by the server)

### Step 3 — Copy files to the server till

Create a folder on the server till, e.g. `C:\PointifyPOS\`, and copy these into it:

```
C:\PointifyPOS\
  ├── server\
  │   ├── dist\          ← built server (from Replit: server/dist/)
  │   └── package.json   ← needed to install runtime dependencies
  ├── client\
  │   └── dist\          ← built frontend (from Replit: client/dist/)
  ├── .env.example
  └── start-server.bat
```

> **Tip:** You can use a USB drive, shared folder, or any file transfer method.

### Step 4 — Configure the server

1. In `C:\PointifyPOS\`, copy `.env.example` and rename the copy to `.env`
2. Open `.env` with Notepad and fill in:

   | Setting | What to put |
   |---|---|
   | `SESSION_SECRET` | Any long random string (32+ characters) — e.g. mash your keyboard |
   | `PORT` | `3000` (or any free port) |
   | `POINTIFY_API_URL` | `https://api.pointifypos.com` (or your own API server URL) |
   | `NODE_ENV` | `production` |

3. Save the file

### Step 5 — Start the server

Double-click **`start-server.bat`**.

On the **first run**, the script will automatically install the server's runtime dependencies (requires internet). This only happens once.

A console window will open showing:
- The IP address(es) other tills should use
- Confirmation that the server is running

> **Keep this window open** while the till is in use. Closing it stops the server.

---

## Connecting other tills

On any other device on the same network:

1. Open a browser (Chrome recommended)
2. Navigate to the address shown in the server's console window, e.g.:  
   **`http://192.168.1.15:3000`**
3. The Pointify POS login screen will appear

That's it — no software to install on the other tills.

---

## Finding the server till's IP address

If you need the IP address later, on the server till:

- Press **Windows + R**, type `cmd`, press Enter
- Type `ipconfig` and press Enter
- Look for **IPv4 Address** under your active network adapter (e.g. `192.168.1.15`)

---

## Offline mode

When the internet is unavailable:
- Tills continue making sales — data is saved locally in the browser
- Sales sync to the Pointify cloud automatically when connectivity returns
- The server till must be running and reachable on the LAN for other tills to work  
  (only the internet connection to the cloud is optional)

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Other tills can't connect | Allow port 3000 through Windows Firewall: Control Panel → Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule → Port → TCP → 3000 → Allow |
| "node is not recognised" | Node.js isn't installed or wasn't added to PATH — reinstall from nodejs.org and restart |
| Server won't start | Make sure `.env` exists in the same folder as `start-server.bat` |
| "Cannot find module" errors | Delete `server\node_modules` and run `start-server.bat` again to reinstall |
| "client/dist not found" | Rebuild on Replit (`npm run build`) and copy `client/dist/` again |

---

## Updating the app

1. On Replit, make changes and run `npm run build`
2. Stop the server (close the console window or press Ctrl+C)
3. Copy the new `server/dist/` and `client/dist/` folders to the server till (overwrite)
4. Start the server again with `start-server.bat`

> Dependencies only need reinstalling if `server/package.json` changed — the script handles this automatically on first run.
