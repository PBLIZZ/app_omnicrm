/**
 * Storage Schemas Tests
 */

import { describe, it, expect } from "vitest";
import {
  FileUrlQuerySchema,
  FileUrlResponseSchema,
  BatchFileUrlRequestSchema,
  BatchFileUrlResponseSchema,
} from "../storage";

describe("Storage Schemas", () => {
  describe("FileUrlQuerySchema", () => {
    it("should validate with filePath", () => {
      const input = { filePath: "uploads/photo.jpg" };
      const result = FileUrlQuerySchema.parse(input);
      expect(result.filePath).toBe("uploads/photo.jpg");
    });

    it("should reject empty filePath", () => {
      const input = { filePath: "" };
      expect(() => FileUrlQuerySchema.parse(input)).toThrow();
    });

    it("should require filePath", () => {
      expect(() => FileUrlQuerySchema.parse({})).toThrow();
    });

    it("should validate path with slashes", () => {
      const input = { filePath: "users/123/photos/profile.webp" };
      const result = FileUrlQuerySchema.parse(input);
      expect(result.filePath).toBe("users/123/photos/profile.webp");
    });
  });

  describe("FileUrlResponseSchema", () => {
    it("should validate with signedUrl", () => {
      const input = { signedUrl: "https://storage.example.com/signed-url" };
      const result = FileUrlResponseSchema.parse(input);
      expect(result.signedUrl).toBe("https://storage.example.com/signed-url");
    });

    it("should validate with null signedUrl", () => {
      const input = { signedUrl: null };
      const result = FileUrlResponseSchema.parse(input);
      expect(result.signedUrl).toBeNull();
    });

    it("should validate with error message", () => {
      const input = { signedUrl: null, error: "File not found" };
      const result = FileUrlResponseSchema.parse(input);
      expect(result.error).toBe("File not found");
    });

    it("should require signedUrl field", () => {
      const input = { error: "Some error" };
      expect(() => FileUrlResponseSchema.parse(input)).toThrow();
    });

    it("should accept both signedUrl and error", () => {
      const input = {
        signedUrl: "https://example.com/url",
        error: "Warning message",
      };
      const result = FileUrlResponseSchema.parse(input);
      expect(result.signedUrl).toBeTruthy();
      expect(result.error).toBe("Warning message");
    });
  });

  describe("BatchFileUrlRequestSchema", () => {
    it("should validate with filePaths array", () => {
      const input = {
        filePaths: ["file1.jpg", "file2.png", "file3.pdf"],
      };
      const result = BatchFileUrlRequestSchema.parse(input);
      expect(result.filePaths).toHaveLength(3);
      expect(result.expiresIn).toBe(14400);
    });

    it("should apply default expiresIn", () => {
      const input = { filePaths: ["file.jpg"] };
      const result = BatchFileUrlRequestSchema.parse(input);
      expect(result.expiresIn).toBe(14400);
    });

    it("should accept custom expiresIn", () => {
      const input = {
        filePaths: ["file.jpg"],
        expiresIn: 3600,
      };
      const result = BatchFileUrlRequestSchema.parse(input);
      expect(result.expiresIn).toBe(3600);
    });

    it("should accept single file", () => {
      const input = { filePaths: ["single-file.jpg"] };
      const result = BatchFileUrlRequestSchema.parse(input);
      expect(result.filePaths).toHaveLength(1);
    });

    it("should enforce maximum 100 files", () => {
      const filePaths = Array.from({ length: 101 }, (_, i) => `file${i}.jpg`);
      const input = { filePaths };
      expect(() => BatchFileUrlRequestSchema.parse(input)).toThrow();
    });

    it("should accept exactly 100 files", () => {
      const filePaths = Array.from({ length: 100 }, (_, i) => `file${i}.jpg`);
      const input = { filePaths };
      const result = BatchFileUrlRequestSchema.parse(input);
      expect(result.filePaths).toHaveLength(100);
    });

    it("should reject empty string in filePaths", () => {
      const input = { filePaths: ["file1.jpg", "", "file3.jpg"] };
      expect(() => BatchFileUrlRequestSchema.parse(input)).toThrow();
    });
  });

  describe("BatchFileUrlResponseSchema", () => {
    it("should validate with urls record", () => {
      const input = {
        urls: {
          "file1.jpg": "https://example.com/signed1",
          "file2.png": "https://example.com/signed2",
        },
      };
      const result = BatchFileUrlResponseSchema.parse(input);
      expect(result.urls["file1.jpg"]).toBeTruthy();
      expect(result.urls["file2.png"]).toBeTruthy();
    });

    it("should accept null URLs in record", () => {
      const input = {
        urls: {
          "file1.jpg": "https://example.com/signed",
          "file2.png": null,
        },
      };
      const result = BatchFileUrlResponseSchema.parse(input);
      expect(result.urls["file1.jpg"]).toBeTruthy();
      expect(result.urls["file2.png"]).toBeNull();
    });

    it("should validate with errors", () => {
      const input = {
        urls: {
          "file1.jpg": "https://example.com/signed",
        },
        errors: {
          "file2.png": "File not found",
          "file3.pdf": "Access denied",
        },
      };
      const result = BatchFileUrlResponseSchema.parse(input);
      expect(result.errors).toBeDefined();
      expect(result.errors!["file2.png"]).toBe("File not found");
    });

    it("should validate empty urls record", () => {
      const input = { urls: {} };
      const result = BatchFileUrlResponseSchema.parse(input);
      expect(result.urls).toEqual({});
    });

    it("should require urls field", () => {
      const input = { errors: {} };
      expect(() => BatchFileUrlResponseSchema.parse(input)).toThrow();
    });

    it("should accept optional errors", () => {
      const input = { urls: { "file.jpg": "https://example.com" } };
      const result = BatchFileUrlResponseSchema.parse(input);
      expect(result.errors).toBeUndefined();
    });
  });
});
