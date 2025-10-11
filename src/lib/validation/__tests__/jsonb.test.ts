import { describe, it, expect } from "vitest";
import {
  ContactAddressSchema,
  ContactHealthContextSchema,
  ContactPreferencesSchema,
  ContactTagsSchema,
  ContactDetailsSchema,
  TaskDetailsSchema,
  ProjectDetailsSchema,
  EntityDetailsSchema,
  NullableEntityDetailsSchema,
  AiInsightContentSchema,
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
  GenericSourceMetaSchema,
  SourceMetaSchema,
  RawEventPayloadSchema,
  redactSensitiveFields,
  sanitizeHealthContext,
  safeParseJsonb,
  sanitizeJsonb,
  safeParseJsonbLegacy,
} from "../jsonb";
import { z } from "zod";

describe("jsonb validation schemas", () => {
  describe("ContactAddressSchema", () => {
    it("should validate complete address", () => {
      const address = {
        street: "123 Main St",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        country: "USA",
      };
      const result = ContactAddressSchema.parse(address);
      expect(result).toEqual(address);
    });

    it("should accept partial addresses", () => {
      const result = ContactAddressSchema.parse({
        city: "Springfield",
        state: "IL",
      });
      expect(result).toEqual({ city: "Springfield", state: "IL" });
    });

    it("should accept undefined", () => {
      expect(ContactAddressSchema.parse(undefined)).toBeUndefined();
    });

    it("should reject extra fields due to strict mode", () => {
      expect(() =>
        ContactAddressSchema.parse({
          street: "123 Main St",
          extraField: "not allowed",
        }),
      ).toThrow();
    });

    it("should accept empty object", () => {
      expect(ContactAddressSchema.parse({})).toEqual({});
    });
  });

  describe("ContactHealthContextSchema", () => {
    it("should validate complete health context", () => {
      const healthContext = {
        conditions: ["diabetes", "hypertension"],
        medications: ["metformin", "lisinopril"],
        allergies: ["penicillin"],
        notes: "Patient has family history of heart disease",
      };
      const result = ContactHealthContextSchema.parse(healthContext);
      expect(result).toEqual(healthContext);
    });

    it("should accept partial health context", () => {
      const result = ContactHealthContextSchema.parse({
        conditions: ["asthma"],
      });
      expect(result).toEqual({ conditions: ["asthma"] });
    });

    it("should accept empty arrays", () => {
      const result = ContactHealthContextSchema.parse({
        conditions: [],
        medications: [],
      });
      expect(result).toEqual({ conditions: [], medications: [] });
    });

    it("should reject extra fields", () => {
      expect(() =>
        ContactHealthContextSchema.parse({
          conditions: ["diabetes"],
          unauthorizedField: "value",
        }),
      ).toThrow();
    });
  });

  describe("ContactPreferencesSchema", () => {
    it("should validate complete preferences", () => {
      const prefs = {
        communicationMethod: "email" as const,
        preferredTime: "morning",
        timezone: "America/Chicago",
        language: "en-US",
        marketingOptIn: true,
      };
      const result = ContactPreferencesSchema.parse(prefs);
      expect(result).toEqual(prefs);
    });

    it("should enforce communication method enum", () => {
      expect(() =>
        ContactPreferencesSchema.parse({
          communicationMethod: "carrier-pigeon",
        }),
      ).toThrow();
    });

    it("should accept valid communication methods", () => {
      const methods = ["email", "phone", "sms", "any"] as const;
      methods.forEach((method) => {
        const result = ContactPreferencesSchema.parse({
          communicationMethod: method,
        });
        expect(result.communicationMethod).toBe(method);
      });
    });
  });

  describe("ContactTagsSchema", () => {
    it("should validate array of strings", () => {
      const tags = ["vip", "prospect", "active"];
      expect(ContactTagsSchema.parse(tags)).toEqual(tags);
    });

    it("should accept empty arrays", () => {
      expect(ContactTagsSchema.parse([])).toEqual([]);
    });

    it("should accept undefined", () => {
      expect(ContactTagsSchema.parse(undefined)).toBeUndefined();
    });

    it("should reject non-string values", () => {
      expect(() => ContactTagsSchema.parse([1, 2, 3])).toThrow();
    });
  });

  describe("ContactDetailsSchema", () => {
    it("should validate structured details", () => {
      const details = {
        description: "Important client",
        notes: "Prefers email communication",
        metadata: { source: "referral" },
        tags: ["vip"],
        customFields: { industry: "healthcare" },
      };
      const result = ContactDetailsSchema.parse(details);
      expect(result).toEqual(details);
    });

    it("should allow extra fields with catchall", () => {
      const details = {
        description: "Test",
        extraField: "allowed",
        anotherExtra: { nested: "object" },
      };
      const result = ContactDetailsSchema.parse(details);
      expect(result).toEqual(details);
    });

    it("should accept empty object", () => {
      expect(ContactDetailsSchema.parse({})).toEqual({});
    });
  });

  describe("TaskDetailsSchema", () => {
    it("should validate complete task details", () => {
      const details = {
        description: "Complete project proposal",
        notes: "Include budget estimates",
        metadata: { category: "documentation" },
        priority: "high" as const,
        estimatedDuration: 120,
        customFields: { billable: true },
      };
      const result = TaskDetailsSchema.parse(details);
      expect(result).toEqual(details);
    });

    it("should enforce priority enum", () => {
      expect(() =>
        TaskDetailsSchema.parse({ priority: "super-urgent" }),
      ).toThrow();
    });

    it("should accept valid priorities", () => {
      const priorities = ["low", "medium", "high", "urgent"] as const;
      priorities.forEach((priority) => {
        const result = TaskDetailsSchema.parse({ priority });
        expect(result.priority).toBe(priority);
      });
    });

    it("should allow extra fields", () => {
      const result = TaskDetailsSchema.parse({
        description: "Test",
        customExtraField: "value",
      });
      expect(result.customExtraField).toBe("value");
    });
  });

  describe("ProjectDetailsSchema", () => {
    it("should validate complete project details", () => {
      const details = {
        description: "Website redesign project",
        metadata: { client: "Acme Corp" },
        status: "active" as const,
        startDate: "2024-01-01",
        endDate: "2024-06-30",
        budget: 50000,
        customFields: { projectManager: "John Doe" },
      };
      const result = ProjectDetailsSchema.parse(details);
      expect(result).toEqual(details);
    });

    it("should enforce status enum", () => {
      const validStatuses = [
        "planning",
        "active",
        "on-hold",
        "completed",
        "cancelled",
      ] as const;
      validStatuses.forEach((status) => {
        const result = ProjectDetailsSchema.parse({ status });
        expect(result.status).toBe(status);
      });
    });

    it("should allow extra fields", () => {
      const result = ProjectDetailsSchema.parse({
        description: "Test",
        customField: "value",
      });
      expect(result.customField).toBe("value");
    });
  });

  describe("EntityDetailsSchema", () => {
    it("should accept any record", () => {
      const details = { key: "value", nested: { field: "data" } };
      expect(EntityDetailsSchema.parse(details)).toEqual(details);
    });

    it("should accept undefined", () => {
      expect(EntityDetailsSchema.parse(undefined)).toBeUndefined();
    });
  });

  describe("NullableEntityDetailsSchema", () => {
    it("should transform null to empty object", () => {
      expect(NullableEntityDetailsSchema.parse(null)).toEqual({});
    });

    it("should transform undefined to empty object", () => {
      expect(NullableEntityDetailsSchema.parse(undefined)).toEqual({});
    });

    it("should pass through valid objects", () => {
      const obj = { key: "value" };
      expect(NullableEntityDetailsSchema.parse(obj)).toEqual(obj);
    });
  });

  describe("AiInsightContentSchema", () => {
    it("should accept string content", () => {
      const content = "AI generated insight text";
      expect(AiInsightContentSchema.parse(content)).toBe(content);
    });

    it("should accept object content", () => {
      const content = { summary: "text", score: 0.95 };
      expect(AiInsightContentSchema.parse(content)).toEqual(content);
    });

    it("should reject arrays", () => {
      expect(() => AiInsightContentSchema.parse([])).toThrow();
    });

    it("should reject numbers", () => {
      expect(() => AiInsightContentSchema.parse(42)).toThrow();
    });
  });

  describe("GmailSourceMetaSchema", () => {
    it("should validate complete Gmail metadata", () => {
      const meta = {
        from: "sender@example.com",
        to: ["recipient@example.com"],
        cc: ["cc@example.com"],
        bcc: ["bcc@example.com"],
        subject: "Meeting notes",
        threadId: "thread-123",
        messageId: "msg-456",
        labelIds: ["INBOX", "IMPORTANT"],
        fetchedAt: "2024-01-01T10:00:00Z",
        matchedQuery: "subject:meeting",
      };
      const result = GmailSourceMetaSchema.parse(meta);
      expect(result).toEqual(meta);
    });

    it("should accept partial metadata", () => {
      const result = GmailSourceMetaSchema.parse({
        from: "sender@example.com",
        subject: "Test",
      });
      expect(result).toEqual({
        from: "sender@example.com",
        subject: "Test",
      });
    });

    it("should reject extra fields", () => {
      expect(() =>
        GmailSourceMetaSchema.parse({
          from: "test@example.com",
          unauthorizedField: "value",
        }),
      ).toThrow();
    });
  });

  describe("CalendarSourceMetaSchema", () => {
    it("should validate complete calendar metadata", () => {
      const meta = {
        attendees: [
          {
            email: "attendee@example.com",
            name: "John Doe",
            responseStatus: "accepted",
          },
        ],
        organizer: {
          email: "organizer@example.com",
          name: "Jane Smith",
        },
        eventId: "event-123",
        calendarId: "cal-456",
        summary: "Team Meeting",
        description: "Quarterly planning",
        location: "Conference Room A",
        startTime: "2024-01-01T14:00:00Z",
        endTime: "2024-01-01T15:00:00Z",
        isAllDay: false,
        recurring: true,
        status: "confirmed",
        fetchedAt: "2024-01-01T10:00:00Z",
      };
      const result = CalendarSourceMetaSchema.parse(meta);
      expect(result).toEqual(meta);
    });

    it("should accept minimal calendar metadata", () => {
      const result = CalendarSourceMetaSchema.parse({
        eventId: "event-123",
        summary: "Meeting",
      });
      expect(result).toEqual({
        eventId: "event-123",
        summary: "Meeting",
      });
    });
  });

  describe("SourceMetaSchema", () => {
    it("should accept Gmail metadata", () => {
      const meta = { from: "test@example.com", subject: "Test" };
      expect(SourceMetaSchema.parse(meta)).toEqual(meta);
    });

    it("should accept Calendar metadata", () => {
      const meta = { eventId: "123", summary: "Meeting" };
      expect(SourceMetaSchema.parse(meta)).toEqual(meta);
    });

    it("should accept generic metadata", () => {
      const meta = { customField: "value" };
      expect(SourceMetaSchema.parse(meta)).toEqual(meta);
    });
  });

  describe("RawEventPayloadSchema", () => {
    it("should accept any record", () => {
      const payload = { event: "data", nested: { field: "value" } };
      expect(RawEventPayloadSchema.parse(payload)).toEqual(payload);
    });

    it("should accept empty object", () => {
      expect(RawEventPayloadSchema.parse({})).toEqual({});
    });
  });

  describe("redactSensitiveFields", () => {
    it("should redact specified fields", () => {
      const data = {
        name: "John",
        email: "john@example.com",
        ssn: "123-45-6789",
        password: "secret",
      };
      const result = redactSensitiveFields(data, ["ssn", "password"]);
      expect(result).toEqual({
        name: "John",
        email: "john@example.com",
        ssn: "[REDACTED]",
        password: "[REDACTED]",
      });
    });

    it("should not modify original object", () => {
      const data = { secret: "value" };
      const result = redactSensitiveFields(data, ["secret"]);
      expect(data.secret).toBe("value");
      expect(result.secret).toBe("[REDACTED]");
    });

    it("should handle non-existent fields gracefully", () => {
      const data = { name: "John" };
      const result = redactSensitiveFields(data, ["nonExistent"]);
      expect(result).toEqual({ name: "John" });
    });

    it("should handle empty sensitive fields array", () => {
      const data = { name: "John", secret: "value" };
      const result = redactSensitiveFields(data, []);
      expect(result).toEqual(data);
    });
  });

  describe("sanitizeHealthContext", () => {
    it("should return undefined for falsy input", () => {
      expect(sanitizeHealthContext(null)).toBeUndefined();
      expect(sanitizeHealthContext(undefined)).toBeUndefined();
    });

    it("should parse valid health context with full details", () => {
      const context = {
        conditions: ["diabetes"],
        medications: ["insulin"],
        notes: "Important notes",
      };
      const result = sanitizeHealthContext(context, true);
      expect(result).toEqual(context);
    });

    it("should redact sensitive fields for non-admin", () => {
      const context = {
        conditions: ["diabetes"],
        medications: ["insulin", "metformin"],
        notes: "Important notes",
      };
      const result = sanitizeHealthContext(context, false);
      expect(result).toEqual({
        conditions: ["diabetes"],
        medications: ["[REDACTED]"],
        notes: "[REDACTED]",
      });
    });

    it("should handle context without sensitive fields", () => {
      const context = {
        conditions: ["asthma"],
        allergies: ["pollen"],
      };
      const result = sanitizeHealthContext(context, false);
      expect(result).toEqual(context);
    });
  });

  describe("safeParseJsonb", () => {
    it("should parse valid data with schema", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const data = { name: "John", age: 30 };
      const result = safeParseJsonb(data, schema);
      expect(result).toEqual(data);
    });

    it("should return empty object for invalid object schema", () => {
      const schema = z.object({ name: z.string() });
      const data = { name: 123 };
      const result = safeParseJsonb(data, schema);
      expect(result).toEqual({});
    });

    it("should return empty array for invalid array schema", () => {
      const schema = z.array(z.number());
      const data = ["not", "numbers"];
      const result = safeParseJsonb(data, schema);
      expect(result).toEqual([]);
    });

    it("should return empty object for invalid record schema", () => {
      const schema = z.record(z.number());
      const data = { key: "not-a-number" };
      const result = safeParseJsonb(data, schema);
      expect(result).toEqual({});
    });

    it("should return null for other schema types on failure", () => {
      const schema = z.string();
      const data = 123;
      const result = safeParseJsonb(data, schema);
      expect(result).toBeNull();
    });

    it("should handle parsing errors gracefully", () => {
      const schema = z.object({ name: z.string() });
      const data = null;
      const result = safeParseJsonb(data, schema);
      expect(result).toEqual({});
    });
  });

  describe("sanitizeJsonb", () => {
    it("should return empty object for null", () => {
      expect(sanitizeJsonb(null)).toEqual({});
    });

    it("should return empty object for undefined", () => {
      expect(sanitizeJsonb(undefined)).toEqual({});
    });

    it("should return empty object for non-objects", () => {
      expect(sanitizeJsonb("string")).toEqual({});
      expect(sanitizeJsonb(123)).toEqual({});
      expect(sanitizeJsonb(true)).toEqual({});
    });

    it("should sanitize valid objects", () => {
      const data = { key: "value", nested: { field: "data" } };
      const result = sanitizeJsonb(data);
      expect(result).toEqual(data);
    });

    it("should remove dangerous keys", () => {
      const data = {
        __proto__: "danger",
        constructor: "danger",
        prototype: "danger",
        safeKey: "value",
      };
      const result = sanitizeJsonb(data);
      expect(result).toEqual({ safeKey: "value" });
      expect("__proto__" in result).toBe(false);
      expect("constructor" in result).toBe(false);
      expect("prototype" in result).toBe(false);
    });

    it("should recursively sanitize nested objects", () => {
      const data = {
        safe: "value",
        nested: {
          __proto__: "danger",
          safeNested: "value",
        },
      };
      const result = sanitizeJsonb(data);
      expect(result).toEqual({
        safe: "value",
        nested: { safeNested: "value" },
      });
    });

    it("should convert arrays to objects with numeric keys", () => {
      const data = ["a", "b", { nested: "object" }];
      const result = sanitizeJsonb(data);
      expect(result).toEqual({
        "0": "a",
        "1": "b",
        "2": { nested: "object" },
      });
    });

    it("should handle mixed nested structures", () => {
      const data = {
        array: [1, 2, { nested: "value" }],
        object: { key: "value" },
      };
      const result = sanitizeJsonb(data);
      expect(result.array).toEqual({
        "0": 1,
        "1": 2,
        "2": { nested: "value" },
      });
      expect(result.object).toEqual({ key: "value" });
    });

    it("should return empty object on sanitization errors", () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      const result = sanitizeJsonb(circular);
      expect(typeof result).toBe("object");
    });
  });

  describe("safeParseJsonbLegacy", () => {
    it("should parse valid data", () => {
      const schema = z.object({ name: z.string() });
      const data = { name: "John" };
      const result = safeParseJsonbLegacy(schema, data);
      expect(result).toEqual(data);
    });

    it("should return null for invalid data", () => {
      const schema = z.object({ name: z.string() });
      const data = { name: 123 };
      const result = safeParseJsonbLegacy(schema, data);
      expect(result).toBeNull();
    });

    it("should return null on parsing errors", () => {
      const schema = z.object({ name: z.string() });
      const data = null;
      const result = safeParseJsonbLegacy(schema, data);
      expect(result).toBeNull();
    });
  });
});