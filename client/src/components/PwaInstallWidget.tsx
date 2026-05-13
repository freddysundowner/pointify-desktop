import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

const DISMISSED_KEY = "pwa_install_dismissed";

export function PwaInstallWidget() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) { setInstalled(true); return; }
    if (sessionStorage.getItem(DISMISSED_KEY)) { setDismissed(true); return; }

    if (isIos()) {
      const timer = setTimeout(() => setShowIosGuide(true), 2500);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    setShowIosGuide(false);
  };

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  if (installed || dismissed) return null;

  const cardStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    padding: "16px 20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
    width: "calc(100vw - 32px)",
    maxWidth: "340px",
    animation: "pwa-slide-in 0.4s cubic-bezier(0.34,1.56,0.64,1)",
  };

  const iconBg: React.CSSProperties = {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #9333ea, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const AppIcon = () => (
    <div style={iconBg}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.25" />
        <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">P</text>
      </svg>
    </div>
  );

  const dismissBtn = (label = "Not now") => (
    <button onClick={handleDismiss} style={{ background: "transparent", color: "#9ca3af", border: "none", fontSize: "12px", cursor: "pointer", padding: "4px 0", textAlign: "center" as const }}>
      {label}
    </button>
  );

  if (showIosGuide) {
    return (
      <div style={cardStyle}>
        <style>{`@keyframes pwa-slide-in{from{opacity:0;transform:translate(-50%,20px) scale(0.95)}to{opacity:1;transform:translate(-50%,0) scale(1)}}`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <AppIcon />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#111827" }}>Install Pointify</p>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>Add to your Home Screen</p>
          </div>
          <button onClick={handleDismiss} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: "20px", color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: "0 0 0 8px" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Step n={1} text={<>Tap the <ShareIcon /> <strong>Share</strong> button in Safari's bottom toolbar</>} />
          <Step n={2} text={<>Scroll down and tap <strong>"Add to Home Screen"</strong></>} />
          <Step n={3} text={<>Tap <strong>"Add"</strong> — Pointify will appear on your home screen</>} />
        </div>

        <div style={{ marginTop: "12px", textAlign: "center" as const }}>
          {dismissBtn("Got it, thanks")}
        </div>
      </div>
    );
  }

  if (prompt) {
    return (
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "12px" }}>
        <style>{`@keyframes pwa-slide-in{from{opacity:0;transform:translate(-50%,20px) scale(0.95)}to{opacity:1;transform:translate(-50%,0) scale(1)}}`}</style>
        <AppIcon />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#111827" }}>Install Pointify</p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>Install once, sell anywhere.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
          <button onClick={handleInstall} style={{ background: "linear-gradient(135deg,#9333ea,#7c3aed)", color: "white", border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>
            Install
          </button>
          {dismissBtn()}
        </div>
      </div>
    );
  }

  return null;
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "linear-gradient(135deg,#9333ea,#7c3aed)", color: "white", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
        {n}
      </div>
      <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", margin: "0 2px" }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
