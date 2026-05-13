import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./useAuth";

export default function BusinessLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { toast } = useToast();
  const { login } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      setLocation("/");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "15px 16px", borderRadius: 14,
    border: "1.5px solid #e5e7eb", background: "#f9fafb",
    fontSize: 16, color: "#111827", outline: "none",
    fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 6,
    fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#7c3aed 0%,#9333ea 40%,#a855f7 100%)", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Header */}
      <div style={{ padding: "56px 20px 32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <button
          onClick={() => setLocation("/login")}
          style={{ position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
        >
          <ArrowLeft style={{ width: 18, height: 18, color: "white" }} />
        </button>

        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Building2 style={{ width: 32, height: 32, color: "white" }} />
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Business Owner</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Sign in to your dashboard</p>
      </div>

      {/* Form card — bottom sheet style */}
      <div style={{ flex: 1, background: "white", borderRadius: "28px 28px 0 0", padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label style={labelStyle} htmlFor="email">Email Address</label>
            <input
              id="email" name="email" type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "#9333ea")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle} htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="password" name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
                style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={e => (e.currentTarget.style.borderColor = "#9333ea")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#9ca3af" }}
              >
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: "right", marginTop: -8 }}>
            <button
              type="button"
              onClick={() => setLocation("/forgot-password")}
              style={{ background: "none", border: "none", color: "#9333ea", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%", padding: "16px", borderRadius: 16, border: "none",
              background: isLoading ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#9333ea)",
              color: "white", fontSize: 16, fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
              WebkitTapHighlightColor: "transparent",
              transition: "transform 0.1s",
              marginTop: 4,
            }}
            onPointerDown={e => !isLoading && (e.currentTarget.style.transform = "scale(0.97)")}
            onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Sign up link */}
        <p style={{ textAlign: "center", fontSize: 14, color: "#6b7280", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", margin: 0 }}>
          No account?{" "}
          <button
            onClick={() => setLocation("/signup")}
            style={{ background: "none", border: "none", color: "#9333ea", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}
          >
            Create one
          </button>
        </p>

        <p style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
          © 2026 Pointify. All rights reserved.
        </p>
      </div>
    </div>
  );
}
