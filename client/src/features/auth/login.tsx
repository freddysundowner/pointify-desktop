import { useLocation } from "wouter";
import { User, UserCheck, MapPin } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#7c3aed 0%,#9333ea 50%,#a855f7 100%)", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Top: logo + tagline */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px 24px" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <text x="24" y="36" textAnchor="middle" fontSize="32" fontWeight="900" fill="white" fontFamily="-apple-system,Arial,sans-serif">P</text>
          </svg>
        </div>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: "white", letterSpacing: -0.5, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Pointify</h1>
        <p style={{ margin: "8px 0 0", fontSize: 15, color: "rgba(255,255,255,0.75)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>An enterprise at your hand.</p>
      </div>

      {/* Bottom: action buttons */}
      <div style={{ padding: "0 24px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Business Owner */}
        <button
          onClick={() => setLocation("/business-login")}
          style={{
            width: "100%", padding: "17px 20px", borderRadius: 16, border: "none",
            background: "white", color: "#7c3aed",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
            WebkitTapHighlightColor: "transparent",
            transition: "transform 0.1s",
          }}
          onPointerDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
          onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1f1235" }}>Business Owner</div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Admin dashboard &amp; management</div>
          </div>
        </button>

        {/* Attendant */}
        <button
          onClick={() => setLocation("/attendant/login")}
          style={{
            width: "100%", padding: "17px 20px", borderRadius: 16,
            border: "2px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.12)", color: "white",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
            fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
            WebkitTapHighlightColor: "transparent",
            transition: "transform 0.1s",
            backdropFilter: "blur(8px)",
          }}
          onPointerDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
          onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserCheck style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Staff / Attendant</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Access with assigned permissions</div>
          </div>
        </button>

        {/* Shops around you */}
        <button
          onClick={() => window.open("https://pointifypos.com/shops", "_blank")}
          style={{
            width: "100%", padding: "12px", borderRadius: 12, border: "none",
            background: "transparent", color: "rgba(255,255,255,0.6)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <MapPin style={{ width: 14, height: 14 }} />
          Shops Around You
        </button>

        <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
          © 2026 Pointify. All rights reserved.
        </p>
      </div>
    </div>
  );
}
