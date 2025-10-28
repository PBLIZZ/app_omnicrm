/**
 * Gmail Tools Tests
 *
 * Tests for all Gmail integration AI tools
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ToolExecutionContext } from "@/server/ai/tools/types";
import {
  getEmailHandler,
  searchEmailsHandler,
  listEmailThreadsHandler,
  getEmailsByContactHandler,
  groupEmailsBySenderHandler,
  groupEmailsByTopicHandler,
  categorizeEmailHandler,
  generateMarketingDigestHandler,
  generateWellnessDigestHandler,
  generateBusinessDigestHandler,
  generateGeneralDigestHandler,
  generateWeeklyDigestAllHandler,
} from "../gmail";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@repo");

const mockContext: ToolExecutionContext = {
  userId: "123e4567-e89b-12d3-a456-426614174000",
  timestamp: new Date(),
  requestId: "123e4567-e89b-12d3-a456-426614174999",
};

const mockEmail = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  userId: "123e4567-e89b-12d3-a456-426614174000",
  contactId: "123e4567-e89b-12d3-a456-426614174002",
  type: "email",
  subject: "Test Email Subject",
  bodyText: "This is a test email body",
  occurredAt: new Date("2025-01-15T10:00:00Z"),
  source: "gmail",
  sourceId: "gmail-msg-123",
  sourceMeta: { from: "sarah@example.com" },
  batchId: null,
  createdAt: new Date("2025-01-15T10:00:00Z"),
};

describe("get_email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve email by ID", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      getInteractionById: vi.fn().mockResolvedValue(mockEmail),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await getEmailHandler({ email_id: "123e4567-e89b-12d3-a456-426614174001" }, mockContext);

    expect(result).toEqual(mockEmail);
    expect(mockRepo.getInteractionById).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174001");
  });

  it("should throw error if email not found", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      getInteractionById: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    await expect(
      getEmailHandler({ email_id: "123e4567-e89b-12d3-a456-426614174999" }, mockContext)
    ).rejects.toThrow(AppError);
  });

  it("should throw error if interaction is not an email", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockNonEmail = { ...mockEmail, type: "call" };
    const mockRepo = {
      getInteractionById: vi.fn().mockResolvedValue(mockNonEmail),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    await expect(
      getEmailHandler({ email_id: "123e4567-e89b-12d3-a456-426614174001" }, mockContext)
    ).rejects.toThrow(AppError);
  });
});

describe("search_emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search emails with query parameter", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmails = [mockEmail];
    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: mockEmails, total: 1 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await searchEmailsHandler(
      { query: "test", limit: 20 },
      mockContext
    );

    expect(result.emails).toEqual(mockEmails);
    expect(result.count).toBe(1);
    expect(mockRepo.listInteractions).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        types: ["email"],
        search: "test",
        pageSize: 20,
      })
    );
  });

  it("should filter by date range", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    await searchEmailsHandler(
      {
        start_date: "2025-01-01T00:00:00Z",
        end_date: "2025-01-31T23:59:59Z",
        limit: 20,
      },
      mockContext
    );

    expect(mockRepo.listInteractions).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        occurredAfter: new Date("2025-01-01T00:00:00Z"),
        occurredBefore: new Date("2025-01-31T23:59:59Z"),
      })
    );
  });

  it("should filter by sender", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmails = [mockEmail];
    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: mockEmails, total: 1 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await searchEmailsHandler(
      { sender: "sarah@example.com", limit: 20 },
      mockContext
    );

    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]).toEqual(mockEmail);
  });
});

describe("list_email_threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should group emails by contact into threads", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmail1 = { ...mockEmail, occurredAt: new Date("2025-01-15T10:00:00Z") };
    const mockEmail2 = {
      ...mockEmail,
      id: "123e4567-e89b-12d3-a456-426614174003",
      occurredAt: new Date("2025-01-16T10:00:00Z"),
    };

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [mockEmail2, mockEmail1], total: 2 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await listEmailThreadsHandler({ limit: 10 }, mockContext);

    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.contactId).toBe("123e4567-e89b-12d3-a456-426614174002");
    expect(result.threads[0]?.emailCount).toBe(2);
    expect(result.threads[0]?.latestEmail.id).toBe("123e4567-e89b-12d3-a456-426614174003");
  });

  it("should filter threads by contact_id", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [mockEmail], total: 1 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    await listEmailThreadsHandler({ contact_id: "123e4567-e89b-12d3-a456-426614174002", limit: 10 }, mockContext);

    expect(mockRepo.listInteractions).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        contactId: "123e4567-e89b-12d3-a456-426614174002",
      })
    );
  });

  it("should sort threads by latest email", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmail1 = {
      ...mockEmail,
      contactId: "123e4567-e89b-12d3-a456-426614174005",
      occurredAt: new Date("2025-01-10T10:00:00Z"),
    };
    const mockEmail2 = {
      ...mockEmail,
      id: "123e4567-e89b-12d3-a456-426614174003",
      contactId: "123e4567-e89b-12d3-a456-426614174006",
      occurredAt: new Date("2025-01-20T10:00:00Z"),
    };

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [mockEmail1, mockEmail2], total: 2 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await listEmailThreadsHandler({ limit: 10 }, mockContext);

    expect(result.threads[0]?.contactId).toBe("123e4567-e89b-12d3-a456-426614174006");
    expect(result.threads[1]?.contactId).toBe("123e4567-e89b-12d3-a456-426614174005");
  });
});

describe("get_emails_by_contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve emails for specific contact", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmails = [mockEmail];
    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: mockEmails, total: 1 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await getEmailsByContactHandler(
      { contact_id: "123e4567-e89b-12d3-a456-426614174002", limit: 50 },
      mockContext
    );

    expect(result.contactId).toBe("123e4567-e89b-12d3-a456-426614174002");
    expect(result.emails).toEqual(mockEmails);
    expect(result.count).toBe(1);
    expect(mockRepo.listInteractions).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        types: ["email"],
        contactId: "123e4567-e89b-12d3-a456-426614174002",
        pageSize: 50,
        sort: "occurredAt",
        order: "desc",
      })
    );
  });

  it("should respect limit parameter", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    await getEmailsByContactHandler(
      { contact_id: "123e4567-e89b-12d3-a456-426614174002", limit: 10 },
      mockContext
    );

    expect(mockRepo.listInteractions).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        pageSize: 10,
      })
    );
  });
});

describe("group_emails_by_sender", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should group emails by sender", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmail1 = { ...mockEmail, sourceMeta: { from: "sarah@example.com" } };
    const mockEmail2 = {
      ...mockEmail,
      id: "123e4567-e89b-12d3-a456-426614174003",
      sourceMeta: { from: "sarah@example.com" },
    };
    const mockEmail3 = {
      ...mockEmail,
      id: "123e4567-e89b-12d3-a456-426614174004",
      sourceMeta: { from: "john@example.com" },
    };

    const mockRepo = {
      listInteractions: vi
        .fn()
        .mockResolvedValue({ items: [mockEmail1, mockEmail2, mockEmail3], total: 3 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await groupEmailsBySenderHandler({}, mockContext);

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]?.sender).toBe("sarah@example.com");
    expect(result.groups[0]?.emailCount).toBe(2);
    expect(result.groups[1]?.sender).toBe("john@example.com");
    expect(result.groups[1]?.emailCount).toBe(1);
  });

  it("should filter by minimum email count", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmail1 = { ...mockEmail, sourceMeta: { from: "sarah@example.com" } };
    const mockEmail2 = {
      ...mockEmail,
      id: "123e4567-e89b-12d3-a456-426614174003",
      sourceMeta: { from: "john@example.com" },
    };

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [mockEmail1, mockEmail2], total: 2 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await groupEmailsBySenderHandler({ min_emails: 2 }, mockContext);

    expect(result.groups).toHaveLength(0);
  });

  it("should sort groups by email count descending", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const emails = [
      { ...mockEmail, id: "1", sourceMeta: { from: "sarah@example.com" } },
      { ...mockEmail, id: "2", sourceMeta: { from: "sarah@example.com" } },
      { ...mockEmail, id: "3", sourceMeta: { from: "sarah@example.com" } },
      { ...mockEmail, id: "4", sourceMeta: { from: "john@example.com" } },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: emails, total: 4 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await groupEmailsBySenderHandler({}, mockContext);

    expect(result.groups[0]?.emailCount).toBeGreaterThan(result.groups[1]?.emailCount ?? 0);
  });
});

describe("group_emails_by_topic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should categorize emails by topic", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmails = [
      { ...mockEmail, subject: "Yoga session tomorrow", bodyText: "Looking forward to yoga" },
      {
        ...mockEmail,
        id: "123e4567-e89b-12d3-a456-426614174003",
        subject: "Invoice for January",
        bodyText: "Please find attached invoice",
      },
      {
        ...mockEmail,
        id: "123e4567-e89b-12d3-a456-426614174004",
        subject: "Question about meditation",
        bodyText: "How do I meditate?",
      },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: mockEmails, total: 3 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await groupEmailsByTopicHandler({}, mockContext);

    expect(result.groups.length).toBeGreaterThan(0);
    expect(result.totalEmails).toBe(3);
    // Yoga + meditation should categorize as wellness (yoga: 2 matches, meditation: 2 matches)
    const hasWellness = result.groups.some((g) => g.topic === "wellness");
    const hasAppointments = result.groups.some((g) => g.topic === "appointments");
    const hasQuestions = result.groups.some((g) => g.topic === "questions");
    const hasBilling = result.groups.some((g) => g.topic === "billing");

    // At least one wellness-related topic (wellness or appointments) should exist
    expect(hasWellness || hasAppointments).toBe(true);
    expect(hasBilling).toBe(true);
    expect(hasQuestions || hasWellness).toBe(true); // meditation question
  });

  it("should calculate percentages correctly", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmails = [
      { ...mockEmail, subject: "Yoga", bodyText: "yoga" },
      { ...mockEmail, id: "2", subject: "Yoga", bodyText: "yoga" },
      { ...mockEmail, id: "3", subject: "Invoice", bodyText: "invoice" },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: mockEmails, total: 3 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await groupEmailsByTopicHandler({}, mockContext);

    const wellnessGroup = result.groups.find((g) => g.topic === "wellness");
    expect(wellnessGroup?.percentage).toBe(67); // 2/3 = 66.67% rounded to 67
  });

  it("should limit number of topic groups", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockEmails = Array.from({ length: 20 }, (_, i) => ({
      ...mockEmail,
      id: `123e4567-e89b-12d3-a456-42661417${String(i).padStart(4, '0')}`,
      subject: `Topic ${i}`,
      bodyText: `Content ${i}`,
    }));

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: mockEmails, total: 20 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await groupEmailsByTopicHandler({ limit: 5 }, mockContext);

    expect(result.groups.length).toBeLessThanOrEqual(5);
  });

  it("should handle date range filtering", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    await groupEmailsByTopicHandler(
      {
        start_date: "2025-01-01T00:00:00Z",
        end_date: "2025-01-31T23:59:59Z",
        limit: 10,
      },
      mockContext
    );

    expect(mockRepo.listInteractions).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        occurredAfter: new Date("2025-01-01T00:00:00Z"),
        occurredBefore: new Date("2025-01-31T23:59:59Z"),
      })
    );
  });
});

describe("categorize_email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should categorize marketing email correctly", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const marketingEmail = {
      ...mockEmail,
      subject: "Special Promotion",
      bodyText: "Limited time offer! 50% discount subscribe now",
    };

    const mockRepo = {
      getInteractionById: vi.fn().mockResolvedValue(marketingEmail),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await categorizeEmailHandler({ email_id: "123e4567-e89b-12d3-a456-426614174001" }, mockContext);

    expect(result.category).toBe("marketing");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.emailId).toBe("123e4567-e89b-12d3-a456-426614174001");
  });

  it("should categorize wellness email correctly", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const wellnessEmail = {
      ...mockEmail,
      subject: "Yoga Class Tomorrow",
      bodyText: "Join us for meditation and mindfulness session",
    };

    const mockRepo = {
      getInteractionById: vi.fn().mockResolvedValue(wellnessEmail),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await categorizeEmailHandler({ email_id: "123e4567-e89b-12d3-a456-426614174001" }, mockContext);

    expect(result.category).toBe("wellness");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should categorize business email correctly", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const businessEmail = {
      ...mockEmail,
      subject: "Invoice Due",
      bodyText: "Your invoice for professional services requires payment",
    };

    const mockRepo = {
      getInteractionById: vi.fn().mockResolvedValue(businessEmail),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await categorizeEmailHandler({ email_id: "123e4567-e89b-12d3-a456-426614174001" }, mockContext);

    expect(result.category).toBe("business");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should categorize as other when no keywords match", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const genericEmail = {
      ...mockEmail,
      subject: "Hello",
      bodyText: "Just saying hi",
    };

    const mockRepo = {
      getInteractionById: vi.fn().mockResolvedValue(genericEmail),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await categorizeEmailHandler({ email_id: "123e4567-e89b-12d3-a456-426614174001" }, mockContext);

    expect(result.category).toBe("other");
  });
});

describe("generate_marketing_digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate summary format digest", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const marketingEmails = [
      {
        ...mockEmail,
        id: "1",
        subject: "Newsletter",
        bodyText: "promotion offer",
        sourceMeta: { from: "shop@example.com" },
      },
      {
        ...mockEmail,
        id: "2",
        subject: "Sale",
        bodyText: "discount limited time",
        sourceMeta: { from: "shop@example.com" },
      },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: marketingEmails, total: 2 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await generateMarketingDigestHandler(
      {
        date_from: "2025-01-01T00:00:00Z",
        date_to: "2025-01-07T23:59:59Z",
        format: "summary",
      },
      mockContext
    );

    expect(result.digest).toContain("Marketing Digest");
    expect(result.email_count).toBeGreaterThan(0);
    expect(result.top_senders).toBeDefined();
    expect(result.format).toBe("summary");
  });

  it("should generate detailed format digest", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await generateMarketingDigestHandler(
      {
        date_from: "2025-01-01T00:00:00Z",
        date_to: "2025-01-31T23:59:59Z",
        format: "detailed",
      },
      mockContext
    );

    expect(result.digest).toContain("Detailed Marketing Digest");
    expect(result.format).toBe("detailed");
  });
});

describe("generate_wellness_digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate wellness digest with topics", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const wellnessEmails = [
      { ...mockEmail, id: "1", subject: "Yoga", bodyText: "yoga class meditation" },
      { ...mockEmail, id: "2", subject: "Health", bodyText: "wellness therapy session" },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: wellnessEmails, total: 2 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await generateWellnessDigestHandler(
      {
        date_from: "2025-01-01T00:00:00Z",
        date_to: "2025-01-31T23:59:59Z",
        format: "summary",
      },
      mockContext
    );

    expect(result.digest).toContain("Wellness Digest");
    expect(result.wellness_topics).toBeDefined();
    expect(result.email_count).toBeGreaterThan(0);
  });
});

describe("generate_business_digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate business digest with action items", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const businessEmails = [
      {
        ...mockEmail,
        id: "1",
        subject: "Invoice",
        bodyText: "payment required deadline please review",
        sourceMeta: { from: "billing@company.com" },
      },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: businessEmails, total: 1 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await generateBusinessDigestHandler(
      {
        date_from: "2025-01-01T00:00:00Z",
        date_to: "2025-01-07T23:59:59Z",
        format: "summary",
      },
      mockContext
    );

    expect(result.digest).toContain("Business Digest");
    expect(result.action_items).toBeDefined();
    expect(result.email_count).toBeGreaterThan(0);
  });
});

describe("generate_general_digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate general digest with category breakdown", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mixedEmails = [
      { ...mockEmail, id: "1", subject: "Newsletter", bodyText: "promotion" },
      { ...mockEmail, id: "2", subject: "Yoga", bodyText: "wellness" },
      { ...mockEmail, id: "3", subject: "Invoice", bodyText: "payment" },
      { ...mockEmail, id: "4", subject: "Hello", bodyText: "just saying hi" },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: mixedEmails, total: 4 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await generateGeneralDigestHandler(
      {
        date_from: "2025-01-01T00:00:00Z",
        date_to: "2025-01-07T23:59:59Z",
        format: "summary",
      },
      mockContext
    );

    expect(result.digest).toContain("General Email Digest");
    expect(result.categories).toBeDefined();
    expect(result.categories.marketing).toBeDefined();
    expect(result.categories.wellness).toBeDefined();
    expect(result.categories.business).toBeDefined();
    expect(result.categories.general).toBeDefined();
    expect(result.email_count).toBe(4);
  });
});

describe("generate_weekly_digest_all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate comprehensive weekly digest", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const weekEmails = [
      { ...mockEmail, id: "1", subject: "Newsletter", bodyText: "promotion" },
      { ...mockEmail, id: "2", subject: "Yoga", bodyText: "wellness" },
      { ...mockEmail, id: "3", subject: "Invoice", bodyText: "payment business" },
    ];

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: weekEmails, total: 3 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await generateWeeklyDigestAllHandler(
      {
        week_start_date: "2025-01-06T00:00:00Z",
        include_categories: ["marketing", "wellness", "business", "general"],
      },
      mockContext
    );

    expect(result.digest).toContain("Weekly Email Digest");
    expect(result.total_emails).toBe(3);
    expect(result.by_category).toBeDefined();
    expect(result.highlights).toBeDefined();
    expect(result.included_categories).toHaveLength(4);
  });

  it("should filter categories in weekly digest", async () => {
    const { getDb } = await import("@/server/db/client");
    const { createInteractionsRepository } = await import("@repo");

    const mockRepo = {
      listInteractions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo as never);

    const result = await generateWeeklyDigestAllHandler(
      {
        week_start_date: "2025-01-06T00:00:00Z",
        include_categories: ["wellness", "business"],
      },
      mockContext
    );

    expect(result.included_categories).toHaveLength(2);
    expect(result.included_categories).toContain("wellness");
    expect(result.included_categories).toContain("business");
  });
});
