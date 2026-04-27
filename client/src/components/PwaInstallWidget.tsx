import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallWidget() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  if (installed || dismissed || !prompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        maxWidth: "300px",
        animation: "pwa-slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <style>{`
        @keyframes pwa-slide-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>

      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #9333ea, #7c3aed)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.25" />
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="white"
            fontFamily="Arial,sans-serif"
          >
            P
          </text>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#111827", lineHeight: 1.3 }}>
          Install Pointify
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280", lineHeight: 1.3 }}>
          Install once, sell anywhere.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            background: "linear-gradient(135deg, #9333ea, #7c3aed)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "transparent",
            color: "#9ca3af",
            border: "none",
            borderRadius: "8px",
            padding: "4px",
            fontSize: "12px",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
