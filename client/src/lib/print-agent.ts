/**
 * Client for the Pointify Print Agent — a tiny helper program running on the
 * shop's till computer (http://localhost:9105) that forwards receipts to
 * ESC/POS network printers on the shop LAN. The cloud server can't reach a
 * shop's 192.168.x.x printer, but the browser at the till can reach the
 * agent, and the agent can reach the printer.
 */

const AGENT_URL = "http://localhost:9105";

/** Optional shared secret matching the agent's AGENT_TOKEN env var. */
function agentHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("printAgentToken");
  if (token) headers["X-Agent-Token"] = token;
  return headers;
}

export interface AgentPrinterTarget {
  ip: string;
  port: number;
}

/** Parse the saved TCP printer config ("ip" or "ip:port" + port field). */
export function parseTcpTarget(config: {
  interface?: string;
  port?: number;
}): AgentPrinterTarget | null {
  const iface = (config.interface || "").trim();
  if (!iface) return null;
  if (iface.includes(":")) {
    const [ip, portStr] = iface.split(":");
    return { ip: ip.trim(), port: parseInt(portStr) || 9100 };
  }
  return { ip: iface, port: config.port || 9100 };
}

/** True if the local print agent is running on this computer. */
export async function agentAvailable(timeoutMs = 1500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${AGENT_URL}/status`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

/** Send a built-in test receipt to the printer via the agent. */
export async function agentTestPrint(target: AgentPrinterTarget): Promise<void> {
  const res = await fetch(`${AGENT_URL}/test`, {
    method: "POST",
    headers: agentHeaders(),
    body: JSON.stringify(target),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Print agent could not reach the printer");
  }
}

/**
 * Try to print a sale receipt through the local agent.
 * Returns true if the agent handled it, false if the agent isn't running or
 * the printer config isn't a network (TCP) printer — caller should fall back.
 * Throws if the agent IS running but the print itself failed.
 */
export async function tryAgentPrintReceipt(
  printerConfig: { type?: string; interface?: string; port?: number; width?: number } | null | undefined,
  printData: any,
): Promise<boolean> {
  if (printerConfig?.type !== "TCP") return false;
  const target = parseTcpTarget(printerConfig);
  if (!target) return false;
  if (!(await agentAvailable())) return false;

  // Format the receipt on our server (single source of receipt layout)
  const res = await fetch("/api/printer/format", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...printData, width: printerConfig.width }),
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.text) {
    throw new Error(data.message || "Could not format receipt");
  }
  await agentPrintText(target, data.text);
  return true;
}

/** Print pre-formatted receipt text via the agent. */
export async function agentPrintText(
  target: AgentPrinterTarget,
  text: string,
): Promise<void> {
  const res = await fetch(`${AGENT_URL}/print`, {
    method: "POST",
    headers: agentHeaders(),
    body: JSON.stringify({ ...target, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Print agent could not reach the printer");
  }
}
