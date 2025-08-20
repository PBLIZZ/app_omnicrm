// Shared encoding utilities for both Node and Edge runtimes
// - UTF-8 <-> Uint8Array
// - Hex <-> Uint8Array
// - Base64URL <-> Uint8Array (environment agnostic)

// See: src/lib/README.md for API, environment behavior, and usage guidance.
const te = new TextEncoder();
const td = new TextDecoder();

export function utf8ToBytes(s: string): Uint8Array {
  return te.encode(s);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return td.decode(bytes);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const len = clean.length;
  if (len % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i]!.toString(16).padStart(2, "0");
  return s;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  // Prefer Buffer when available (Node), fallback to btoa for browsers/Edge
  let b64: string;
  const B = typeof Buffer !== "undefined" ? Buffer : undefined;
  if (B && typeof B.from === "function") {
    b64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    // btoa expects binary string (Latin1)
    b64 = btoa(binary);
  }
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const B = typeof Buffer !== "undefined" ? Buffer : undefined;
  if (B && typeof B.from === "function") {
    const buf = Buffer.from(b64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } else {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)!;
    return out;
  }
}
