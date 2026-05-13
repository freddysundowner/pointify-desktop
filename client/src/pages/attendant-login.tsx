import { useState, Suspense } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, User, Lock, ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';

interface AttendantLoginForm {
  uniqueDigits: string;
  password: string;
}

function AttendantLoginContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAttendantAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AttendantLoginForm>({ uniqueDigits: '', password: '' });

  const loginMutation = useMutation({
    mutationFn: async (data: AttendantLoginForm) => {
      const response = await fetch('/api/auth/attendant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Login failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      login(data.attendant, data.token, data?.shopData || {});
      toast({ title: "Login Successful", description: `Welcome back, ${data.attendant.username}!` });
      const hasCanSell = data.attendant.permissions?.some((p: any) =>
        p.key === 'pos' && p.value?.includes('can_sell')
      );
      sessionStorage.setItem('attendantLoginRedirect', 'true');
      setLocation(hasCanSell ? '/attendant/pos' : '/attendant/dashboard');
    },
    onError: (error: any) => {
      toast({ title: "Login Failed", description: error.message || "Invalid PIN or password.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.uniqueDigits || !formData.password) {
      toast({ title: "Missing Information", description: "Please enter both your PIN and password.", variant: "destructive" });
      return;
    }
    loginMutation.mutate(formData);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "15px 16px 15px 44px", borderRadius: 14,
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
      <div style={{ padding: "56px 20px 32px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        <button
          onClick={() => setLocation("/login")}
          style={{ position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
        >
          <ArrowLeft style={{ width: 18, height: 18, color: "white" }} />
        </button>

        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Users style={{ width: 32, height: 32, color: "white" }} />
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Staff Login</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Enter your PIN and password</p>
      </div>

      {/* Form card */}
      <div style={{ flex: 1, background: "white", borderRadius: "28px 28px 0 0", padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Staff PIN */}
          <div>
            <label style={labelStyle} htmlFor="uniqueDigits">Staff PIN</label>
            <div style={{ position: "relative" }}>
              <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#9ca3af" }} />
              <input
                id="uniqueDigits" type="text"
                placeholder="Enter your 5-digit PIN"
                value={formData.uniqueDigits}
                onChange={e => setFormData(p => ({ ...p, uniqueDigits: e.target.value }))}
                style={inputStyle}
                autoComplete="username"
                onFocus={e => (e.currentTarget.style.borderColor = "#9333ea")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle} htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#9ca3af" }} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                style={{ ...inputStyle, paddingRight: 48 }}
                autoComplete="current-password"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%", padding: "16px", borderRadius: 16, border: "none",
              background: loginMutation.isPending ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#9333ea)",
              color: "white", fontSize: 16, fontWeight: 700,
              cursor: loginMutation.isPending ? "not-allowed" : "pointer",
              fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
              WebkitTapHighlightColor: "transparent",
              transition: "transform 0.1s",
              marginTop: 4,
            }}
            onPointerDown={e => !loginMutation.isPending && (e.currentTarget.style.transform = "scale(0.97)")}
            onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {loginMutation.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Help */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
          Need help? Contact your administrator
        </p>

        <p style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
          © 2026 Pointify. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function AttendantLogin() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#7c3aed,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    }>
      <AttendantLoginContent />
    </Suspense>
  );
}
