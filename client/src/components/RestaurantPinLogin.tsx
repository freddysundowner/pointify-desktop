import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Delete } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';

const PIN_LENGTH = 5;

interface RestaurantPinLoginProps {
  onUsePasswordInstead: () => void;
}

/**
 * Fast PIN-only login for devices flagged as a restaurant till
 * (see `restaurantDeviceShopId` in localStorage, set from Shop Settings).
 * The attendant just taps their unique staff number — no password —
 * since `uniqueDigits` is unique across the whole SaaS and the backend
 * authenticates it directly against that attendant record.
 */
export default function RestaurantPinLogin({ onUsePasswordInstead }: RestaurantPinLoginProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAttendantAuth();
  const [pin, setPin] = useState('');

  const loginMutation = useMutation({
    mutationFn: async (uniqueDigits: string) => {
      const response = await fetch('/api/auth/attendant/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueDigits }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Invalid staff number');
      }
      return response.json();
    },
    onSuccess: (data) => {
      login(data.attendant, data.token, data?.shopData || {});
      toast({ title: 'Welcome back', description: data.attendant.username });
      const hasCanSell = data.attendant.permissions?.some((p: any) => p.key === 'pos' && p.value?.includes('can_sell'));
      sessionStorage.setItem('attendantLoginRedirect', 'true');
      setLocation(hasCanSell ? '/attendant/pos' : '/attendant/dashboard');
    },
    onError: (error: any) => {
      toast({ title: 'Login Failed', description: error.message || 'Invalid staff number.', variant: 'destructive' });
      setPin('');
    },
  });

  const handleDigit = (digit: string) => {
    if (loginMutation.isPending || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      loginMutation.mutate(next);
    }
  };

  const handleBackspace = () => {
    if (loginMutation.isPending) return;
    setPin((p) => p.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg,#7c3aed 0%,#9333ea 40%,#a855f7 100%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ padding: '56px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <button
          onClick={() => setLocation('/')}
          style={{ position: 'absolute', top: 56, left: 20, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft style={{ width: 18, height: 18, color: 'white' }} />
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>
          Staff Number
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>
          Enter your staff number to sign in
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.6)',
                background: i < pin.length ? 'white' : 'transparent',
                transition: 'background 0.1s',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, background: 'white', borderRadius: '28px 28px 0 0', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 320, margin: '0 auto', width: '100%' }}>
          {keys.map((key, i) => {
            if (key === '') return <div key={i} />;
            if (key === 'back') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  disabled={loginMutation.isPending}
                  style={{ height: 68, borderRadius: 18, border: 'none', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                >
                  <Delete style={{ width: 22, height: 22, color: '#6b7280' }} />
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(key)}
                disabled={loginMutation.isPending}
                style={{ height: 68, borderRadius: 18, border: 'none', background: '#f9fafb', fontSize: 26, fontWeight: 700, color: '#111827', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}
              >
                {key}
              </button>
            );
          })}
        </div>

        {loginMutation.isPending && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#9333ea', margin: 0 }}>Signing in…</p>
        )}

        <button
          onClick={onUsePasswordInstead}
          style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', margin: '4px 0 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}
        >
          Trouble signing in? Use PIN + password instead
        </button>
      </div>
    </div>
  );
}
