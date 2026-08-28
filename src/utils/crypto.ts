/** Web Crypto helpers for locked-note encryption. */

const encoder = new TextEncoder();

/** Derive a 256-bit AES-GCM key from a passphrase. */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const saltCopy = new Uint8Array(salt); // guarantee a fresh ArrayBuffer
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltCopy.buffer,
      iterations: 150_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt plaintext with AES-GCM. Returns `iv:salt:ciphertext` (base64). */
export async function encryptText(plaintext: string, passphrase: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  const b64 = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `${b64(iv.buffer)}:${b64(salt.buffer)}:${b64(ciphertext)}`;
}

/** Decrypt a payload produced by `encryptText`. Returns null on bad passphrase/data. */
export async function decryptText(payload: string, passphrase: string): Promise<string | null> {
  try {
    const [ivB64, saltB64, ctB64] = payload.split(':');
    if (!ivB64 || !saltB64 || !ctB64) return null;
    const fromB64 = (s: string) => {
      const bin = atob(s);
      return Uint8Array.from(bin, (c) => c.charCodeAt(0));
    };
    const key = await deriveKey(passphrase, fromB64(saltB64));
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(ivB64) },
      key,
      fromB64(ctB64)
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
