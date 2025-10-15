/**
 * Tests for Contact Identity Business Schemas
 */

import { describe, it, expect } from "vitest";
import {
  ContactIdentitySchema,
  CreateContactIdentityBodySchema,
  UpdateContactIdentityBodySchema,
  ContactIdentityQuerySchema,
  ContactIdentityListResponseSchema,
} from "../contact-identities";

describe("ContactIdentitySchema", () => {
  it("validates a complete contact identity", () => {
    const validIdentity = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      contactId: "550e8400-e29b-41d4-a716-446655440001",
      userId: "550e8400-e29b-41d4-a716-446655440002",
      kind: "email",
      value: "john@example.com",
      provider: "gmail",
      createdAt: new Date("2024-01-15T10:00:00Z"),
    };

    const result = ContactIdentitySchema.safeParse(validIdentity);
    expect(result.success).toBe(true);
  });

  it("validates identity without optional provider", () => {
    const minimalIdentity = {
      id: "550e8400-e29b-41d4-a716-446655440003",
      contactId: "550e8400-e29b-41d4-a716-446655440004",
      userId: "550e8400-e29b-41d4-a716-446655440005",
      kind: "phone",
      value: "+1234567890",
      provider: null,
      createdAt: new Date(),
    };

    const result = ContactIdentitySchema.safeParse(minimalIdentity);
    expect(result.success).toBe(true);
  });
});

describe("CreateContactIdentityBodySchema", () => {
  it("validates valid create request with all fields", () => {
    const validRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "email",
      value: "john@example.com",
      provider: "gmail",
    };

    const result = CreateContactIdentityBodySchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("validates minimal create request", () => {
    const minimalRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "phone",
      value: "+1234567890",
    };

    const result = CreateContactIdentityBodySchema.safeParse(minimalRequest);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const invalidRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "email",
      // Missing value
    };

    const result = CreateContactIdentityBodySchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid UUID format", () => {
    const invalidRequest = {
      contactId: "not-a-uuid",
      kind: "email",
      value: "john@example.com",
    };

    const result = CreateContactIdentityBodySchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it("rejects empty kind", () => {
    const invalidRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "",
      value: "john@example.com",
    };

    const result = CreateContactIdentityBodySchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it("rejects empty value", () => {
    const invalidRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "email",
      value: "",
    };

    const result = CreateContactIdentityBodySchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe("UpdateContactIdentityBodySchema", () => {
  it("validates single field update", () => {
    const validUpdate = {
      value: "newemail@example.com",
    };

    const result = UpdateContactIdentityBodySchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("validates multiple field update", () => {
    const validUpdate = {
      kind: "email",
      value: "updated@example.com",
      provider: "outlook",
    };

    const result = UpdateContactIdentityBodySchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("allows null value for provider", () => {
    const validUpdate = {
      provider: null,
    };

    const result = UpdateContactIdentityBodySchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("rejects empty update (no fields)", () => {
    const invalidUpdate = {};

    const result = UpdateContactIdentityBodySchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("At least one field must be provided");
    }
  });

  it("rejects empty string for kind", () => {
    const invalidUpdate = {
      kind: "",
    };

    const result = UpdateContactIdentityBodySchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });

  it("rejects empty string for value", () => {
    const invalidUpdate = {
      value: "",
    };

    const result = UpdateContactIdentityBodySchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe("ContactIdentityQuerySchema", () => {
  it("validates query with default values", () => {
    const query = {};

    const result = ContactIdentityQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("validates query with all filters", () => {
    const query = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      kind: ["email", "phone"],
      provider: ["gmail", "outlook"],
      search: "john",
      page: "2",
      pageSize: "100",
    };

    const result = ContactIdentityQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(100);
      expect(result.data.kind).toEqual(["email", "phone"]);
      expect(result.data.provider).toEqual(["gmail", "outlook"]);
    }
  });

  it("rejects pageSize over 200", () => {
    const query = {
      pageSize: "250",
    };

    const result = ContactIdentityQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it("rejects invalid contactId UUID", () => {
    const query = {
      contactId: "not-a-uuid",
    };

    const result = ContactIdentityQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it("coerces string numbers to integers", () => {
    const query = {
      page: "3",
      pageSize: "75",
    };

    const result = ContactIdentityQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(75);
      expect(typeof result.data.page).toBe("number");
    }
  });
});

describe("ContactIdentityListResponseSchema", () => {
  it("validates complete response", () => {
    const response = {
      items: [
        {
          id: "550e8400-e29b-41d4-a716-446655440006",
          contactId: "550e8400-e29b-41d4-a716-446655440007",
          userId: "550e8400-e29b-41d4-a716-446655440008",
          kind: "email",
          value: "john@example.com",
          provider: "gmail",
          createdAt: new Date(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440009",
          contactId: "550e8400-e29b-41d4-a716-446655440007",
          userId: "550e8400-e29b-41d4-a716-446655440008",
          kind: "phone",
          value: "+1234567890",
          provider: null,
          createdAt: new Date(),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    const result = ContactIdentityListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates empty response", () => {
    const response = {
      items: [],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    const result = ContactIdentityListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("rejects response with missing pagination fields", () => {
    const invalidResponse = {
      items: [],
      pagination: {
        page: 1,
        pageSize: 50,
        // Missing other required fields
      },
    };

    const result = ContactIdentityListResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});
