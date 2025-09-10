// Edge-compatible crypto helpers using Web Crypto API
// Only the functions needed by middleware are implemented here.
// See: SECURITY.md and docs/api/README.md for the versioned AES-GCM format.
import {
  utf8ToBytes,
  bytesToUtf8,
  hexToBytes,
  bytesToBase64Url,
  base64UrlToBytes,
} from "@/lib/utils/encoding";

function toBytesUtf8(s: string): Uint8Array {
  return utf8ToBytes(s);
}

function fromHex(hex: string): Uint8Array {
  return hexToBytes(hex);
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  return bytesToBase64Url(bytes);
}

function base64urlDecodeToBytes(s: string): Uint8Array {
  return base64UrlToBytes(s);
}

function getMasterKeyBytes(): Uint8Array {
  const raw = process.env["APP_ENCRYPTION_KEY"] ?? "edge-default-key"; // fail-soft in dev
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
  cachedKeyPromise = (async (): Promise<CryptoKey> => {
    let keyBytes = getMasterKeyBytes();
    if (keyBytes.length < 32) {
      const digest = await crypto.subtle.digest("SHA-256", keyBytes as unknown as ArrayBuffer);
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

// Deterministic key derivation: HMAC(master, label) -> 32 bytes
async function deriveKeyBytes(label: string): Promise<Uint8Array> {
  const key = await getHmacKey();
  const mac = await crypto.subtle.sign("HMAC", key, toBytesUtf8(label) as unknown as ArrayBuffer);
  return new Uint8Array(mac); // 32 bytes for SHA-256
}

export function randomNonce(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64urlEncodeBytes(bytes);
}

export async function hmacSign(data: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, toBytesUtf8(data) as unknown as ArrayBuffer);
  return base64urlEncodeBytes(new Uint8Array(sig));
}

export async function hmacVerify(data: string, signatureB64Url: string): Promise<boolean> {
  const expected = await hmacSign(data);
  // constant-time compare
  const a = base64urlDecodeToBytes(expected);
  const b = base64urlDecodeToBytes(signatureB64Url);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    const byteA = a[i];
    const byteB = b[i];
    if (byteA === undefined || byteB === undefined) {
      throw new Error(`Invalid byte at index ${i}: a=${byteA}, b=${byteB}`);
    }
    diff |= byteA ^ byteB;
  }
  return diff === 0;
}

/**
 * Crypto format (Node ↔ Edge compatible)
 *
 * - Envelope: `v1:<iv>:<ciphertext>:<tag>`
 * - Encoding: base64url (unpadded) for each component
 * - IV: 12 bytes; Tag: 16 bytes (AES-GCM)
 * - KDF: HMAC-SHA256(master, "enc") → 32 bytes used as AES-256 key
 * - Master key input (APP_ENCRYPTION_KEY): base64url (preferred), base64, hex, or strong UTF-8 (≥ 32 bytes); shorter keys are stretched via SHA-256
 *
 * Interop: compatible with `src/server/lib/crypto.ts`.
 */
export async function encryptString(plain: string): Promise<string> {
  const keyBytes = (await deriveKeyBytes("enc")).slice(0, 32);
  const aesKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    toBytesUtf8(plain) as unknown as ArrayBuffer,
  );
  const encBytes = new Uint8Array(enc);
  const tag = encBytes.slice(encBytes.length - 16);
  const ct = encBytes.slice(0, encBytes.length - 16);
  return ["v1", base64urlEncodeBytes(iv), base64urlEncodeBytes(ct), base64urlEncodeBytes(tag)].join(
    ":",
  );
}

export async function decryptString(value: string): Promise<string> {
  if (!value) return value as unknown as string;
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    // treat as plaintext (back-compat)
    return value;
  }
  const [, ivB64, ctB64, tagB64] = parts as [string, string, string, string];
  const keyBytes = (await deriveKeyBytes("enc")).slice(0, 32);
  const aesKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const iv = base64urlDecodeToBytes(ivB64!);
  const ct = base64urlDecodeToBytes(ctB64!);
  const tag = base64urlDecodeToBytes(tagB64!);
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer, tagLength: 128 },
    aesKey,
    combined,
  );
  return bytesToUtf8(new Uint8Array(plainBuf));
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return typeof value === "string" && value.startsWith("v1:");
}

export function toBase64Url(input: string): string {
  return bytesToBase64Url(utf8ToBytes(input));
}

export function fromBase64Url(input: string): string {
  return bytesToUtf8(base64urlDecodeToBytes(input));
}
