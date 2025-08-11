// Edge-compatible crypto helpers using Web Crypto API
// Only the functions needed by middleware are implemented here.

const te = new TextEncoder();

function toBytesUtf8(s: string): Uint8Array {
  return te.encode(s);
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  const len = clean.length;
  if (len % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecodeToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)!;
  return out;
}

function getMasterKeyBytes(): Uint8Array {
  const raw = process.env["APP_ENCRYPTION_KEY"] || "edge-default-key"; // fail-soft in dev
  // Try base64
  if (/^[A-Za-z0-9_\-]+$/.test(raw)) {
    try {
      return base64urlDecodeToBytes(raw);
    } catch {}
  }
  // Try hex
  if (/^[0-9a-fA-F]+$/.test(raw)) {
    try {
      return fromHex(raw);
    } catch {}
  }
  // Fallback utf8
  const utf8 = toBytesUtf8(raw);
  // If < 32 bytes, stretch via SHA-256
  if (utf8.length < 32) {
    // Note: SubtleCrypto.digest is async; but this only runs once via caching below.
    // We'll handle stretching in getHmacKey() to keep this function sync.
    return utf8;
  }
  return utf8;
}

let cachedKeyPromise: Promise<CryptoKey> | null = null;
async function getHmacKey(): Promise<CryptoKey> {
  if (cachedKeyPromise) return cachedKeyPromise;
  cachedKeyPromise = (async () => {
    let keyBytes = getMasterKeyBytes();
    if (keyBytes.length < 32) {
      const digest = await crypto.subtle.digest("SHA-256", keyBytes.buffer as ArrayBuffer);
      keyBytes = new Uint8Array(digest);
    }
    // Pass a TypedArray (Uint8Array) and cast to BufferSource to satisfy TS libs
    return crypto.subtle.importKey(
      "raw",
      keyBytes as unknown as BufferSource,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  })();
  return cachedKeyPromise;
}

export function randomNonce(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64urlEncodeBytes(bytes);
}

export async function hmacSign(data: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, toBytesUtf8(data).buffer as ArrayBuffer);
  return base64urlEncodeBytes(new Uint8Array(sig));
}

export async function hmacVerify(data: string, signatureB64Url: string): Promise<boolean> {
  const expected = await hmacSign(data);
  // constant-time compare
  const a = base64urlDecodeToBytes(expected);
  const b = base64urlDecodeToBytes(signatureB64Url);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
