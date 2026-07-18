# Pointify Print Agent

Lets the Pointify web app print receipts to ESC/POS **network printers** on a
shop's local network, even though the app itself is hosted in the cloud.

The web app (in the browser at the till) sends the receipt to the agent at
`http://localhost:9105`, and the agent forwards it over the shop LAN to the
printer's IP on port 9100.

## Install on a shop computer

### Option A — with Node.js installed
```
node pointify-print-agent.js
```

### Option B — single executable (no Node needed on shop PCs)
Build once on your own machine:
```
npm install -g pkg
pkg pointify-print-agent.js --targets node18-win-x64,node18-linux-x64 --output pointify-print-agent
```
This produces `pointify-print-agent.exe` (Windows) and `pointify-print-agent`
(Linux). Copy the right one to the shop computer and run it.

## Start automatically with the computer

### Windows
1. Press `Win + R`, type `shell:startup`, press Enter.
2. Copy a shortcut to `pointify-print-agent.exe` into that folder.

### Linux (systemd)
Create `/etc/systemd/system/pointify-print-agent.service`:
```
[Unit]
Description=Pointify Print Agent
After=network.target

[Service]
ExecStart=/usr/local/bin/pointify-print-agent
Restart=always

[Install]
WantedBy=multi-user.target
```
Then: `sudo systemctl enable --now pointify-print-agent`

## Using it in Pointify

1. Run the agent on the till computer.
2. In Pointify → printer settings, choose **Network (TCP/IP)**, enter the
   printer's IP (e.g. `192.168.1.2`) and port (`9100`), save.
3. The settings page shows **"Print agent: connected"** when the agent is
   detected. Press **Test** — a test receipt should print.

Receipts print through the agent automatically whenever it is running.
If the agent is not running, Pointify falls back to asking the server to
print (which only works when the server is on the same network as the
printer) and finally to the browser print dialog.

## Security notes

- The agent listens only on `localhost` — nothing else on the network can
  reach it.
- It refuses any print target that is not a **private LAN address**
  (10.x, 172.16-31.x, 192.168.x, 169.254.x) on **printer ports 9100–9103**,
  so it cannot be used to reach arbitrary hosts or services.
- Optional extra lock: set an `AGENT_TOKEN` environment variable before
  starting the agent, then in the browser at the till run
  `localStorage.setItem('printAgentToken', '<same value>')` once. With a
  token set, print requests without it are rejected.
- The printer IP/port come from the web app with each print job; the agent
  itself needs no other configuration.
- Change the port with the `AGENT_PORT` environment variable if 9105 is taken.
