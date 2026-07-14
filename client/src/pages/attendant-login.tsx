import { useState, Suspense } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, User, Lock, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { saveOfflineCredential, verifyOfflineCredential, isNetworkError } from '@/lib/offline-auth';
import RestaurantPinLogin from '@/components/RestaurantPinLogin';

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
  const isMobile = useIsMobile();
  // Restaurant Mode flags this browser (see shop-details.tsx) so staff can
  // sign in with just their unique staff number, no password. `useFallback`
  // lets someone bail out to the normal PIN+password form if the quick PIN
  // login isn't working for them.
  const isRestaurantDevice = !!localStorage.getItem('restaurantDeviceShopId');
  const [useFallback, setUseFallback] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: AttendantLoginForm) => {
      let response: Response;
      try {
        response = await fetch('/api/auth/attendant/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (err) {
        // Transport failure (server unreachable): fall back to verifying the
        // PIN/password against the cached verifier. This branch is ONLY reached
        // when no HTTP response came back — never on a server rejection below.
        if (isNetworkError(err)) {
          const credential = await verifyOfflineCredential('attendant', data.uniqueDigits, data.password);
          if (credential) {
            return { attendant: credential.profile, token: credential.token, shopData: credential.shopData || {} };
          }
          throw new Error("You're offline and we couldn't verify your PIN. Connect to the internet to sign in for the first time on this device.");
        }
        throw err;
      }

      // The server responded — its verdict is final, so a rejection here must
      // never fall through to offline verification.
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Login failed');
      }
      const result = await response.json();
      // Persist a salted verifier so this attendant can log in again offline.
      await saveOfflineCredential({
        role: 'attendant',
        identifier: data.uniqueDigits,
        password: data.password,
        token: result.token,
        profile: result.attendant,
        shopData: result?.shopData || {},
      });
      return result;
    },
    onSuccess: (data) => {
      login(data.attendant, data.token, data?.shopData || {});
      toast({ title: "Login Successful", description: `Welcome back, ${data.attendant.username}!` });
      const hasCanSell = data.attendant.permissions?.some((p: any) => p.key === 'pos' && p.value?.includes('can_sell'));
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

  if (isRestaurantDevice && !useFallback) {
    return <RestaurantPinLogin onUsePasswordInstead={() => setUseFallback(true)} />;
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <Button variant="ghost" onClick={() => setLocation('/')} className="text-purple-600 hover:text-purple-800 hover:bg-purple-50">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login Options
            </Button>
          </div>
          <Card className="shadow-lg border-purple-100">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                <span className="text-purple-600">P</span>ointify Staff
              </CardTitle>
              <CardDescription className="text-purple-600">Enter your PIN and password to access the system</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="uniqueDigits" className="text-sm font-medium text-purple-700">Staff PIN</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 h-4 w-4" />
                    <Input id="uniqueDigits" type="text" placeholder="Enter your 5-digit PIN" value={formData.uniqueDigits} onChange={e => setFormData(p => ({ ...p, uniqueDigits: e.target.value }))} className="pl-10 h-12 border-purple-200 focus:border-purple-500 focus:ring-purple-500" autoComplete="username" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-purple-700">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 h-4 w-4" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="pl-10 pr-10 h-12 border-purple-200 focus:border-purple-500 focus:ring-purple-500" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                {isRestaurantDevice && (
                  <button type="button" onClick={() => setUseFallback(false)} className="text-xs text-purple-600 hover:text-purple-800 mb-2 underline">
                    Back to quick staff-number login
                  </button>
                )}
                <p className="text-xs text-gray-500">Need help? Contact your administrator</p>
                <p className="text-xs text-gray-400 mt-1">PIN: Your 5-digit staff identification number</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "15px 16px 15px 44px", borderRadius: 14,
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
          <Users style={{ width: 32, height: 32, color: "white" }} />
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Staff Login</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>Enter your PIN and password</p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "28px 28px 0 0", padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="uniqueDigits">Staff PIN</label>
            <div style={{ position: "relative" }}>
              <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#9ca3af" }} />
              <input id="uniqueDigits" type="text" placeholder="Enter your 5-digit PIN" value={formData.uniqueDigits} onChange={e => setFormData(p => ({ ...p, uniqueDigits: e.target.value }))} style={inputStyle} autoComplete="username"
                onFocus={e => (e.currentTarget.style.borderColor = "#9333ea")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#9ca3af" }} />
              <input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} style={{ ...inputStyle, paddingRight: 48 }} autoComplete="current-password"
                onFocus={e => (e.currentTarget.style.borderColor = "#9333ea")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#9ca3af" }}>
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loginMutation.isPending}
            style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: loginMutation.isPending ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#9333ea)", color: "white", fontSize: 16, fontWeight: 700, cursor: loginMutation.isPending ? "not-allowed" : "pointer", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", WebkitTapHighlightColor: "transparent", transition: "transform 0.1s", marginTop: 4 }}
            onPointerDown={e => !loginMutation.isPending && (e.currentTarget.style.transform = "scale(0.97)")}
            onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {loginMutation.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
        {isRestaurantDevice && (
          <button type="button" onClick={() => setUseFallback(false)} style={{ textAlign: "center", fontSize: 13, color: "#9333ea", margin: 0, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
            Back to quick staff-number login
          </button>
        )}
        <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
          Need help? Contact your administrator
        </p>
        <p style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", margin: 0, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>© 2026 Pointify. All rights reserved.</p>
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
