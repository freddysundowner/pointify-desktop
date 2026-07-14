import { useState, FormEvent } from 'react';
import { Lock, Eye, EyeOff, LogOut } from 'lucide-react';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Full-screen lock overlay for restaurant shops. The attendant's session
 * stays intact underneath (cart, in-progress orders, etc.) — this just
 * blocks interaction until the same attendant re-enters their password,
 * so a co-worker can't walk up and sell under someone else's account.
 */
export function AttendantLockScreen() {
  const { attendant, shopData, isLocked, unlockScreen, logout } = useAttendantAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRestaurant = !!shopData?.isRestaurant;

  if (!isLocked || !attendant || !isRestaurant) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsSubmitting(true);
    setError('');
    try {
      await unlockScreen(password);
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Incorrect password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Screen Locked</h1>
          <p className="text-sm text-slate-500 mt-1">{shopData?.name || 'This till'} is locked</p>
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className="text-slate-700 font-medium">{attendant.username}</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono tracking-wider">
              {attendant.uniqueDigits}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Enter your password to continue
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Password"
                autoFocus
                className="w-full h-11 px-3 pr-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
          </div>

          <Button type="submit" className="w-full h-11" disabled={isSubmitting || !password}>
            {isSubmitting ? 'Unlocking…' : 'Unlock'}
          </Button>
        </form>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mt-5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Not you? Sign out instead
        </button>
      </div>
    </div>
  );
}
