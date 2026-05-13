import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, Building2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, apiCall } from "@/lib/api-config";
import { useAuth } from "./useAuth";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState({
    ownerName: "", email: "", phone: "",
    password: "", confirmPassword: "", affliate: "",
  });
  const { toast } = useToast();
  const { login } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return false;
    }
    if (formData.password.length < 8) {
      toast({ title: "Weak Password", description: "Password must be at least 8 characters.", variant: "destructive" });
      return false;
    }
    if (!acceptTerms) {
      toast({ title: "Terms Required", description: "Please accept the terms to continue.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await apiCall(API_ENDPOINTS.auth.register, {
        method: "POST",
        body: JSON.stringify({
          username: formData.ownerName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          firstName: formData.ownerName.split(" ")[0],
          lastName: formData.ownerName.split(" ").slice(1).join(" "),
          ...(formData.affliate && { affliate: formData.affliate }),
        }),
      });
      await login(formData.email, formData.password);
      toast({ title: "Account Created!", description: "Welcome to Pointify!", action: <CheckCircle className="w-4 h-4" /> });
    } catch (error) {
      toast({ title: "Registration Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "15px 16px", borderRadius: 14,
    border: "1.5px solid #e5e7eb", background: "#f9fafb",
    fontSize: 16, color: "#111827", outline: "none",
    fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
    boxSizing: "border-box", transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 6,
    fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
  };

  const focusIn = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#9333ea");
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#e5e7eb");

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#7c3aed 0%,#9333ea 40%,#a855f7 100%)", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Header */}
      <div style={{ padding: "56px 20px 28px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setLocation("/business-login")}
          style={{ position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
        >
          <ArrowLeft style={{ width: 18, height: 18, color: "white" }} />
        </button>

        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Building2 style={{ width: 32, height: 32, color: "white" }} />
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Create Account</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Start using Pointify today</p>
      </div>

      {/* Scrollable form sheet */}
      <div style={{ flex: 1, background: "white", borderRadius: "28px 28px 0 0", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <form onSubmit={handleSubmit} style={{ padding: "28px 24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Full Name */}
          <div>
            <label style={labelStyle} htmlFor="ownerName">Full Name</label>
            <input id="ownerName" name="ownerName" type="text" placeholder="Enter your full name"
              value={formData.ownerName} onChange={handleInputChange} required
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle} htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" placeholder="you@example.com"
              value={formData.email} onChange={handleInputChange} required
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle} htmlFor="phone">Phone Number</label>
            <input id="phone" name="phone" type="tel" placeholder="Enter your phone number"
              value={formData.phone} onChange={handleInputChange} required
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle} htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input id="password" name="password" type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={formData.password} onChange={handleInputChange} required
                style={{ ...inputStyle, paddingRight: 48 }} onFocus={focusIn} onBlur={focusOut} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af" }}>
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={labelStyle} htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={formData.confirmPassword} onChange={handleInputChange} required
                style={{ ...inputStyle, paddingRight: 48 }} onFocus={focusIn} onBlur={focusOut} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af" }}>
                {showConfirmPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>

          {/* Referral code */}
          <div>
            <label style={labelStyle} htmlFor="affliate">Referral Code <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <input id="affliate" name="affliate" type="text" placeholder="Enter referral code"
              value={formData.affliate} onChange={handleInputChange}
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Terms */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "4px 0" }}>
            <div
              onClick={() => setAcceptTerms(!acceptTerms)}
              style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                border: acceptTerms ? "none" : "2px solid #d1d5db",
                background: acceptTerms ? "linear-gradient(135deg,#7c3aed,#9333ea)" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {acceptTerms && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
              I agree to the{" "}
              <span style={{ color: "#9333ea", fontWeight: 600 }}>Terms of Service</span>
              {" "}and{" "}
              <span style={{ color: "#9333ea", fontWeight: 600 }}>Privacy Policy</span>
            </span>
          </label>

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
            {isLoading ? "Creating Account…" : "Create Account"}
          </button>

          <p style={{ textAlign: "center", fontSize: 14, color: "#6b7280", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
            Already have an account?{" "}
            <button type="button" onClick={() => setLocation("/business-login")}
              style={{ background: "none", border: "none", color: "#9333ea", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
              Sign in
            </button>
          </p>

          <p style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
            © 2026 Pointify. All rights reserved.
          </p>

        </form>
      </div>
    </div>
  );
}
