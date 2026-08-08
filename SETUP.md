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
  │   ├── dist\               ← built server (from Replit: server/dist/)
  │   └── package.json        ← needed to install runtime dependencies
  ├── client\
  │   └── dist\               ← built frontend (from Replit: client/dist/)
  ├── .env.example
  ├── ecosystem.config.js     ← PM2 process config (auto-start)
  ├── setup-autostart.bat     ← run once to register auto-start
  └── start-server.bat        ← manual start (fallback)
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

### Step 5 — Start the server manually (first-time test)

Double-click **`start-server.bat`** to verify everything works before enabling auto-start.

On the **first run**, the script will automatically install the server's runtime dependencies (requires internet). This only happens once.

A console window will open showing:
- The IP address(es) other tills should use
- Confirmation that the server is running

Once you can see the login screen from another device, press **Ctrl+C** and close the window — then continue to Step 6.

> If you skip auto-start (Step 6), you must keep this window open while the till is in use. Closing it stops the server.

---

### Step 6 — Set up auto-start (recommended)

This makes the POS server start automatically every time Windows boots — **no console window, no login required**. It uses Windows Task Scheduler with a system-level boot task.

1. Right-click **`setup-autostart.bat`** and choose **Run as administrator**
2. The script will:
   - Install **PM2** (a background Node.js process manager)
   - Start the POS server under PM2 and save its state
   - Generate **`pm2-autostart.bat`** with the full paths needed by Windows
   - Register a **Windows Task Scheduler** task (`PointifyPOS`) that runs at system startup as the SYSTEM account — before any user logs in
3. When you see **SUCCESS**, the setup is complete

To confirm the task was registered: press **Windows + R**, type `taskschd.msc`, and look for **PointifyPOS** in the Task Scheduler Library.

**Managing the server after auto-start is set up:**

Open any Command Prompt and use these commands:

| Command | What it does |
|---|---|
| `pm2 list` | Show whether the server is running |
| `pm2 logs pointify-pos` | View live server logs |
| `pm2 restart pointify-pos` | Restart the server (e.g. after copying new files) |
| `pm2 stop pointify-pos` | Stop the server |
| `pm2 start ecosystem.config.js` | Start the server again after a manual stop |

**To remove auto-start** (if you no longer want it):
```
schtasks /delete /tn "PointifyPOS" /f
```

> **Note:** You only need to run `setup-autostart.bat` once. After that, use the `pm2` commands above for day-to-day management.

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

## Letting staff connect without memorising an IP address

By default the server till gets a different IP address each time the router reboots.  
Choose **one** of the two options below to make the address permanent and easy to remember.

---

### Option A — Reserve a static IP on the server till (recommended)

A static IP means the server till always appears at the same address — no hosts-file changes needed on other tills.

**On the server till:**

1. Press **Windows + R**, type `ncpa.cpl`, press **Enter**
2. Right-click the active network adapter (usually **Ethernet** or **Wi-Fi**) → **Properties**
3. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**
4. Choose **Use the following IP address** and fill in:

   | Field | Example value | Notes |
   |---|---|---|
   | IP address | `192.168.1.200` | Pick a number above 100 to avoid conflicts with router DHCP |
   | Subnet mask | `255.255.255.0` | Copy what `ipconfig` showed before you changed anything |
   | Default gateway | `192.168.1.1` | Your router's IP — check the label on the router or run `ipconfig` |

5. Set **Preferred DNS server** to the same value as the default gateway (e.g. `192.168.1.1`)
6. Click **OK** → **Close**

> **Tip:** Write the chosen IP on a label stuck to the server till, e.g. `POS server: 192.168.1.200`

**On every other till**, staff now always navigate to (substituting your chosen IP):

```
http://192.168.1.200:3000
```

Bookmark this in Chrome so staff never have to type it again.

---

### Option B — Use a friendly name instead of an IP (`http://pos-server`)

This requires a one-time edit on **each** client till but lets staff use a name rather than a number.

**On the server till:** first follow Option A above so the IP doesn't change.

**On each client till (repeat for every other device):**

1. Press **Windows + R**, type `notepad`, press **Ctrl+Shift+Enter** (runs Notepad as Administrator)
2. In Notepad: **File → Open**, navigate to:
   ```
   C:\Windows\System32\drivers\etc\hosts
   ```
   Change the file-type filter from *Text Documents* to **All Files** so the `hosts` file appears
3. Add a new line at the bottom (replace `192.168.1.200` with your actual server IP from Option A):
   ```
   192.168.1.200   pos-server
   ```
4. Save and close

Staff can now reach the POS at:

```
http://pos-server:3000
```

Bookmark this URL in Chrome on each till.

> **Note:** The `hosts` file edit only affects that one PC. Repeat steps 1–4 on every client till.

---

### Which option should I use?

| | Option A only | Option A + Option B |
|---|---|---|
| Staff type | `http://192.168.1.200:3000` (once, then bookmark) | `http://pos-server:3000` (once, then bookmark) |
| Extra setup per client till | None | ~2 minutes (hosts file edit) |
| Works if IP changes? | No — that's why you set a static IP first | No — both depend on the static IP |
| **Recommended for most shops** | ✅ Yes | Optional — nice if staff prefer a name |

**Bottom line:** Do Option A. Once you bookmark the URL, staff never type it again. Add Option B only if you'd prefer a name over a number.

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
| "node is not recognised" | Node.js isn't installed or wasn't added to PATH — reinstall from nodejs.org and restart the PC |
| Server won't start | Make sure `.env` exists in the same folder as `start-server.bat` |
| "Cannot find module" errors | Delete `server\node_modules` and run `start-server.bat` again to reinstall |
| "client/dist not found" | Rebuild on Replit (`npm run build`) and copy `client/dist/` again |
| `pm2` command not found | PM2 isn't installed — run `setup-autostart.bat` as Administrator |
| Server doesn't start after reboot | Open Command Prompt and run `pm2 list`; if empty, check the task ran: open Task Scheduler (`taskschd.msc`) → find **PointifyPOS** → right-click → **Run** |
| `setup-autostart.bat` says "Run as administrator" | Right-click the file → **Run as administrator** |
| Task Scheduler task missing | Re-run `setup-autostart.bat` as Administrator to recreate it |

---

## Updating the app

### If you set up auto-start (PM2)

1. On Replit, make changes and run `npm run build`
2. Copy the new `server/dist/` and `client/dist/` folders to the server till (overwrite existing files)
3. Open Command Prompt and run:
   ```
   pm2 restart pointify-pos
   ```

### If you are using the manual start (start-server.bat)

1. On Replit, make changes and run `npm run build`
2. Stop the server (close the console window or press **Ctrl+C**)
3. Copy the new `server/dist/` and `client/dist/` folders to the server till (overwrite)
4. Start the server again with **`start-server.bat`**

> Dependencies only need reinstalling if `server/package.json` changed — `start-server.bat` handles this automatically on first run.
