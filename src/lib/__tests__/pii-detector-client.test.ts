import { describe, it, expect } from "vitest";
import { detectPII, validateNoPII } from "../pii-detector-client";

describe("PII Detector Client", () => {
  describe("detectPII", () => {
    it("detects email addresses", () => {
      const text = "Contact me at john.doe@example.com for more info";
      const entities = detectPII(text);

      expect(entities).toHaveLength(1);
      expect(entities[0]).toMatchObject({
        type: "email",
        value: "john.doe@example.com",
        redacted: "[EMAIL]",
      });
    });

    it("detects phone numbers", () => {
      const text = "Call me at (555) 123-4567 or 555-123-4567";
      const entities = detectPII(text);

      expect(entities).toHaveLength(2);
      expect(entities[0].type).toBe("phone");
      expect(entities[1].type).toBe("phone");
    });

    it("detects SSNs", () => {
      const text = "SSN: 123-45-6789";
      const entities = detectPII(text);

      expect(entities).toHaveLength(1);
      expect(entities[0]).toMatchObject({
        type: "ssn",
        value: "123-45-6789",
        redacted: "[SSN]",
      });
    });

    it("detects credit card numbers", () => {
      const text = "Card: 1234-5678-9012-3456";
      const entities = detectPII(text);

      expect(entities).toHaveLength(1);
      expect(entities[0]).toMatchObject({
        type: "credit_card",
        value: "1234-5678-9012-3456",
        redacted: "[CREDIT_CARD]",
      });
    });

    it("detects IP addresses", () => {
      const text = "Server at 192.168.1.1";
      const entities = detectPII(text);

      expect(entities).toHaveLength(1);
      expect(entities[0]).toMatchObject({
        type: "ip_address",
        value: "192.168.1.1",
        redacted: "[IP_ADDRESS]",
      });
    });

    it("detects street addresses", () => {
      const text = "Visit 123 Main Street";
      const entities = detectPII(text);

      expect(entities).toHaveLength(1);
      expect(entities[0]).toMatchObject({
        type: "address",
        value: "123 Main Street",
        redacted: "[ADDRESS]",
      });
    });

    it("handles multiple PII types in one text", () => {
      const text = "Contact john@example.com at 123 Main St, call (555) 123-4567";
      const entities = detectPII(text);

      expect(entities).toHaveLength(3);
      const types = entities.map((e) => e.type);
      expect(types).toContain("email");
      expect(types).toContain("address");
      expect(types).toContain("phone");
    });

    it("avoids overlapping detections", () => {
      const text = "email@example.com";
      const entities = detectPII(text);

      // Should only detect email, not create overlapping entities
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe("email");
    });

    it("returns empty array for text without PII", () => {
      const text = "This is just regular text with no sensitive information";
      const entities = detectPII(text);

      expect(entities).toHaveLength(0);
    });
  });

  describe("validateNoPII", () => {
    it("returns validation result for text with PII", () => {
      const text = "Email: test@example.com, Phone: (555) 123-4567";
      const result = validateNoPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.entities).toHaveLength(2);
      expect(result.detectedTypes).toEqual(["email", "phone"]);
    });

    it("returns validation result for text without PII", () => {
      const text = "This is just regular text";
      const result = validateNoPII(text);

      expect(result.hasPII).toBe(false);
      expect(result.entities).toHaveLength(0);
      expect(result.detectedTypes).toEqual([]);
    });
  });
});
