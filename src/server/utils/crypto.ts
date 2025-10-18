import crypto from "crypto";
import { bytesToBase64Url, base64UrlToBytes, utf8ToBytes, bytesToUtf8 } from "@/lib/utils/encoding";
import { getKMSService, isKMSAvailable } from "@/server/lib/kms-service";

// Small, focused cryptography helpers for application-level secrets
// - AES-256-GCM for confidentiality + integrity
// - HMAC-SHA256 for lightweight state signing
// See: SECURITY.md and docs/api/README.md for the versioned AES-GCM format.

function getMasterKey(): Buffer {
  const raw = process.env["APP_ENCRYPTION_KEY"];
  if (!raw) throw new Error("Missing APP_ENCRYPTION_KEY");
  // Accept base64url
  if (/^[A-Za-z0-9_\-]+$/.test(raw)) {
    try {
      const bytes = base64UrlToBytes(raw);
      if (bytes.length >= 32) return Buffer.from(bytes);
    } catch {}
  }
  // Accept base64, hex, or utf8 string
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0) {
    // likely base64
    try {
      const buf = Buffer.from(raw, "base64");
      if (buf.length >= 32) return buf;
    } catch {}
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    // hex
    const buf = Buffer.from(raw, "hex");
    if (buf.length >= 32) return buf;
  }
  const buf = Buffer.from(raw, "utf8");
  if (buf.length < 32) {
    // stretch (deterministic) to 32 bytes using SHA-256
    return crypto.createHash("sha256").update(buf).digest();
  }
  return buf;
}

async function deriveKey(label: string): Promise<Buffer> {
  // Try to use KMS first for secure key derivation
  if (await isKMSAvailable()) {
    try {
      const kmsService = getKMSService();
      return await kmsService.deriveKey(label);
    } catch (error) {
      console.warn(
        `[CRYPTO] KMS key derivation failed for '${label}', falling back to environment key:`,
        error,
      );
    }
  }

  // Fallback to environment variable (for development or when KMS is unavailable)
  const master = getMasterKey();
  return crypto.createHmac("sha256", master).update(label).digest(); // 32 bytes
}

function base64urlEncode(buf: Buffer): string {
  return bytesToBase64Url(buf);
}

function base64urlDecode(s: string): Buffer {
  return Buffer.from(base64UrlToBytes(s));
}

export function randomNonce(length = 16): string {
  return base64urlEncode(crypto.randomBytes(length));
}

/**
 * Crypto format (Node ↔ Edge compatible)
 *
 * - Envelope: `v1:<iv>:<ciphertext>:<tag>`
 * - Encoding: base64url (unpadded) for each component
 * - IV: 12 bytes; Tag: 16 bytes (AES-GCM)
 * - KDF: HMAC-SHA256(master, "enc") → 32 bytes used as AES-256 key
 * - Master key (APP_ENCRYPTION_KEY): base64url (preferred), base64, hex, or strong UTF-8 (≥ 32 bytes); shorter keys are stretched via SHA-256
 *
 * Interop: compatible with `src/server/server/utils/crypto-edge.ts`.
 */
// AES-256-GCM string encryption
export async function encryptString(plain: string): Promise<string> {
  const key = (await deriveKey("enc")).subarray(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", base64urlEncode(iv), base64urlEncode(ciphertext), base64urlEncode(tag)].join(":");
}

export async function decryptString(value: string): Promise<string> {
  if (!value) return value;
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    // treat as plaintext (back-compat)
    return value;
  }
  const [, ivB64, ctB64, tagB64] = parts as [string, string, string, string];

  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("Invalid encrypted format: missing required components");
  }

  const key = (await deriveKey("enc")).subarray(0, 32);
  const iv = base64urlDecode(ivB64);
  const ciphertext = base64urlDecode(ctB64);
  const tag = base64urlDecode(tagB64);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return plain;
}

// HMAC for lightweight state cookies or CSRF tokens
export async function hmacSign(data: string): Promise<string> {
  const macKey = await deriveKey("mac");
  return base64urlEncode(crypto.createHmac("sha256", macKey).update(data).digest());
}

export async function hmacVerify(data: string, signatureB64Url: string): Promise<boolean> {
  const expected = await hmacSign(data);
  const a = base64urlDecode(expected);
  const b = base64urlDecode(signatureB64Url);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return typeof value === "string" && value.startsWith("v1:");
}

export function toBase64Url(input: string): string {
  return bytesToBase64Url(utf8ToBytes(input));
}

export function fromBase64Url(input: string): string {
  return bytesToUtf8(base64UrlToBytes(input));
}

// Backward compatibility wrappers for synchronous usage
// These maintain the existing API while using KMS internally
export function encryptStringSync(plain: string): string {
  // For backward compatibility, we'll use the environment key directly
  // This should only be used in development or when KMS is not available
  const master = getMasterKey();
  const key = crypto.createHmac("sha256", master).update("enc").digest().subarray(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", base64urlEncode(iv), base64urlEncode(ciphertext), base64urlEncode(tag)].join(":");
}

export function decryptStringSync(value: string): string {
  if (!value) return value;
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    // treat as plaintext (back-compat)
    return value;
  }
  const [, ivB64, ctB64, tagB64] = parts as [string, string, string, string];

  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("Invalid encrypted format: missing required components");
  }

  const master = getMasterKey();
  const key = crypto.createHmac("sha256", master).update("enc").digest().subarray(0, 32);
  const iv = base64urlDecode(ivB64);
  const ciphertext = base64urlDecode(ctB64);
  const tag = base64urlDecode(tagB64);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return plain;
}

export function hmacSignSync(data: string): string {
  const master = getMasterKey();
  const macKey = crypto.createHmac("sha256", master).update("mac").digest();
  return base64urlEncode(crypto.createHmac("sha256", macKey).update(data).digest());
}

export function hmacVerifySync(data: string, signatureB64Url: string): boolean {
  const expected = hmacSignSync(data);
  const a = base64urlDecode(expected);
  const b = base64urlDecode(signatureB64Url);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
