/**
 * Compliance Repository Tests
 *
 * Comprehensive tests for ComplianceRepository.
 * Tests consent management, HIPAA compliance checks, and task reminders.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComplianceRepository, createComplianceRepository } from "../compliance.repo";
import { createMockDbClient, type MockDbClient } from "@packages/testing";
import type { ConsentType } from "../compliance.repo";

describe("ComplianceRepository", () => {
  let mockDb: MockDbClient;
  let repo: ComplianceRepository;
  const mockUserId = "user-123";
  const mockContactId = "contact-456";
  const mockConsentId = "consent-789";

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = new ComplianceRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("getConsentStatus", () => {
    it("should get all consents for a contact", async () => {
      const mockConsents = [
        {
          id: mockConsentId,
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
        {
          id: "consent-2",
          contactId: mockContactId,
          consentType: "data_processing" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:05:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsents);

      const result = await repo.getConsentStatus(mockUserId, mockContactId);

      expect(result).toHaveLength(2);
      expect(result[0]?.consentType).toBe("hipaa");
      expect(result[0]?.granted).toBe(true);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it("should filter by consent type when provided", async () => {
      const mockConsent = [
        {
          id: mockConsentId,
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsent);

      const result = await repo.getConsentStatus(mockUserId, mockContactId, "hipaa");

      expect(result).toHaveLength(1);
      expect(result[0]?.consentType).toBe("hipaa");
    });

    it("should handle null granted field", async () => {
      const mockConsents = [
        {
          id: mockConsentId,
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: null,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsents);

      const result = await repo.getConsentStatus(mockUserId, mockContactId);

      expect(result[0]?.granted).toBe(true); // Should default to true
    });

    it("should return empty array when no consents found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue([]);

      const result = await repo.getConsentStatus(mockUserId, mockContactId);

      expect(result).toEqual([]);
    });
  });

  describe("getConsentHistory", () => {
    it("should get full consent history for a contact", async () => {
      const mockHistory = [
        {
          id: "consent-1",
          consentType: "hipaa" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date("2025-01-15T10:00:00Z"),
        },
        {
          id: "consent-2",
          consentType: "hipaa" as ConsentType,
          granted: false,
          grantedAt: new Date("2025-01-10T10:00:00Z"),
          consentTextVersion: "v0.9",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date("2025-01-10T10:00:00Z"),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockHistory);

      const result = await repo.getConsentHistory(mockUserId, mockContactId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("ipAddress");
      expect(result[0]).toHaveProperty("userAgent");
      expect(result[0]?.granted).toBe(true);
    });

    it("should handle null granted values", async () => {
      const mockHistory = [
        {
          id: "consent-1",
          consentType: "hipaa" as ConsentType,
          granted: null,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
          ipAddress: null,
          userAgent: null,
          createdAt: new Date("2025-01-15T10:00:00Z"),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockHistory);

      const result = await repo.getConsentHistory(mockUserId, mockContactId);

      expect(result[0]?.granted).toBe(true);
    });
  });

  describe("getContactsMissingConsents", () => {
    it("should find contacts missing required consents", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          displayName: "John Doe",
          primaryEmail: "john@example.com",
        },
        {
          id: "contact-2",
          displayName: "Jane Smith",
          primaryEmail: "jane@example.com",
        },
      ];

      const mockConsents = [
        {
          contactId: "contact-1",
          consentType: "hipaa" as ConsentType,
          granted: true,
        },
        // contact-2 has no consents
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy = undefined;
      mockDb.select.mockResolvedValueOnce(mockContacts);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce(mockConsents);

      const result = await repo.getContactsMissingConsents(mockUserId, [
        "hipaa",
        "data_processing",
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]?.missingConsentTypes).toContain("data_processing");
      expect(result[1]?.missingConsentTypes).toContain("hipaa");
      expect(result[1]?.missingConsentTypes).toContain("data_processing");
    });

    it("should exclude contacts with all required consents", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          displayName: "John Doe",
          primaryEmail: "john@example.com",
        },
      ];

      const mockConsents = [
        {
          contactId: "contact-1",
          consentType: "hipaa" as ConsentType,
          granted: true,
        },
        {
          contactId: "contact-1",
          consentType: "data_processing" as ConsentType,
          granted: true,
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce(mockContacts);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce(mockConsents);

      const result = await repo.getContactsMissingConsents(mockUserId, [
        "hipaa",
        "data_processing",
      ]);

      expect(result).toEqual([]);
    });

    it("should not include contacts with revoked consents", async () => {
      const mockContacts = [
        {
          id: "contact-1",
          displayName: "John Doe",
          primaryEmail: "john@example.com",
        },
      ];

      const mockConsents = [
        {
          contactId: "contact-1",
          consentType: "hipaa" as ConsentType,
          granted: false, // Revoked
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce(mockContacts);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockResolvedValueOnce(mockConsents);

      const result = await repo.getContactsMissingConsents(mockUserId, ["hipaa"]);

      expect(result).toHaveLength(1);
      expect(result[0]?.missingConsentTypes).toContain("hipaa");
    });
  });

  describe("createConsentReminderTask", () => {
    it("should create a consent reminder task", async () => {
      const mockContact = {
        displayName: "John Doe",
      };

      const mockTask = {
        id: "task-123",
        userId: mockUserId,
        name: "Obtain hipaa consent from John Doe",
        status: "todo",
        priority: "high",
        dueDate: "2025-01-31",
        details: {
          type: "consent_reminder",
          contactId: mockContactId,
          consentType: "hipaa",
          createdBy: "ai_compliance_tool",
        },
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockContact]);

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockTask]);

      const result = await repo.createConsentReminderTask(
        mockUserId,
        mockContactId,
        "hipaa",
        "2025-01-31"
      );

      expect(result).toBe("task-123");
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it("should create task without due date", async () => {
      const mockContact = {
        displayName: "Jane Smith",
      };

      const mockTask = {
        id: "task-123",
        userId: mockUserId,
        name: "Obtain data_processing consent from Jane Smith",
        status: "todo",
        priority: "high",
        dueDate: null,
        details: {
          type: "consent_reminder",
          contactId: mockContactId,
          consentType: "data_processing",
          createdBy: "ai_compliance_tool",
        },
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockContact]);

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockTask]);

      const result = await repo.createConsentReminderTask(
        mockUserId,
        mockContactId,
        "data_processing"
      );

      expect(result).toBe("task-123");
    });

    it("should throw error when contact not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      await expect(
        repo.createConsentReminderTask(mockUserId, "non-existent", "hipaa")
      ).rejects.toThrow("Contact not found");
    });

    it("should throw error when task creation fails", async () => {
      const mockContact = {
        displayName: "John Doe",
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockContact]);

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      await expect(
        repo.createConsentReminderTask(mockUserId, mockContactId, "hipaa")
      ).rejects.toThrow("Failed to create task");
    });
  });

  describe("checkHipaaCompliance", () => {
    it("should return compliant when all required consents are granted", async () => {
      const mockConsents = [
        {
          id: "consent-1",
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
        {
          id: "consent-2",
          contactId: mockContactId,
          consentType: "data_processing" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:05:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsents);

      const result = await repo.checkHipaaCompliance(mockUserId, mockContactId);

      expect(result.isCompliant).toBe(true);
      expect(result.hasHipaaConsent).toBe(true);
      expect(result.hasDataProcessingConsent).toBe(true);
      expect(result.missingConsents).toEqual([]);
      expect(result.issues).toEqual([]);
    });

    it("should return non-compliant when HIPAA consent is missing", async () => {
      const mockConsents = [
        {
          id: "consent-1",
          contactId: mockContactId,
          consentType: "data_processing" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsents);

      const result = await repo.checkHipaaCompliance(mockUserId, mockContactId);

      expect(result.isCompliant).toBe(false);
      expect(result.hasHipaaConsent).toBe(false);
      expect(result.hasDataProcessingConsent).toBe(true);
      expect(result.missingConsents).toContain("hipaa");
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("HIPAA consent");
    });

    it("should return non-compliant when data processing consent is missing", async () => {
      const mockConsents = [
        {
          id: "consent-1",
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsents);

      const result = await repo.checkHipaaCompliance(mockUserId, mockContactId);

      expect(result.isCompliant).toBe(false);
      expect(result.hasHipaaConsent).toBe(true);
      expect(result.hasDataProcessingConsent).toBe(false);
      expect(result.missingConsents).toContain("data_processing");
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("data processing consent");
    });

    it("should return non-compliant when all consents are missing", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue([]);

      const result = await repo.checkHipaaCompliance(mockUserId, mockContactId);

      expect(result.isCompliant).toBe(false);
      expect(result.hasHipaaConsent).toBe(false);
      expect(result.hasDataProcessingConsent).toBe(false);
      expect(result.missingConsents).toEqual(["hipaa", "data_processing"]);
      expect(result.issues).toHaveLength(2);
    });

    it("should handle revoked consents", async () => {
      const mockConsents = [
        {
          id: "consent-1",
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: false,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
        {
          id: "consent-2",
          contactId: mockContactId,
          consentType: "data_processing" as ConsentType,
          granted: false,
          grantedAt: new Date("2025-01-15T10:05:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsents);

      const result = await repo.checkHipaaCompliance(mockUserId, mockContactId);

      expect(result.isCompliant).toBe(false);
      expect(result.hasHipaaConsent).toBe(false);
      expect(result.hasDataProcessingConsent).toBe(false);
    });

    it("should use latest consent when multiple records exist", async () => {
      const mockConsents = [
        {
          id: "consent-2",
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-20T10:00:00Z"),
          consentTextVersion: "v1.0",
        },
        {
          id: "consent-1",
          contactId: mockContactId,
          consentType: "hipaa" as ConsentType,
          granted: false,
          grantedAt: new Date("2025-01-15T10:00:00Z"),
          consentTextVersion: "v0.9",
        },
        {
          id: "consent-3",
          contactId: mockContactId,
          consentType: "data_processing" as ConsentType,
          granted: true,
          grantedAt: new Date("2025-01-15T10:05:00Z"),
          consentTextVersion: "v1.0",
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockConsents);

      const result = await repo.checkHipaaCompliance(mockUserId, mockContactId);

      expect(result.isCompliant).toBe(true);
      expect(result.hasHipaaConsent).toBe(true);
    });
  });

  describe("createComplianceRepository factory", () => {
    it("should create a ComplianceRepository instance", () => {
      const repo = createComplianceRepository(mockDb as any);
      expect(repo).toBeInstanceOf(ComplianceRepository);
    });
  });
});