// Unit tests for the canonical API transport (rawApiFetch / apiCall /
// isNetworkError in lib/api-config.ts). Every screen's requests flow through
// this layer, so regressions here (wrong token, misfiring offline detection,
// broken timeout) would silently break the whole till at once.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  rawApiFetch,
  apiCall,
  isNetworkError,
  getAuthToken,
} from '../api-config';

// ---------------------------------------------------------------------------
// Test environment shims (vitest runs in node; the transport expects browser
// globals: localStorage, navigator.onLine, window.location).
// ---------------------------------------------------------------------------
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
(globalThis as any).navigator = { onLine: true };
(globalThis as any).window = { location: { href: '' } };

const fetchMock = vi.fn();

beforeEach(() => {
  store.clear();
  (globalThis as any).navigator.onLine = true;
  (globalThis as any).window.location.href = '';
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const lastInit = () => fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1];
const lastAuthHeader = () => {
  const headers = lastInit().headers as Record<string, string>;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'authorization');
  return key ? headers[key] : undefined;
};

// ---------------------------------------------------------------------------
// getAuthToken — token precedence
// ---------------------------------------------------------------------------
describe('getAuthToken', () => {
  it('returns null for "none" even when tokens exist', () => {
    store.set('authToken', 'admin-t');
    store.set('attendantToken', 'att-t');
    expect(getAuthToken('none')).toBeNull();
  });

  it('admin-first prefers admin token, falls back to attendant', () => {
    store.set('attendantToken', 'att-t');
    expect(getAuthToken('admin-first')).toBe('att-t');
    store.set('authToken', 'admin-t');
    expect(getAuthToken('admin-first')).toBe('admin-t');
  });

  it('attendant-first prefers attendant token, falls back to admin', () => {
    store.set('authToken', 'admin-t');
    expect(getAuthToken('attendant-first')).toBe('admin-t');
    store.set('attendantToken', 'att-t');
    expect(getAuthToken('attendant-first')).toBe('att-t');
  });
});

// ---------------------------------------------------------------------------
// rawApiFetch — auth attachment
// ---------------------------------------------------------------------------
describe('rawApiFetch auth', () => {
  it('attaches no Authorization header with auth "none"', async () => {
    store.set('authToken', 'admin-t');
    await rawApiFetch('/api/x', { auth: 'none' });
    expect(lastAuthHeader()).toBeUndefined();
  });

  it('defaults to admin-first', async () => {
    store.set('authToken', 'admin-t');
    store.set('attendantToken', 'att-t');
    await rawApiFetch('/api/x');
    expect(lastAuthHeader()).toBe('Bearer admin-t');
  });

  it('attendant-first attaches the attendant token', async () => {
    store.set('authToken', 'admin-t');
    store.set('attendantToken', 'att-t');
    await rawApiFetch('/api/x', { auth: 'attendant-first' });
    expect(lastAuthHeader()).toBe('Bearer att-t');
  });

  it('sends no Authorization header when no tokens are stored', async () => {
    await rawApiFetch('/api/x');
    expect(lastAuthHeader()).toBeUndefined();
  });

  it('an explicit Authorization header always wins over stored tokens', async () => {
    store.set('authToken', 'admin-t');
    await rawApiFetch('/api/x', {
      auth: 'admin-first',
      headers: { Authorization: 'Bearer explicit-t' },
    });
    expect(lastAuthHeader()).toBe('Bearer explicit-t');
  });

  it('explicit Authorization wins regardless of header name casing', async () => {
    store.set('authToken', 'admin-t');
    await rawApiFetch('/api/x', { headers: { authorization: 'Bearer lower-t' } });
    const headers = lastInit().headers as Record<string, string>;
    const authKeys = Object.keys(headers).filter((k) => k.toLowerCase() === 'authorization');
    expect(authKeys).toHaveLength(1);
    expect(headers[authKeys[0]]).toBe('Bearer lower-t');
  });

  it('preserves other caller headers', async () => {
    await rawApiFetch('/api/x', { headers: { 'Content-Type': 'application/json' } });
    const headers = new Headers(lastInit().headers);
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('preserves headers passed as a Headers instance (incl. explicit auth)', async () => {
    store.set('authToken', 'admin-t');
    const h = new Headers();
    h.set('Authorization', 'Bearer explicit-t');
    h.set('X-Custom', 'yes');
    await rawApiFetch('/api/x', { headers: h });
    const sent = new Headers(lastInit().headers);
    expect(sent.get('authorization')).toBe('Bearer explicit-t');
    expect(sent.get('x-custom')).toBe('yes');
  });

  it('preserves headers passed as a tuple array (incl. explicit auth)', async () => {
    store.set('authToken', 'admin-t');
    await rawApiFetch('/api/x', {
      headers: [
        ['Authorization', 'Bearer tuple-t'],
        ['X-Other', 'ok'],
      ],
    });
    const sent = new Headers(lastInit().headers);
    expect(sent.get('authorization')).toBe('Bearer tuple-t');
    expect(sent.get('x-other')).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// rawApiFetch — response / error semantics
// ---------------------------------------------------------------------------
describe('rawApiFetch response semantics', () => {
  it('does NOT throw on non-2xx — returns the raw Response', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    const res = await rawApiFetch('/api/x');
    expect(res.status).toBe(500);
    expect(res.ok).toBe(false);
  });

  it('rejects with the browser-native error on transport failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(rawApiFetch('/api/x')).rejects.toThrow('Failed to fetch');
  });
});

// ---------------------------------------------------------------------------
// rawApiFetch — timeout behavior
// ---------------------------------------------------------------------------
describe('rawApiFetch timeout', () => {
  // Real fetch rejects with the signal's ACTUAL abort reason — reproduce that
  // exactly instead of fabricating an error shape.
  const rejectWithRealAbortReason = () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => {
          reject((init.signal as AbortSignal).reason);
        });
      });
    });
  };

  it('aborts the request after timeoutMs with a proper AbortError reason', async () => {
    vi.useFakeTimers();
    rejectWithRealAbortReason();
    const p = rawApiFetch('/api/slow', { timeoutMs: 5000 });
    const guarded = p.catch((e) => e);
    await vi.advanceTimersByTimeAsync(5001);
    const err = await guarded;
    // The production abort reason must be a real AbortError, not a string.
    expect(err).not.toBeTypeOf('string');
    expect(err.name).toBe('AbortError');
    // And offline detection must recognize it.
    expect(isNetworkError(err)).toBe(true);
  });

  it('passes no signal when timeoutMs is 0 (default)', async () => {
    await rawApiFetch('/api/x');
    expect(lastInit().signal).toBeUndefined();
  });

  it('a caller-supplied signal disables the internal timeout', async () => {
    const controller = new AbortController();
    await rawApiFetch('/api/x', { timeoutMs: 5000, signal: controller.signal });
    expect(lastInit().signal).toBe(controller.signal);
  });
});

// ---------------------------------------------------------------------------
// apiCall — high-level wrapper
// ---------------------------------------------------------------------------
describe('apiCall', () => {
  it('strips caller-supplied signals and enforces its own 20s timeout signal', async () => {
    const controller = new AbortController();
    await apiCall('/api/x', { signal: controller.signal });
    const init = lastInit();
    expect(init.signal).toBeDefined();
    expect(init.signal).not.toBe(controller.signal);
  });

  it('sends no-cache headers and includes credentials', async () => {
    await apiCall('/api/x');
    const init = lastInit();
    const headers = new Headers(init.headers);
    expect(headers.get('cache-control')).toContain('no-store');
    expect(init.credentials).toBe('include');
  });

  it('uses admin-first token precedence', async () => {
    store.set('authToken', 'admin-t');
    store.set('attendantToken', 'att-t');
    await apiCall('/api/x');
    expect(lastAuthHeader()).toBe('Bearer admin-t');
  });

  it('throws the server-provided error message on non-2xx', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Price too low' }), { status: 400 }),
    );
    await expect(apiCall('/api/x')).rejects.toThrow('Price too low');
  });

  it('maps a REAL 20s timeout to "Request timeout. The server is not responding."', async () => {
    vi.useFakeTimers();
    // Reject with the signal's actual abort reason, like real fetch does.
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => {
          reject((init.signal as AbortSignal).reason);
        });
      });
    });
    const guarded = apiCall('/api/slow').catch((e) => e);
    await vi.advanceTimersByTimeAsync(20001);
    const err = await guarded;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Request timeout. The server is not responding.');
    expect(isNetworkError(err)).toBe(true);
  });

  it('maps a string abort rejection to the timeout message too', async () => {
    fetchMock.mockRejectedValue('Request timeout after 20 seconds');
    await expect(apiCall('/api/x')).rejects.toThrow(/not responding/i);
  });

  it('maps native fetch failure to "Unable to connect" message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiCall('/api/x')).rejects.toThrow(/unable to connect/i);
  });
});

// ---------------------------------------------------------------------------
// isNetworkError — offline detection
// ---------------------------------------------------------------------------
describe('isNetworkError', () => {
  it('matches Chrome native fetch failure', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('matches Firefox native fetch failure', () => {
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
  });

  it('matches the messages apiCall throws on dropped connections', () => {
    expect(isNetworkError(new Error('Unable to connect to server. Please verify the server is running.'))).toBe(true);
    expect(isNetworkError(new Error('Request timeout. The server is not responding.'))).toBe(true);
  });

  it('matches AbortError by name', () => {
    const e = new Error('whatever');
    e.name = 'AbortError';
    expect(isNetworkError(e)).toBe(true);
  });

  it('matches a plain-string timeout abort reason', () => {
    expect(isNetworkError('Request timeout after 20 seconds')).toBe(true);
  });

  it('does NOT match an arbitrary string error', () => {
    expect(isNetworkError('Selling price must be greater than buying price')).toBe(false);
  });

  it('returns true when the device reports offline, regardless of error', () => {
    (globalThis as any).navigator.onLine = false;
    expect(isNetworkError(new Error('anything'))).toBe(true);
  });

  it('does NOT match real server-side rejections', () => {
    expect(isNetworkError(new Error('Selling price must be greater than buying price'))).toBe(false);
    expect(isNetworkError(new Error('You are not authorized to do that.'))).toBe(false);
  });

  it('does NOT match a validation error merely containing the word "network"', () => {
    expect(isNetworkError(new Error('Please select a mobile network provider'))).toBe(false);
  });

  it('returns false for null/undefined when online', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
