# Shared encoding utilities

This directory contains shared, environment‑agnostic primitives used across both Node (server) and Edge runtimes.

- File of interest: `src/lib/encoding.ts`
- Purpose: UTF‑8, hex, and base64url conversions that behave consistently in Node and in Edge/browser contexts.
- Consumers:
  - `src/server/lib/crypto.ts` (Node)
  - `src/server/lib/crypto-edge.ts` (Edge/Web Crypto)

## API

```ts
import {
  utf8ToBytes,
  bytesToUtf8,
  hexToBytes,
  bytesToHex,
  bytesToBase64Url,
  base64UrlToBytes,
} from "@/lib/encoding";
```

- `utf8ToBytes(s: string): Uint8Array`
- `bytesToUtf8(bytes: Uint8Array): string`
- `hexToBytes(hex: string): Uint8Array` (throws on invalid length)
- `bytesToHex(bytes: Uint8Array): string`
- `bytesToBase64Url(bytes: Uint8Array): string` (unpadded base64url)
- `base64UrlToBytes(s: string): Uint8Array` (accepts unpadded input)

## Environment behavior

- Uses `Buffer` if available (Node), otherwise falls back to `btoa`/`atob` for browsers/Edge.
- Base64url is unpadded and uses the standard replacements:
  - `+` → `-`, `/` → `_`, and removes trailing `=`.

## Usage guidance

- Prefer these helpers instead of ad‑hoc conversions in application code.
- Crypto helpers rely on these to ensure Node ↔ Edge compatibility and consistent encoding across environments.
