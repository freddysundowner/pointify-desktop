import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

export default function BusinessLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { toast } = useToast();
  const { login } = useAuth();
  const isMobile = useIsMobile();

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

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" onClick={() => setLocation("/login")} className="mb-6 text-gray-600 hover:text-purple-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to role selection
          </Button>
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Business Owner Login</CardTitle>
                <CardDescription className="text-gray-600 mt-2">Access your Pointify dashboard</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleInputChange} required className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={handleInputChange} required className="h-12 pr-12" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent">
                      {showPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <Button type="button" variant="link" onClick={() => setLocation("/forgot-password")} className="text-sm text-purple-600 hover:text-purple-700 p-0 h-auto">
                    Forgot your password?
                  </Button>
                </div>
                <Button type="submit" className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Button variant="link" onClick={() => setLocation("/signup")} className="text-purple-600 hover:text-purple-700 p-0 h-auto font-medium">
                    Create one here
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">© 2026 Pointify. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#7c3aed 0%,#9333ea 40%,#a855f7 100%)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ padding: "56px 20px 32px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        <button onClick={() => setLocation("/login")} style={{ position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          <ArrowLeft style={{ width: 18, height: 18, color: "white" }} />
        </button>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Building2 style={{ width: 32, height: 32, color: "white" }} />
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Business Owner</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Sign in to your dashboard</p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "28px 28px 0 0", padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleInputChange} required style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "#9333ea")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={handleInputChange} required style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={e => (e.currentTarget.style.borderColor = "#9333ea")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#9ca3af" }}>
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>
          <div style={{ textAlign: "right", marginTop: -8 }}>
            <button type="button" onClick={() => setLocation("/forgot-password")} style={{ background: "none", border: "none", color: "#9333ea", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
              Forgot password?
            </button>
          </div>
          <button type="submit" disabled={isLoading}
            style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: isLoading ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#9333ea)", color: "white", fontSize: 16, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", WebkitTapHighlightColor: "transparent", transition: "transform 0.1s", marginTop: 4 }}
            onPointerDown={e => !isLoading && (e.currentTarget.style.transform = "scale(0.97)")}
            onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 14, color: "#6b7280", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", margin: 0 }}>
          No account?{" "}
          <button onClick={() => setLocation("/signup")} style={{ background: "none", border: "none", color: "#9333ea", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
            Create one
          </button>
        </p>
        <p style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>© 2026 Pointify. All rights reserved.</p>
      </div>
    </div>
  );
}
