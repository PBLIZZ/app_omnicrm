/**
 * Compliance & Consent Tools Tests
 *
 * Comprehensive test suite for compliance and consent management tools
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getConsentStatusHandler,
  listMissingConsentsHandler,
  getConsentHistoryHandler,
  generateConsentReminderHandler,
  checkHipaaComplianceHandler,
} from "../compliance";
import type { ToolExecutionContext } from "../../types";
import { getDb } from "@/server/db/client";
import { createComplianceRepository } from "@repo";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@repo");

const mockContext: ToolExecutionContext = {
  userId: "user-123",
  timestamp: new Date("2025-01-15T10:00:00Z"),
  requestId: "req-123",
};

describe("get_consent_status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve all consents for contact", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174000";
    const mockConsents = [
      {
        id: "223e4567-e89b-12d3-a456-426614174001",
        contactId,
        consentType: "hipaa" as const,
        granted: true,
        grantedAt: new Date("2025-01-10T00:00:00Z"),
        consentTextVersion: "v1.0",
      },
      {
        id: "323e4567-e89b-12d3-a456-426614174002",
        contactId,
        consentType: "data_processing" as const,
        granted: true,
        grantedAt: new Date("2025-01-10T00:00:00Z"),
        consentTextVersion: "v1.0",
      },
    ];

    const mockRepo = {
      getConsentStatus: vi.fn().mockResolvedValue(mockConsents),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await getConsentStatusHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result).toEqual({
      contactId,
      consents: mockConsents,
      totalConsents: 2,
      filtered: { consentType: "all" },
    });

    expect(mockRepo.getConsentStatus).toHaveBeenCalledWith(
      "user-123",
      contactId,
      undefined,
    );
  });

  it("should filter by specific consent type", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174010";
    const mockConsents = [
      {
        id: "223e4567-e89b-12d3-a456-426614174011",
        contactId,
        consentType: "hipaa" as const,
        granted: true,
        grantedAt: new Date("2025-01-10T00:00:00Z"),
        consentTextVersion: "v1.0",
      },
    ];

    const mockRepo = {
      getConsentStatus: vi.fn().mockResolvedValue(mockConsents),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await getConsentStatusHandler(
      { contact_id: contactId, consent_type: "hipaa" },
      mockContext,
    );

    expect(result.filtered).toEqual({ consentType: "hipaa" });
    expect(mockRepo.getConsentStatus).toHaveBeenCalledWith(
      "user-123",
      contactId,
      "hipaa",
    );
  });

  it("should handle no consents", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174020";
    const mockRepo = {
      getConsentStatus: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await getConsentStatusHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result.totalConsents).toBe(0);
    expect(result.consents).toEqual([]);
  });

  it("should validate contact_id format", async () => {
    await expect(
      getConsentStatusHandler(
        { contact_id: "invalid-uuid" } as any,
        mockContext,
      ),
    ).rejects.toThrow();
  });
});

describe("list_missing_consents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should find contacts missing required consents", async () => {
    const mockMissingConsents = [
      {
        contactId: "123e4567-e89b-12d3-a456-426614174030",
        displayName: "Sarah Johnson",
        primaryEmail: "sarah@example.com",
        missingConsentTypes: ["hipaa" as const],
      },
      {
        contactId: "223e4567-e89b-12d3-a456-426614174031",
        displayName: "John Smith",
        primaryEmail: "john@example.com",
        missingConsentTypes: ["hipaa" as const, "data_processing" as const],
      },
    ];

    const mockRepo = {
      getContactsMissingConsents: vi.fn().mockResolvedValue(mockMissingConsents),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await listMissingConsentsHandler(
      { required_consent_types: ["hipaa", "data_processing"] },
      mockContext,
    );

    expect(result).toEqual({
      totalContacts: 2,
      requiredTypes: ["hipaa", "data_processing"],
      contacts: mockMissingConsents,
      summary: "Found 2 contacts missing required consents",
    });

    expect(mockRepo.getContactsMissingConsents).toHaveBeenCalledWith(
      "user-123",
      ["hipaa", "data_processing"],
    );
  });

  it("should use default required consent types", async () => {
    const mockRepo = {
      getContactsMissingConsents: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    await listMissingConsentsHandler({}, mockContext);

    expect(mockRepo.getContactsMissingConsents).toHaveBeenCalledWith(
      "user-123",
      ["data_processing", "hipaa"],
    );
  });

  it("should handle no missing consents", async () => {
    const mockRepo = {
      getContactsMissingConsents: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await listMissingConsentsHandler(
      { required_consent_types: ["marketing"] },
      mockContext,
    );

    expect(result.totalContacts).toBe(0);
    expect(result.summary).toBe("Found 0 contacts missing required consents");
  });

  it("should handle single missing contact", async () => {
    const mockMissingConsents = [
      {
        contactId: "123e4567-e89b-12d3-a456-426614174040",
        displayName: "Sarah Johnson",
        primaryEmail: "sarah@example.com",
        missingConsentTypes: ["marketing" as const],
      },
    ];

    const mockRepo = {
      getContactsMissingConsents: vi.fn().mockResolvedValue(mockMissingConsents),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await listMissingConsentsHandler(
      { required_consent_types: ["marketing"] },
      mockContext,
    );

    expect(result.summary).toBe("Found 1 contact missing required consents");
  });
});

describe("get_consent_history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve full consent audit trail", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174050";
    const mockHistory = [
      {
        id: "223e4567-e89b-12d3-a456-426614174053",
        consentType: "hipaa" as const,
        granted: true,
        grantedAt: new Date("2025-01-15T00:00:00Z"),
        consentTextVersion: "v1.1",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        createdAt: new Date("2025-01-15T00:00:00Z"),
      },
      {
        id: "323e4567-e89b-12d3-a456-426614174052",
        consentType: "data_processing" as const,
        granted: true,
        grantedAt: new Date("2025-01-10T00:00:00Z"),
        consentTextVersion: "v1.0",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        createdAt: new Date("2025-01-10T00:00:00Z"),
      },
      {
        id: "423e4567-e89b-12d3-a456-426614174051",
        consentType: "hipaa" as const,
        granted: true,
        grantedAt: new Date("2025-01-10T00:00:00Z"),
        consentTextVersion: "v1.0",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        createdAt: new Date("2025-01-10T00:00:00Z"),
      },
    ];

    const mockRepo = {
      getConsentHistory: vi.fn().mockResolvedValue(mockHistory),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await getConsentHistoryHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result).toEqual({
      contactId,
      totalRecords: 3,
      history: mockHistory,
      summary: "Found 3 consent records in audit trail",
    });

    expect(mockRepo.getConsentHistory).toHaveBeenCalledWith("user-123", contactId);
  });

  it("should handle single consent record", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174060";
    const mockHistory = [
      {
        id: "223e4567-e89b-12d3-a456-426614174061",
        consentType: "marketing" as const,
        granted: true,
        grantedAt: new Date("2025-01-10T00:00:00Z"),
        consentTextVersion: "v1.0",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        createdAt: new Date("2025-01-10T00:00:00Z"),
      },
    ];

    const mockRepo = {
      getConsentHistory: vi.fn().mockResolvedValue(mockHistory),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await getConsentHistoryHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result.summary).toBe("Found 1 consent record in audit trail");
  });

  it("should handle no consent history", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174070";
    const mockRepo = {
      getConsentHistory: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await getConsentHistoryHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result.totalRecords).toBe(0);
    expect(result.history).toEqual([]);
  });
});

describe("generate_consent_reminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create consent reminder task", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174080";
    const taskId = "223e4567-e89b-12d3-a456-426614174081";
    const mockRepo = {
      createConsentReminderTask: vi.fn().mockResolvedValue(taskId),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await generateConsentReminderHandler(
      {
        contact_id: contactId,
        consent_type: "hipaa",
      },
      mockContext,
    );

    expect(result).toEqual({
      success: true,
      taskId,
      contactId,
      consentType: "hipaa",
      dueDate: undefined,
      message: "Created high-priority task to obtain hipaa consent",
    });

    expect(mockRepo.createConsentReminderTask).toHaveBeenCalledWith(
      "user-123",
      contactId,
      "hipaa",
      undefined,
    );
  });

  it("should create reminder with due date", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174090";
    const taskId = "223e4567-e89b-12d3-a456-426614174091";
    const mockRepo = {
      createConsentReminderTask: vi.fn().mockResolvedValue(taskId),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await generateConsentReminderHandler(
      {
        contact_id: contactId,
        consent_type: "marketing",
        due_date: "2025-11-05",
      },
      mockContext,
    );

    expect(result.dueDate).toBe("2025-11-05");
    expect(mockRepo.createConsentReminderTask).toHaveBeenCalledWith(
      "user-123",
      contactId,
      "marketing",
      "2025-11-05",
    );
  });

  it("should validate consent type", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174100";
    await expect(
      generateConsentReminderHandler(
        {
          contact_id: contactId,
          consent_type: "invalid_type" as any,
        },
        mockContext,
      ),
    ).rejects.toThrow();
  });

  it("should validate due date format", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174110";
    await expect(
      generateConsentReminderHandler(
        {
          contact_id: contactId,
          consent_type: "hipaa",
          due_date: "invalid-date",
        } as any,
        mockContext,
      ),
    ).rejects.toThrow();
  });
});

describe("check_hipaa_compliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return compliant status when all consents present", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174120";
    const mockCompliance = {
      isCompliant: true,
      hasHipaaConsent: true,
      hasDataProcessingConsent: true,
      missingConsents: [],
      issues: [],
    };

    const mockRepo = {
      checkHipaaCompliance: vi.fn().mockResolvedValue(mockCompliance),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await checkHipaaComplianceHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result).toEqual({
      contactId,
      ...mockCompliance,
      summary: "Contact is HIPAA compliant - all required consents are in place",
    });

    expect(mockRepo.checkHipaaCompliance).toHaveBeenCalledWith("user-123", contactId);
  });

  it("should return non-compliant status with missing consents", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174130";
    const mockCompliance = {
      isCompliant: false,
      hasHipaaConsent: false,
      hasDataProcessingConsent: true,
      missingConsents: ["hipaa" as const],
      issues: ["Missing HIPAA consent - required for healthcare data processing"],
    };

    const mockRepo = {
      checkHipaaCompliance: vi.fn().mockResolvedValue(mockCompliance),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await checkHipaaComplianceHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result.isCompliant).toBe(false);
    expect(result.missingConsents).toEqual(["hipaa"]);
    expect(result.summary).toBe(
      "Contact is NOT HIPAA compliant - missing 1 required consent",
    );
    expect(result.issues).toHaveLength(1);
  });

  it("should handle multiple missing consents", async () => {
    const contactId = "123e4567-e89b-12d3-a456-426614174140";
    const mockCompliance = {
      isCompliant: false,
      hasHipaaConsent: false,
      hasDataProcessingConsent: false,
      missingConsents: ["hipaa" as const, "data_processing" as const],
      issues: [
        "Missing HIPAA consent - required for healthcare data processing",
        "Missing data processing consent - required for storing client information",
      ],
    };

    const mockRepo = {
      checkHipaaCompliance: vi.fn().mockResolvedValue(mockCompliance),
    };

    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(createComplianceRepository).mockReturnValue(mockRepo as any);

    const result = await checkHipaaComplianceHandler(
      { contact_id: contactId },
      mockContext,
    );

    expect(result.isCompliant).toBe(false);
    expect(result.missingConsents).toHaveLength(2);
    expect(result.summary).toBe(
      "Contact is NOT HIPAA compliant - missing 2 required consents",
    );
    expect(result.issues).toHaveLength(2);
  });

  it("should validate contact_id format", async () => {
    await expect(
      checkHipaaComplianceHandler(
        { contact_id: "not-a-uuid" } as any,
        mockContext,
      ),
    ).rejects.toThrow();
  });
});
