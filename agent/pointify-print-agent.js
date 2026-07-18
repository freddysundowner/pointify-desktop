#!/usr/bin/env node
/**
 * Pointify Print Agent
 * ────────────────────
 * A tiny bridge that lets the Pointify web app (hosted anywhere) print to
 * ESC/POS network printers on THIS shop's local network.
 *
 * Run it on any computer in the shop (usually the till PC):
 *   node pointify-print-agent.js
 *
 * The web app talks to it at http://localhost:9105 and tells it which
 * printer IP/port to use — the agent itself needs no configuration.
 *
 * Endpoints:
 *   GET  /status  → { ok: true, version }
 *   POST /print   → { ip, port, text }  — prints ESC/POS text and cuts
 *   POST /test    → { ip, port }        — prints a built-in test receipt
 */

const http = require('http');
const net = require('net');

const PORT = parseInt(process.env.AGENT_PORT || '9105', 10);
const VERSION = '1.0.0';

// Optional shared secret: if AGENT_TOKEN is set, /print and /test require
// an "X-Agent-Token" header with the same value.
const AGENT_TOKEN = process.env.AGENT_TOKEN || '';

// Only allow printing to private (shop-LAN) addresses on ESC/POS printer
// ports, so a malicious web page can't use the agent to reach arbitrary
// hosts or services.
const ALLOWED_PORTS = new Set([9100, 9101, 9102, 9103]);

function isPrivateIp(ip) {
  if (ip === 'localhost' || ip === '127.0.0.1') return true;
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (m.slice(1).some((o) => parseInt(o, 10) > 255)) return false;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

// ─── ESC/POS ──────────────────────────────────────────────────────────────
const ESC = 0x1b, GS = 0x1d;
const ESC_INIT = Buffer.from([ESC, 0x40]);
const ESC_LEFT = Buffer.from([ESC, 0x61, 0x00]);
const ESC_FEED = Buffer.from([ESC, 0x64, 0x04]);
const ESC_CUT  = Buffer.from([GS, 0x56, 0x41, 0x00]);

function buildBuffer(text) {
  return Buffer.concat([ESC_INIT, ESC_LEFT, Buffer.from(text, 'utf8'), ESC_FEED, ESC_CUT]);
}

// ─── TCP send ─────────────────────────────────────────────────────────────
function printViaTCP(ip, port, data) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const fail = (err) => { if (!settled) { settled = true; socket.destroy(); reject(err); } };
    socket.setTimeout(8000);
    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) return fail(err);
        setTimeout(() => { if (!settled) { settled = true; socket.end(); resolve(); } }, 300);
      });
    });
    socket.on('timeout', () => fail(new Error(`Timed out connecting to ${ip}:${port} — check the printer is on and the IP is right`)));
    socket.on('error', (err) => fail(err));
  });
}

// ─── HTTP server ──────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Agent-Token');
  // Chrome Private Network Access: allow a public https page to call localhost
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function json(res, code, obj) {
  setCors(res);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { setCors(res); res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && req.url === '/status') {
    return json(res, 200, { ok: true, agent: 'pointify-print-agent', version: VERSION });
  }

  if (req.method === 'POST' && (req.url === '/print' || req.url === '/test')) {
    let body;
    try { body = await readBody(req); }
    catch (e) { return json(res, 400, { success: false, message: e.message }); }

    if (AGENT_TOKEN && req.headers['x-agent-token'] !== AGENT_TOKEN) {
      return json(res, 401, { success: false, message: 'Invalid or missing agent token' });
    }

    const ip = String(body.ip || '').trim();
    const port = parseInt(body.port, 10) || 9100;
    if (!ip) return json(res, 400, { success: false, message: 'Printer IP is required' });
    if (!isPrivateIp(ip)) {
      return json(res, 400, { success: false, message: `Refusing to print to ${ip} — only local-network (private) printer addresses are allowed` });
    }
    if (!ALLOWED_PORTS.has(port)) {
      return json(res, 400, { success: false, message: `Refusing port ${port} — only printer ports 9100-9103 are allowed` });
    }

    const text = req.url === '/test'
      ? [
          '================================\n',
          '     POINTIFY PRINT AGENT\n',
          '         TEST PRINT\n',
          '================================\n',
          `Printer: ${ip}:${port}\n`,
          `Date:    ${new Date().toLocaleString()}\n`,
          '================================\n',
          '  Printing works correctly!\n',
          '================================\n',
          '\n\n\n',
        ].join('')
      : String(body.text || '');

    if (!text) return json(res, 400, { success: false, message: 'Nothing to print' });

    try {
      await printViaTCP(ip, port, buildBuffer(text));
      console.log(`[${new Date().toISOString()}] Printed to ${ip}:${port} (${text.length} chars)`);
      return json(res, 200, { success: true, message: 'Printed' });
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Print failed:`, err.message);
      return json(res, 502, { success: false, message: err.message });
    }
  }

  json(res, 404, { success: false, message: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('──────────────────────────────────────────────');
  console.log(` Pointify Print Agent v${VERSION}`);
  console.log(` Listening on http://localhost:${PORT}`);
  console.log(' Keep this window open (or install as a service)');
  console.log('──────────────────────────────────────────────');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use — is the agent already running?`);
  } else {
    console.error('Agent failed to start:', err.message);
  }
  process.exit(1);
});
