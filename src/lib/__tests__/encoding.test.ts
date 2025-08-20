import { describe, it, expect } from "vitest";
import {
  utf8ToBytes,
  bytesToUtf8,
  hexToBytes,
  bytesToHex,
  bytesToBase64Url,
  base64UrlToBytes,
} from "../encoding";

describe("encoding utilities", () => {
  it("utf8ToBytes/bytesToUtf8 roundtrip (ASCII)", () => {
    const s = "hello world";
    const bytes = utf8ToBytes(s);
    // Cross-realm safe type check
    expect(Object.prototype.toString.call(bytes)).toBe("[object Uint8Array]");
    expect(ArrayBuffer.isView(bytes)).toBe(true);
    const back = bytesToUtf8(bytes);
    expect(back).toBe(s);
  });

  it("utf8ToBytes/bytesToUtf8 roundtrip (Unicode)", () => {
    const s = "💚 café 🇪🇺";
    const bytes = utf8ToBytes(s);
    const back = bytesToUtf8(bytes);
    expect(back).toBe(s);
  });

  it("hexToBytes/bytesToHex roundtrip", () => {
    const hex = "00ff10a5";
    const bytes = hexToBytes(hex);
    expect(Array.from(bytes)).toEqual([0x00, 0xff, 0x10, 0xa5]);
    const backHex = bytesToHex(bytes);
    expect(backHex).toBe(hex);
  });

  it("bytesToBase64Url/base64UrlToBytes roundtrip", () => {
    const data = utf8ToBytes("hello");
    const b64url = bytesToBase64Url(data);
    // "hello" base64 is "aGVsbG8=", base64url drops padding
    expect(b64url).toBe("aGVsbG8");
    const back = base64UrlToBytes(b64url);
    expect(bytesToUtf8(back)).toBe("hello");
  });

  it("base64url handles non-aligned lengths (padding)", () => {
    // 1-byte array -> base64 "AQ==" -> base64url "AQ"
    const one = new Uint8Array([1]);
    const b64url1 = bytesToBase64Url(one);
    expect(b64url1).toBe("AQ");
    expect(Array.from(base64UrlToBytes(b64url1))).toEqual([1]);

    // 2-byte array -> base64 "AQI=" -> base64url "AQI"
    const two = new Uint8Array([1, 2]);
    const b64url2 = bytesToBase64Url(two);
    expect(b64url2).toBe("AQI");
    expect(Array.from(base64UrlToBytes(b64url2))).toEqual([1, 2]);
  });
});
