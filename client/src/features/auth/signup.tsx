import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, Building2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, apiCall } from "@/lib/api-config";
import { useAuth } from "./useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState({ ownerName: "", email: "", phone: "", password: "", confirmPassword: "", affliate: "" });
  const { toast } = useToast();
  const { login } = useAuth();
  const isMobile = useIsMobile();

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
      toast({ title: "Account Created Successfully!", description: "Welcome to Pointify! Setting up your shop...", action: <CheckCircle className="w-4 h-4" /> });
    } catch (error) {
      toast({ title: "Registration Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <Button variant="ghost" onClick={() => setLocation("/business-login")} className="mb-6 text-gray-600 hover:text-purple-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Button>
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Create Account</CardTitle>
                <CardDescription className="text-gray-600 mt-2">Start using Pointify POS system</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Full Name</Label>
                    <Input id="ownerName" name="ownerName" type="text" placeholder="Enter your full name" value={formData.ownerName} onChange={handleInputChange} required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleInputChange} required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="Enter your phone number" value={formData.phone} onChange={handleInputChange} required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={formData.password} onChange={handleInputChange} required className="h-12 pr-12" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent">
                        {showPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleInputChange} required className="h-12 pr-12" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affliate">Referral Code (Optional)</Label>
                  <Input id="affliate" name="affliate" type="text" placeholder="Enter referral code if you have one" value={formData.affliate} onChange={handleInputChange} className="h-12" />
                  <p className="text-xs text-gray-500">Optional: Enter a referral code from an existing member</p>
                </div>
                <div className="flex items-start space-x-2 pt-4">
                  <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(checked) => setAcceptTerms(checked as boolean)} />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                      I agree to the{" "}
                      <Button variant="link" className="p-0 h-auto text-purple-600 hover:text-purple-700">Terms of Service</Button>{" "}
                      and{" "}
                      <Button variant="link" className="p-0 h-auto text-purple-600 hover:text-purple-700">Privacy Policy</Button>
                    </Label>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Button variant="link" onClick={() => setLocation("/business-login")} className="text-purple-600 hover:text-purple-700 p-0 h-auto font-medium">
                    Sign in here
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
  const focusIn = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#9333ea");
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#e5e7eb");

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#7c3aed 0%,#9333ea 40%,#a855f7 100%)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ padding: "56px 20px 28px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", flexShrink: 0 }}>
        <button onClick={() => setLocation("/business-login")} style={{ position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          <ArrowLeft style={{ width: 18, height: 18, color: "white" }} />
        </button>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Building2 style={{ width: 32, height: 32, color: "white" }} />
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Create Account</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Start using Pointify today</p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "28px 28px 0 0", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <form onSubmit={handleSubmit} style={{ padding: "28px 24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="ownerName">Full Name</label>
            <input id="ownerName" name="ownerName" type="text" placeholder="Enter your full name" value={formData.ownerName} onChange={handleInputChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleInputChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="phone">Phone Number</label>
            <input id="phone" name="phone" type="tel" placeholder="Enter your phone number" value={formData.phone} onChange={handleInputChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={formData.password} onChange={handleInputChange} required style={{ ...inputStyle, paddingRight: 48 }} onFocus={focusIn} onBlur={focusOut} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af" }}>
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Repeat your password" value={formData.confirmPassword} onChange={handleInputChange} required style={{ ...inputStyle, paddingRight: 48 }} onFocus={focusIn} onBlur={focusOut} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af" }}>
                {showConfirmPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="affliate">Referral Code <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <input id="affliate" name="affliate" type="text" placeholder="Enter referral code" value={formData.affliate} onChange={handleInputChange} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "4px 0" }}>
            <div onClick={() => setAcceptTerms(!acceptTerms)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, border: acceptTerms ? "none" : "2px solid #d1d5db", background: acceptTerms ? "linear-gradient(135deg,#7c3aed,#9333ea)" : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {acceptTerms && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
              I agree to the <span style={{ color: "#9333ea", fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: "#9333ea", fontWeight: 600 }}>Privacy Policy</span>
            </span>
          </label>
          <button type="submit" disabled={isLoading}
            style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: isLoading ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#9333ea)", color: "white", fontSize: 16, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", WebkitTapHighlightColor: "transparent", transition: "transform 0.1s", marginTop: 4 }}
            onPointerDown={e => !isLoading && (e.currentTarget.style.transform = "scale(0.97)")}
            onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isLoading ? "Creating Account…" : "Create Account"}
          </button>
          <p style={{ textAlign: "center", fontSize: 14, color: "#6b7280", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
            Already have an account?{" "}
            <button type="button" onClick={() => setLocation("/business-login")} style={{ background: "none", border: "none", color: "#9333ea", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
              Sign in
            </button>
          </p>
          <p style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>© 2026 Pointify. All rights reserved.</p>
        </form>
      </div>
    </div>
  );
}
