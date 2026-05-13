import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

const DISMISSED_KEY = "pwa_install_dismissed_v2";

export function PwaInstallWidget() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosTooltip, setShowIosTooltip] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) { setInstalled(true); return; }
    if (localStorage.getItem(DISMISSED_KEY)) { setDismissed(true); return; }

    if (isIos()) {
      setIos(true);
      return;
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
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    setShowIosTooltip(false);
  };

  const handleAndroidInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  if (installed || dismissed) return null;

  const btnBase: React.CSSProperties = {
    position: "fixed",
    bottom: "24px",
    right: "16px",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "linear-gradient(135deg, #9333ea, #7c3aed)",
    color: "white",
    border: "none",
    borderRadius: "999px",
    padding: "10px 18px 10px 12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(147,51,234,0.45)",
    animation: "pwa-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  };

  if (ios) {
    return (
      <>
        <style>{`
          @keyframes pwa-pop { from { opacity:0; transform:scale(0.8) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
          @keyframes pwa-tooltip { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        `}</style>

        {/* iOS tooltip overlay */}
        {showIosTooltip && (
          <>
            <div
              onClick={() => setShowIosTooltip(false)}
              style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.4)" }}
            />
            <div style={{
              position: "fixed",
              bottom: "80px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              background: "white",
              borderRadius: "20px",
              padding: "20px",
              width: "calc(100vw - 40px)",
              maxWidth: "320px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
              animation: "pwa-tooltip 0.3s ease",
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            }}>
              <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: "16px", color: "#111827" }}>
                Add to Home Screen
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#9333ea,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">P</text>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#111827" }}>Pointify POS</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>pointifypos.com</p>
                </div>
              </div>

              <div style={{ background: "#f3f4f6", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
                  1. Tap <ShareIcon /> in Safari's toolbar below<br />
                  2. Tap <strong>"Add to Home Screen"</strong>
                </p>
              </div>

              {/* Arrow pointing down toward Safari toolbar */}
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleDismiss}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "white", fontSize: "14px", color: "#6b7280", cursor: "pointer", fontWeight: 600 }}
                >
                  Not now
                </button>
                <button
                  onClick={() => setShowIosTooltip(false)}
                  style={{ flex: 2, padding: "10px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#9333ea,#7c3aed)", fontSize: "14px", color: "white", cursor: "pointer", fontWeight: 700 }}
                >
                  Got it
                </button>
              </div>
            </div>
          </>
        )}

        {/* Floating install button */}
        {!showIosTooltip && (
          <button onClick={() => setShowIosTooltip(true)} style={btnBase}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Add to Home Screen
          </button>
        )}
      </>
    );
  }

  if (prompt) {
    return (
      <>
        <style>{`@keyframes pwa-pop { from { opacity:0; transform:scale(0.8) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
        <button onClick={handleAndroidInstall} style={btnBase}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Install App
        </button>
      </>
    );
  }

  return null;
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
