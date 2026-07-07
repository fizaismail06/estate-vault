/**
 * Estate Vault — client-side encryption
 *
 * Same pattern as Account Registry: data is encrypted in the browser with a key
 * derived from your Master Password BEFORE it ever reaches Firestore. Firestore
 * only ever stores ciphertext. The Master Password itself is never stored,
 * synced, or transmitted anywhere — it lives only with you and your lawyer.
 *
 * Algorithm: PBKDF2 (200,000 iterations, SHA-256) -> AES-GCM 256-bit key
 */

const PBKDF2_ITERATIONS = 200_000;

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Derive an AES-GCM key from the master password + a per-user salt. */
async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Generate a new random salt for a user. Store this in Firestore (not secret). */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufToBase64(salt.buffer);
}

/** Verify a master password against a stored verification tag (does not decrypt real data). */
export async function makeVerifier(masterPassword: string, saltB64: string): Promise<string> {
  const salt = new Uint8Array(base64ToBuf(saltB64));
  const key = await deriveKey(masterPassword, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode('estate-vault-verify')
  );
  return `${bufToBase64(iv.buffer)}.${bufToBase64(cipher)}`;
}

export async function checkVerifier(masterPassword: string, saltB64: string, verifier: string): Promise<boolean> {
  try {
    const [ivB64, cipherB64] = verifier.split('.');
    const salt = new Uint8Array(base64ToBuf(saltB64));
    const key = await deriveKey(masterPassword, salt);
    const iv = new Uint8Array(base64ToBuf(ivB64));
    const dec = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      base64ToBuf(cipherB64)
    );
    return new TextDecoder().decode(dec) === 'estate-vault-verify';
  } catch {
    return false;
  }
}

/** Encrypt a plain object. Returns a string safe to store in a Firestore field. */
export async function encryptData(
  data: unknown,
  masterPassword: string,
  saltB64: string
): Promise<string> {
  const salt = new Uint8Array(base64ToBuf(saltB64));
  const key = await deriveKey(masterPassword, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(data))
  );
  return `${bufToBase64(iv.buffer)}.${bufToBase64(cipher)}`;
}

/** Decrypt a string produced by encryptData back into the original object. */
export async function decryptData<T = unknown>(
  payload: string,
  masterPassword: string,
  saltB64: string
): Promise<T> {
  const [ivB64, cipherB64] = payload.split('.');
  const salt = new Uint8Array(base64ToBuf(saltB64));
  const key = await deriveKey(masterPassword, salt);
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const dec = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    base64ToBuf(cipherB64)
  );
  return JSON.parse(new TextDecoder().decode(dec)) as T;
}
