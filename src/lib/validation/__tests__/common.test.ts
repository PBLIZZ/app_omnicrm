import { describe, it, expect } from "vitest";
import {
  PaginationQuerySchema,
  PaginationMetaSchema,
  createPaginatedResponseSchema,
  SafeJsonbRecordSchema,
  NullableJsonbSchema,
  OptionalJsonbSchema,
  NullishJsonbSchema,
  DateInputSchema,
  coerceNullableDate,
  NullableDateInputSchema,
  UuidSchema,
  OptionalUuidSchema,
  NullableUuidSchema,
  NullishUuidSchema,
  UuidArraySchema,
  nonEmptyArray,
  boundedArray,
  SearchQuerySchema,
  createFilterArraySchema,
  SuccessResponseSchema,
  createItemResponseSchema,
  DeleteResponseSchema,
} from "../common";
import { z } from "zod";

describe("common validation schemas", () => {
  describe("PaginationQuerySchema", () => {
    it("should validate valid pagination parameters", () => {
      const result = PaginationQuerySchema.parse({
        page: 1,
        pageSize: 20,
        order: "desc",
      });

      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        order: "desc",
      });
    });

    it("should apply default values", () => {
      const result = PaginationQuerySchema.parse({});

      expect(result).toEqual({
        page: 1,
        pageSize: 20,
        order: "desc",
      });
    });

    it("should coerce string numbers to integers", () => {
      const result = PaginationQuerySchema.parse({
        page: "5",
        pageSize: "50",
      });

      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(50);
    });

    it("should enforce minimum page value", () => {
      expect(() =>
        PaginationQuerySchema.parse({ page: 0 }),
      ).toThrow();
    });

    it("should enforce maximum pageSize value", () => {
      expect(() =>
        PaginationQuerySchema.parse({ pageSize: 201 }),
      ).toThrow();
    });

    it("should enforce minimum pageSize value", () => {
      expect(() =>
        PaginationQuerySchema.parse({ pageSize: 0 }),
      ).toThrow();
    });

    it("should only accept asc or desc for order", () => {
      expect(() =>
        PaginationQuerySchema.parse({ order: "invalid" }),
      ).toThrow();
    });

    it("should handle decimal numbers by rounding", () => {
      const result = PaginationQuerySchema.parse({
        page: 2.7,
        pageSize: 15.3,
      });

      expect(Number.isInteger(result.page)).toBe(true);
      expect(Number.isInteger(result.pageSize)).toBe(true);
    });
  });

  describe("PaginationMetaSchema", () => {
    it("should validate valid pagination metadata", () => {
      const result = PaginationMetaSchema.parse({
        page: 2,
        pageSize: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });

      expect(result).toEqual({
        page: 2,
        pageSize: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it("should enforce minimum values for numeric fields", () => {
      expect(() =>
        PaginationMetaSchema.parse({
          page: 0,
          pageSize: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: false,
        }),
      ).toThrow();
    });

    it("should require all fields", () => {
      expect(() =>
        PaginationMetaSchema.parse({
          page: 1,
          pageSize: 20,
        }),
      ).toThrow();
    });

    it("should accept zero for total and totalPages", () => {
      const result = PaginationMetaSchema.parse({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe("createPaginatedResponseSchema", () => {
    it("should create a paginated response schema", () => {
      const itemSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      const schema = createPaginatedResponseSchema(itemSchema);

      const result = schema.parse({
        items: [
          { id: "1", name: "Item 1" },
          { id: "2", name: "Item 2" },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it("should validate item schemas", () => {
      const itemSchema = z.object({
        id: z.string().uuid(),
      });

      const schema = createPaginatedResponseSchema(itemSchema);

      expect(() =>
        schema.parse({
          items: [{ id: "not-a-uuid" }],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }),
      ).toThrow();
    });

    it("should accept empty items array", () => {
      const itemSchema = z.object({ id: z.string() });
      const schema = createPaginatedResponseSchema(itemSchema);

      const result = schema.parse({
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      expect(result.items).toEqual([]);
    });
  });

  describe("JSONB schemas", () => {
    describe("SafeJsonbRecordSchema", () => {
      it("should accept valid record objects", () => {
        const result = SafeJsonbRecordSchema.parse({
          key1: "value1",
          key2: 42,
          key3: { nested: "object" },
        });

        expect(result).toEqual({
          key1: "value1",
          key2: 42,
          key3: { nested: "object" },
        });
      });

      it("should accept empty objects", () => {
        const result = SafeJsonbRecordSchema.parse({});
        expect(result).toEqual({});
      });

      it("should reject arrays", () => {
        expect(() => SafeJsonbRecordSchema.parse([])).toThrow();
      });
    });

    describe("NullableJsonbSchema", () => {
      it("should transform null to empty object", () => {
        const result = NullableJsonbSchema.parse(null);
        expect(result).toEqual({});
      });

      it("should transform undefined to empty object", () => {
        const result = NullableJsonbSchema.parse(undefined);
        expect(result).toEqual({});
      });

      it("should pass through valid objects", () => {
        const result = NullableJsonbSchema.parse({ key: "value" });
        expect(result).toEqual({ key: "value" });
      });
    });

    describe("OptionalJsonbSchema", () => {
      it("should accept any value", () => {
        expect(OptionalJsonbSchema.parse("string")).toBe("string");
        expect(OptionalJsonbSchema.parse(42)).toBe(42);
        expect(OptionalJsonbSchema.parse({ key: "value" })).toEqual({
          key: "value",
        });
      });

      it("should accept undefined", () => {
        expect(OptionalJsonbSchema.parse(undefined)).toBeUndefined();
      });
    });

    describe("NullishJsonbSchema", () => {
      it("should accept null", () => {
        expect(NullishJsonbSchema.parse(null)).toBeNull();
      });

      it("should accept undefined", () => {
        expect(NullishJsonbSchema.parse(undefined)).toBeUndefined();
      });

      it("should accept any value", () => {
        expect(NullishJsonbSchema.parse({ key: "value" })).toEqual({
          key: "value",
        });
      });
    });
  });

  describe("Date schemas", () => {
    describe("DateInputSchema", () => {
      it("should accept string dates", () => {
        const result = DateInputSchema.parse("2024-01-01");
        expect(result).toBe("2024-01-01");
      });

      it("should accept number timestamps", () => {
        const timestamp = Date.now();
        const result = DateInputSchema.parse(timestamp);
        expect(result).toBe(timestamp);
      });

      it("should accept Date objects", () => {
        const date = new Date();
        const result = DateInputSchema.parse(date);
        expect(result).toBe(date);
      });

      it("should accept null", () => {
        expect(DateInputSchema.parse(null)).toBeNull();
      });

      it("should accept undefined", () => {
        expect(DateInputSchema.parse(undefined)).toBeUndefined();
      });
    });

    describe("coerceNullableDate", () => {
      it("should return undefined for undefined input", () => {
        expect(coerceNullableDate(undefined)).toBeUndefined();
      });

      it("should return null for null input", () => {
        expect(coerceNullableDate(null)).toBeNull();
      });

      it("should convert string to Date", () => {
        const result = coerceNullableDate("2024-01-01");
        expect(result).toBeInstanceOf(Date);
        expect(result?.toISOString()).toContain("2024-01-01");
      });

      it("should convert number to Date", () => {
        const timestamp = Date.UTC(2024, 0, 1);
        const result = coerceNullableDate(timestamp);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).toBe(timestamp);
      });

      it("should pass through Date objects", () => {
        const date = new Date("2024-01-01");
        const result = coerceNullableDate(date);
        expect(result).toBe(date);
      });

      it("should throw on invalid date strings", () => {
        expect(() => coerceNullableDate("not-a-date")).toThrow(
          "Invalid date value",
        );
      });

      it("should throw on NaN dates", () => {
        expect(() => coerceNullableDate("invalid")).toThrow();
      });
    });

    describe("NullableDateInputSchema", () => {
      it("should transform valid dates", () => {
        const result = NullableDateInputSchema.parse("2024-01-01");
        expect(result).toBeInstanceOf(Date);
      });

      it("should handle null", () => {
        expect(NullableDateInputSchema.parse(null)).toBeNull();
      });

      it("should handle undefined", () => {
        expect(NullableDateInputSchema.parse(undefined)).toBeUndefined();
      });
    });
  });

  describe("UUID schemas", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const invalidUuid = "not-a-uuid";

    describe("UuidSchema", () => {
      it("should accept valid UUIDs", () => {
        expect(UuidSchema.parse(validUuid)).toBe(validUuid);
      });

      it("should reject invalid UUIDs", () => {
        expect(() => UuidSchema.parse(invalidUuid)).toThrow();
      });

      it("should reject empty strings", () => {
        expect(() => UuidSchema.parse("")).toThrow();
      });
    });

    describe("OptionalUuidSchema", () => {
      it("should accept valid UUIDs", () => {
        expect(OptionalUuidSchema.parse(validUuid)).toBe(validUuid);
      });

      it("should accept undefined", () => {
        expect(OptionalUuidSchema.parse(undefined)).toBeUndefined();
      });

      it("should reject invalid UUIDs", () => {
        expect(() => OptionalUuidSchema.parse(invalidUuid)).toThrow();
      });
    });

    describe("NullableUuidSchema", () => {
      it("should accept valid UUIDs", () => {
        expect(NullableUuidSchema.parse(validUuid)).toBe(validUuid);
      });

      it("should accept null", () => {
        expect(NullableUuidSchema.parse(null)).toBeNull();
      });

      it("should reject undefined", () => {
        expect(() => NullableUuidSchema.parse(undefined)).toThrow();
      });
    });

    describe("NullishUuidSchema", () => {
      it("should accept valid UUIDs", () => {
        expect(NullishUuidSchema.parse(validUuid)).toBe(validUuid);
      });

      it("should accept null", () => {
        expect(NullishUuidSchema.parse(null)).toBeNull();
      });

      it("should accept undefined", () => {
        expect(NullishUuidSchema.parse(undefined)).toBeUndefined();
      });
    });

    describe("UuidArraySchema", () => {
      it("should accept array of valid UUIDs", () => {
        const uuids = [validUuid, "650e8400-e29b-41d4-a716-446655440000"];
        expect(UuidArraySchema.parse(uuids)).toEqual(uuids);
      });

      it("should accept empty array", () => {
        expect(UuidArraySchema.parse([])).toEqual([]);
      });

      it("should reject array with invalid UUIDs", () => {
        expect(() =>
          UuidArraySchema.parse([validUuid, invalidUuid]),
        ).toThrow();
      });
    });
  });

  describe("Array schema factories", () => {
    describe("nonEmptyArray", () => {
      it("should accept non-empty arrays", () => {
        const schema = nonEmptyArray(z.string());
        expect(schema.parse(["item"])).toEqual(["item"]);
      });

      it("should reject empty arrays", () => {
        const schema = nonEmptyArray(z.string());
        expect(() => schema.parse([])).toThrow(
          "Array must contain at least one item",
        );
      });

      it("should validate item schemas", () => {
        const schema = nonEmptyArray(z.number());
        expect(() => schema.parse(["not-a-number"])).toThrow();
      });
    });

    describe("boundedArray", () => {
      it("should accept arrays within bounds", () => {
        const schema = boundedArray(z.string(), 5);
        expect(schema.parse(["a", "b", "c"])).toEqual(["a", "b", "c"]);
      });

      it("should reject arrays exceeding max length", () => {
        const schema = boundedArray(z.string(), 2);
        expect(() => schema.parse(["a", "b", "c"])).toThrow(
          "Array cannot exceed 2 items",
        );
      });

      it("should reject arrays below min length", () => {
        const schema = boundedArray(z.string(), 5, 2);
        expect(() => schema.parse(["a"])).toThrow(
          "Array must contain at least 2 items",
        );
      });

      it("should accept empty arrays with default minLength", () => {
        const schema = boundedArray(z.string(), 5);
        expect(schema.parse([])).toEqual([]);
      });

      it("should enforce custom minLength", () => {
        const schema = boundedArray(z.string(), 5, 1);
        expect(() => schema.parse([])).toThrow();
      });
    });
  });

  describe("Search and filter schemas", () => {
    describe("SearchQuerySchema", () => {
      it("should accept valid search strings", () => {
        expect(SearchQuerySchema.parse("search term")).toBe("search term");
      });

      it("should accept undefined", () => {
        expect(SearchQuerySchema.parse(undefined)).toBeUndefined();
      });

      it("should reject empty strings", () => {
        expect(() => SearchQuerySchema.parse("")).toThrow();
      });
    });

    describe("createFilterArraySchema", () => {
      it("should create filter schema with valid enum values", () => {
        const schema = createFilterArraySchema(["active", "inactive"] as const);
        expect(schema.parse(["active"])).toEqual(["active"]);
      });

      it("should accept empty arrays", () => {
        const schema = createFilterArraySchema(["active", "inactive"] as const);
        expect(schema.parse([])).toEqual([]);
      });

      it("should accept undefined", () => {
        const schema = createFilterArraySchema(["active", "inactive"] as const);
        expect(schema.parse(undefined)).toBeUndefined();
      });

      it("should reject invalid enum values", () => {
        const schema = createFilterArraySchema(["active", "inactive"] as const);
        expect(() => schema.parse(["invalid"])).toThrow();
      });
    });
  });

  describe("Response schemas", () => {
    describe("SuccessResponseSchema", () => {
      it("should validate success response", () => {
        expect(SuccessResponseSchema.parse({ success: true })).toEqual({
          success: true,
        });
      });

      it("should reject false value", () => {
        expect(() =>
          SuccessResponseSchema.parse({ success: false }),
        ).toThrow();
      });
    });

    describe("createItemResponseSchema", () => {
      it("should create item response schema", () => {
        const itemSchema = z.object({ id: z.string(), name: z.string() });
        const schema = createItemResponseSchema(itemSchema);

        const result = schema.parse({
          item: { id: "1", name: "Test" },
        });

        expect(result.item).toEqual({ id: "1", name: "Test" });
      });

      it("should validate item schema", () => {
        const itemSchema = z.object({ id: z.number() });
        const schema = createItemResponseSchema(itemSchema);

        expect(() =>
          schema.parse({ item: { id: "not-a-number" } }),
        ).toThrow();
      });
    });

    describe("DeleteResponseSchema", () => {
      it("should validate deletion response", () => {
        expect(DeleteResponseSchema.parse({ deleted: 5 })).toEqual({
          deleted: 5,
        });
      });

      it("should accept zero deletions", () => {
        expect(DeleteResponseSchema.parse({ deleted: 0 })).toEqual({
          deleted: 0,
        });
      });

      it("should reject negative values", () => {
        expect(() => DeleteResponseSchema.parse({ deleted: -1 })).toThrow();
      });

      it("should reject non-integers", () => {
        expect(() => DeleteResponseSchema.parse({ deleted: 5.5 })).toThrow();
      });
    });
  });
});