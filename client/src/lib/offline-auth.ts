// Offline authentication helpers.
// Stores a salted PBKDF2 verifier of the user's password (never the plaintext)
// so a previously-online user can log in while offline. On a successful online
// login we persist the verifier + token + profile; while offline we re-derive
// the verifier from the entered password and compare in constant time.
import { offlineStorage, OfflineCredential } from '@/lib/offline-storage';

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;
// Offline credentials (which carry a cached bearer token) expire after this
// window since the last successful ONLINE login, forcing a fresh online
// re-authentication so a stale device can't keep logging in offline forever.
const CREDENTIAL_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

// Detects whether an error is due to lost connectivity / server unreachable,
// as opposed to a genuine auth rejection (wrong password) from the server.
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!(error instanceof Error)) return false;
  const m = error.message.toLowerCase();
  return (
    error.name === 'AbortError' ||
    m.includes('unable to connect') ||
    m.includes('timeout') ||
    m.includes('networkerror') ||
    m.includes('failed to fetch') ||
    m.includes('not responding') ||
    m.includes('network')
  );
}

function generateSalt(): string {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return bufferToBase64(salt.buffer);
}

async function deriveVerifier(password: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BITS,
  );
  return bufferToBase64(bits);
}

// Constant-time string comparison to avoid leaking match progress via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

interface SaveCredentialInput {
  role: 'admin' | 'attendant';
  identifier: string;
  password: string;
  token: string;
  profile: any;
  shopData?: any;
  extra?: any;
}

// Persist a salted verifier for offline login. Silently no-ops (best effort) if
// Web Crypto is unavailable, since this must never block a real online login.
export async function saveOfflineCredential(input: SaveCredentialInput): Promise<void> {
  try {
    if (!cryptoAvailable() || !input.password) return;
    const identifier = normalizeIdentifier(input.identifier);
    if (!identifier) return;
    const salt = generateSalt();
    const verifier = await deriveVerifier(input.password, salt);
    const credential: OfflineCredential = {
      id: `${input.role}:${identifier}`,
      role: input.role,
      identifier,
      salt,
      verifier,
      token: input.token,
      profile: input.profile,
      shopData: input.shopData,
      extra: input.extra,
      updatedAt: Date.now(),
    };
    await offlineStorage.saveCredential(credential);
  } catch (err) {
    console.warn('Failed to save offline credential:', err);
  }
}

// Verify an offline login attempt. Returns the stored credential (with token +
// profile to restore the session) when the password matches, otherwise null.
export async function verifyOfflineCredential(
  role: 'admin' | 'attendant',
  identifier: string,
  password: string,
): Promise<OfflineCredential | null> {
  if (!cryptoAvailable()) return null;
  const record = await offlineStorage.getCredential(role, identifier);
  if (!record) return null;
  // Reject credentials that haven't been refreshed by an online login recently.
  if (record.updatedAt && Date.now() - record.updatedAt > CREDENTIAL_MAX_AGE_MS) {
    console.warn('Offline credential expired; online re-authentication required.');
    return null;
  }
  const candidate = await deriveVerifier(password, record.salt);
  return timingSafeEqual(candidate, record.verifier) ? record : null;
}

export async function hasOfflineCredential(
  role: 'admin' | 'attendant',
  identifier: string,
): Promise<boolean> {
  const record = await offlineStorage.getCredential(role, identifier);
  return !!record;
}
