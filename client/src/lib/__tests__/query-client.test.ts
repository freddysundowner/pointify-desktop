// Unit tests for the React Query data-fetching layer (lib/queryClient.ts):
// parseApiError (turns raw error bodies into human-readable messages),
// apiRequest (attendant-first auth + throw-on-non-2xx), and getQueryFn
// (on401 "returnNull" vs "throw"). A regression here would show staff raw
// JSON blobs in toasts or silently return null data.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { parseApiError, apiRequest, getQueryFn } from '../queryClient';

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
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const lastInit = () => fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1];
const lastHeaders = () => new Headers(lastInit().headers);

// ---------------------------------------------------------------------------
// parseApiError — message extraction and fallbacks
// ---------------------------------------------------------------------------
describe('parseApiError', () => {
  it('extracts "error" from a JSON body', () => {
    const body = JSON.stringify({
      error: 'Selling price must be greater than buying price',
      success: false,
      httpStatus: 400,
    });
    expect(parseApiError(400, body)).toBe('Selling price must be greater than buying price');
  });

  it('extracts "message" when "error" is absent', () => {
    expect(parseApiError(400, JSON.stringify({ message: 'Duplicate item name' }))).toBe(
      'Duplicate item name',
    );
  });

  it('prefers "error" over "message" when both exist', () => {
    expect(
      parseApiError(400, JSON.stringify({ error: 'from error', message: 'from message' })),
    ).toBe('from error');
  });

  it('passes plain-text bodies through as-is', () => {
    expect(parseApiError(400, 'Upstream rejected the request')).toBe(
      'Upstream rejected the request',
    );
  });

  it('does NOT dump a JSON blob without a usable message into the toast', () => {
    expect(parseApiError(400, JSON.stringify({ success: false, code: 17 }))).toBe(
      'Request failed (400).',
    );
  });

  it('does NOT show malformed JSON-looking bodies as-is', () => {
    expect(parseApiError(400, '{"broken":')).toBe('Request failed (400).');
    expect(parseApiError(500, '[1,2,')).toBe(
      'Something went wrong on the server. Please try again.',
    );
  });

  it('ignores non-string or blank error fields and falls back', () => {
    expect(parseApiError(404, JSON.stringify({ error: { nested: true } }))).toBe('Not found.');
    expect(parseApiError(401, JSON.stringify({ error: '   ' }))).toBe(
      'You are not authorized to do that.',
    );
  });

  it('uses status-based fallbacks for empty bodies', () => {
    expect(parseApiError(401, '')).toBe('You are not authorized to do that.');
    expect(parseApiError(403, '')).toBe('You are not authorized to do that.');
    expect(parseApiError(404, '')).toBe('Not found.');
    expect(parseApiError(500, '')).toBe('Something went wrong on the server. Please try again.');
    expect(parseApiError(503, '')).toBe('Something went wrong on the server. Please try again.');
    expect(parseApiError(418, '')).toBe('Request failed (418).');
  });

  it('handles whitespace-only bodies like empty ones', () => {
    expect(parseApiError(404, '   \n ')).toBe('Not found.');
  });
});

// ---------------------------------------------------------------------------
// apiRequest — auth, headers, and throw-on-non-2xx
// ---------------------------------------------------------------------------
describe('apiRequest', () => {
  it('uses attendant-first token precedence', async () => {
    store.set('authToken', 'admin-t');
    store.set('attendantToken', 'att-t');
    await apiRequest('GET', '/api/x');
    expect(lastHeaders().get('authorization')).toBe('Bearer att-t');
  });

  it('falls back to the admin token when no attendant token exists', async () => {
    store.set('authToken', 'admin-t');
    await apiRequest('GET', '/api/x');
    expect(lastHeaders().get('authorization')).toBe('Bearer admin-t');
  });

  it('sets Content-Type and JSON body only when data is present', async () => {
    await apiRequest('POST', '/api/x', { name: 'Chips' });
    expect(lastHeaders().get('content-type')).toBe('application/json');
    expect(lastInit().body).toBe(JSON.stringify({ name: 'Chips' }));
  });

  it('omits Content-Type and body when no data is passed', async () => {
    await apiRequest('DELETE', '/api/x');
    expect(lastHeaders().get('content-type')).toBeNull();
    expect(lastInit().body).toBeUndefined();
  });

  it('passes the method and includes credentials', async () => {
    await apiRequest('PUT', '/api/x', { a: 1 });
    expect(lastInit().method).toBe('PUT');
    expect(lastInit().credentials).toBe('include');
  });

  it('returns the raw Response on success', async () => {
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const res = await apiRequest('GET', '/api/x');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('throws the parsed server message on non-2xx', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Price too low' }), { status: 400 }),
    );
    await expect(apiRequest('POST', '/api/x', { p: 1 })).rejects.toThrow('Price too low');
  });

  it('falls back to statusText when the error body is empty', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 418, statusText: 'I am a teapot' }));
    await expect(apiRequest('GET', '/api/x')).rejects.toThrow('I am a teapot');
  });

  it('throws a friendly message on 401 with an empty body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    await expect(apiRequest('GET', '/api/x')).rejects.toThrow(
      'You are not authorized to do that.',
    );
  });
});

// ---------------------------------------------------------------------------
// getQueryFn — on401 behavior and success parsing
// ---------------------------------------------------------------------------
const runQuery = (on401: 'returnNull' | 'throw', key = '/api/things') =>
  getQueryFn({ on401 })({ queryKey: [key] } as any);

describe('getQueryFn', () => {
  it('parses and returns JSON on success', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [1, 2] }), { status: 200 }),
    );
    await expect(runQuery('throw')).resolves.toEqual({ items: [1, 2] });
  });

  it('uses queryKey[0] as the request URL', async () => {
    await runQuery('throw', '/api/products/list');
    expect(fetchMock.mock.calls[0][0]).toContain('/api/products/list');
  });

  it('uses attendant-first token precedence', async () => {
    store.set('authToken', 'admin-t');
    store.set('attendantToken', 'att-t');
    await runQuery('throw');
    expect(lastHeaders().get('authorization')).toBe('Bearer att-t');
  });

  it('returns null on 401 when on401 is "returnNull"', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    await expect(runQuery('returnNull')).resolves.toBeNull();
  });

  it('throws on 401 when on401 is "throw"', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    await expect(runQuery('throw')).rejects.toThrow('You are not authorized to do that.');
  });

  it('still throws on non-401 errors even with "returnNull"', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server exploded' }), { status: 500 }),
    );
    await expect(runQuery('returnNull')).rejects.toThrow('Server exploded');
  });

  it('does NOT return null on 403 with "returnNull" — only 401 is special', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 403 }));
    await expect(runQuery('returnNull')).rejects.toThrow('You are not authorized to do that.');
  });
});
