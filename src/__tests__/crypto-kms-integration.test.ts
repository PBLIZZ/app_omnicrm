import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  encryptString,
  decryptString,
  hmacSign,
  hmacVerify,
  encryptStringSync,
  decryptStringSync,
  hmacSignSync,
  hmacVerifySync,
} from "@/server/utils/crypto";

// Mock KMS service
vi.mock("@/server/lib/kms-service", () => ({
  getKMSService: vi.fn(),
  isKMSAvailable: vi.fn(),
}));

// Mock environment
vi.mock("@/server/lib/env", () => ({
  env: {
    APP_ENCRYPTION_KEY: "test-encryption-key-32-bytes-long",
    NODE_ENV: "test",
  },
}));

describe("Crypto KMS Integration", () => {
  let mockKMSService: any;
  let mockIsKMSAvailable: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset modules to get fresh mocks
    vi.resetModules();

    const { getKMSService, isKMSAvailable } = require("@/server/lib/kms-service");

    mockKMSService = {
      deriveKey: vi.fn(),
    };

    mockIsKMSAvailable = isKMSAvailable;
    getKMSService.mockReturnValue(mockKMSService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("KMS Integration", () => {
    it("should use KMS when available", async () => {
      mockIsKMSAvailable.mockResolvedValue(true);
      mockKMSService.deriveKey.mockResolvedValue(Buffer.from("test-derived-key-32-bytes-long"));

      const plaintext = "test data";
      const encrypted = await encryptString(plaintext);
      const decrypted = await decryptString(encrypted);

      expect(mockKMSService.deriveKey).toHaveBeenCalledWith("enc");
      expect(decrypted).toBe(plaintext);
    });

    it("should fallback to environment key when KMS is unavailable", async () => {
      mockIsKMSAvailable.mockResolvedValue(false);

      const plaintext = "test data";
      const encrypted = await encryptString(plaintext);
      const decrypted = await decryptString(encrypted);

      expect(mockKMSService.deriveKey).not.toHaveBeenCalled();
      expect(decrypted).toBe(plaintext);
    });

    it("should fallback to environment key when KMS fails", async () => {
      mockIsKMSAvailable.mockResolvedValue(true);
      mockKMSService.deriveKey.mockRejectedValue(new Error("KMS error"));

      const plaintext = "test data";
      const encrypted = await encryptString(plaintext);
      const decrypted = await decryptString(encrypted);

      expect(mockKMSService.deriveKey).toHaveBeenCalledWith("enc");
      expect(decrypted).toBe(plaintext);
    });

    it("should use KMS for HMAC operations when available", async () => {
      mockIsKMSAvailable.mockResolvedValue(true);
      mockKMSService.deriveKey.mockResolvedValue(Buffer.from("test-mac-key-32-bytes-long"));

      const data = "test data";
      const signature = await hmacSign(data);
      const isValid = await hmacVerify(data, signature);

      expect(mockKMSService.deriveKey).toHaveBeenCalledWith("mac");
      expect(isValid).toBe(true);
    });

    it("should fallback to environment key for HMAC when KMS is unavailable", async () => {
      mockIsKMSAvailable.mockResolvedValue(false);

      const data = "test data";
      const signature = await hmacSign(data);
      const isValid = await hmacVerify(data, signature);

      expect(mockKMSService.deriveKey).not.toHaveBeenCalled();
      expect(isValid).toBe(true);
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain sync API compatibility", () => {
      const plaintext = "test data";
      const encrypted = encryptStringSync(plaintext);
      const decrypted = decryptStringSync(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should maintain sync HMAC compatibility", () => {
      const data = "test data";
      const signature = hmacSignSync(data);
      const isValid = hmacVerifySync(data, signature);

      expect(isValid).toBe(true);
    });

    it("should produce consistent results between sync and async versions", async () => {
      mockIsKMSAvailable.mockResolvedValue(false);

      const plaintext = "test data";
      const asyncEncrypted = await encryptString(plaintext);
      const syncEncrypted = encryptStringSync(plaintext);

      // Both should use the same environment key, so results should be different
      // (due to random IV) but both should decrypt correctly
      const asyncDecrypted = await decryptString(asyncEncrypted);
      const syncDecrypted = decryptStringSync(syncEncrypted);

      expect(asyncDecrypted).toBe(plaintext);
      expect(syncDecrypted).toBe(plaintext);
    });
  });

  describe("Error Handling", () => {
    it("should handle KMS service errors gracefully", async () => {
      mockIsKMSAvailable.mockResolvedValue(true);
      mockKMSService.deriveKey.mockRejectedValue(new Error("KMS service unavailable"));

      const plaintext = "test data";

      // Should not throw, should fallback to environment key
      await expect(encryptString(plaintext)).resolves.toBeDefined();
    });

    it("should handle invalid encrypted data", async () => {
      mockIsKMSAvailable.mockResolvedValue(false);

      const invalidEncrypted = "invalid-encrypted-data";

      // Should return the original value for invalid format
      const result = await decryptString(invalidEncrypted);
      expect(result).toBe(invalidEncrypted);
    });

    it("should handle empty values", async () => {
      mockIsKMSAvailable.mockResolvedValue(false);

      const emptyResult = await decryptString("");
      expect(emptyResult).toBe("");
    });
  });

  describe("Encryption Format", () => {
    it("should maintain v1 format compatibility", async () => {
      mockIsKMSAvailable.mockResolvedValue(false);

      const plaintext = "test data";
      const encrypted = await encryptString(plaintext);

      expect(encrypted).toMatch(/^v1:/);
      expect(encrypted.split(":")).toHaveLength(4);
    });

    it("should handle plaintext values (backward compatibility)", async () => {
      mockIsKMSAvailable.mockResolvedValue(false);

      const plaintext = "plaintext-value";
      const result = await decryptString(plaintext);

      expect(result).toBe(plaintext);
    });
  });
});
