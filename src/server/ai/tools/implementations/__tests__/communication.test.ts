/**
 * Communication Tools Tests
 *
 * Comprehensive test suite for all communication domain tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendEmailDefinition,
  sendEmailHandler,
  sendNotificationDefinition,
  sendNotificationHandler,
  sendSmsDefinition,
  sendSmsHandler,
  scheduleReminderDefinition,
  scheduleReminderHandler,
  sendSessionReminderDefinition,
  sendSessionReminderHandler,
  createEmailTemplateDefinition,
  createEmailTemplateHandler,
} from "../communication";
import type { ToolExecutionContext } from "../../types";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("@repo", () => ({
  createContactsRepository: vi.fn(),
  createCalendarRepository: vi.fn(),
}));

// Test context
const mockContext: ToolExecutionContext = {
  userId: "user-123",
  threadId: "thread-456",
  messageId: "msg-789",
  timestamp: new Date("2025-10-28T10:00:00Z"),
  requestId: "req-abc",
};

// Mock contact data
const mockContact = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  userId: "user-123",
  displayName: "Sarah Johnson",
  primaryEmail: "sarah@example.com",
  primaryPhone: "+1234567890",
  photoUrl: null,
  source: "manual",
  lifecycleStage: "core_client",
  clientStatus: "active",
  referralSource: null,
  confidenceScore: null,
  dateOfBirth: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  address: null,
  healthContext: null,
  preferences: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

// Mock event data
const mockEvent = {
  id: "223e4567-e89b-12d3-a456-426614174000",
  userId: "user-123",
  contactId: "123e4567-e89b-12d3-a456-426614174000",
  type: "calendar_event",
  subject: "Yoga Session",
  bodyText: null,
  occurredAt: new Date("2025-10-30T14:00:00Z"),
  source: "manual",
  sourceId: "evt-123",
  sourceMeta: {
    location: "Studio A",
    eventType: "yoga",
  },
  batchId: null,
  createdAt: new Date("2025-10-28"),
};

describe("Communication Tools - Tool Definitions", () => {
  describe("send_email", () => {
    it("should have correct metadata", () => {
      expect(sendEmailDefinition.name).toBe("send_email");
      expect(sendEmailDefinition.category).toBe("communication");
      expect(sendEmailDefinition.permissionLevel).toBe("write");
      expect(sendEmailDefinition.creditCost).toBe(5);
      expect(sendEmailDefinition.isIdempotent).toBe(false);
      expect(sendEmailDefinition.rateLimit).toEqual({
        maxCalls: 20,
        windowMs: 3600000,
      });
    });

    it("should have required parameters", () => {
      expect(sendEmailDefinition.parameters.required).toEqual(["contact_id", "subject", "body"]);
    });
  });

  describe("send_notification", () => {
    it("should have correct metadata", () => {
      expect(sendNotificationDefinition.name).toBe("send_notification");
      expect(sendNotificationDefinition.category).toBe("communication");
      expect(sendNotificationDefinition.permissionLevel).toBe("write");
      expect(sendNotificationDefinition.creditCost).toBe(0); // Free for internal notifications
      expect(sendNotificationDefinition.isIdempotent).toBe(false);
    });
  });

  describe("send_sms", () => {
    it("should have correct metadata", () => {
      expect(sendSmsDefinition.name).toBe("send_sms");
      expect(sendSmsDefinition.category).toBe("communication");
      expect(sendSmsDefinition.permissionLevel).toBe("write");
      expect(sendSmsDefinition.creditCost).toBe(5); // SMS costs
      expect(sendSmsDefinition.isIdempotent).toBe(false);
      expect(sendSmsDefinition.rateLimit).toEqual({
        maxCalls: 30,
        windowMs: 3600000,
      });
    });
  });

  describe("schedule_reminder", () => {
    it("should have correct metadata", () => {
      expect(scheduleReminderDefinition.name).toBe("schedule_reminder");
      expect(scheduleReminderDefinition.category).toBe("communication");
      expect(scheduleReminderDefinition.permissionLevel).toBe("write");
      expect(scheduleReminderDefinition.creditCost).toBe(0); // Scheduling is free
      expect(scheduleReminderDefinition.isIdempotent).toBe(false);
    });
  });

  describe("send_session_reminder", () => {
    it("should have correct metadata", () => {
      expect(sendSessionReminderDefinition.name).toBe("send_session_reminder");
      expect(sendSessionReminderDefinition.category).toBe("communication");
      expect(sendSessionReminderDefinition.permissionLevel).toBe("write");
      expect(sendSessionReminderDefinition.creditCost).toBe(0);
      expect(sendSessionReminderDefinition.isIdempotent).toBe(false);
    });
  });

  describe("create_email_template", () => {
    it("should have correct metadata", () => {
      expect(createEmailTemplateDefinition.name).toBe("create_email_template");
      expect(createEmailTemplateDefinition.category).toBe("communication");
      expect(createEmailTemplateDefinition.permissionLevel).toBe("write");
      expect(createEmailTemplateDefinition.creditCost).toBe(5); // LLM generation costs
      expect(createEmailTemplateDefinition.isIdempotent).toBe(true);
    });
  });
});

describe("Communication Tools - Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendEmailHandler", () => {
    it("should send email to contact with valid email", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        subject: "Session Confirmation",
        body: "Your yoga session is confirmed for tomorrow at 2pm.",
      };

      const result = await sendEmailHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.recipientEmail).toBe("sarah@example.com");
      expect(result.recipientName).toBe("Sarah Johnson");
      expect(result.subject).toBe("Session Confirmation");
      expect(mockRepo.getContact).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000", "user-123");
    });

    it("should throw error if contact not found", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const params = {
        contact_id: "323e4567-e89b-12d3-a456-426614174000",
        subject: "Test",
        body: "Test body",
      };

      await expect(sendEmailHandler(params, mockContext)).rejects.toThrow(AppError);
      await expect(sendEmailHandler(params, mockContext)).rejects.toThrow("not found");
    });

    it("should throw error if contact has no email", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue({ ...mockContact, primaryEmail: null }),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        subject: "Test",
        body: "Test body",
      };

      await expect(sendEmailHandler(params, mockContext)).rejects.toThrow(AppError);
      await expect(sendEmailHandler(params, mockContext)).rejects.toThrow("does not have an email");
    });

    it("should handle CC and BCC recipients", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        subject: "Test",
        body: "Test body",
        cc: ["cc@example.com"],
        bcc: ["bcc@example.com"],
      };

      const result = await sendEmailHandler(params, mockContext);
      expect(result.success).toBe(true);
    });
  });

  describe("sendNotificationHandler", () => {
    it("should create notification with all fields", async () => {
      const params = {
        title: "Task Complete",
        message: "Your follow-up task has been completed successfully.",
        type: "success" as const,
        action_url: "https://app.example.com/tasks/123",
        action_label: "View Task",
      };

      const result = await sendNotificationHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.title).toBe("Task Complete");
      expect(result.type).toBe("success");
      expect(result.recipientId).toBe("user-123");
    });

    it("should send notification to specific contact", async () => {
      const params = {
        contact_id: "223e4567-e89b-12d3-a456-426614174001",
        title: "Session Reminder",
        message: "Your session is tomorrow at 2pm.",
        type: "info" as const,
      };

      const result = await sendNotificationHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.recipientId).toBe("223e4567-e89b-12d3-a456-426614174001");
    });

    it("should default to current user if no contact_id", async () => {
      const params = {
        title: "Welcome",
        message: "Welcome to the app!",
      };

      const result = await sendNotificationHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.recipientId).toBe("user-123");
    });
  });

  describe("sendSmsHandler", () => {
    it("should send SMS to contact with valid phone", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        message: "Your yoga session is tomorrow at 2pm. See you then!",
      };

      const result = await sendSmsHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.recipientPhone).toBe("+1234567890");
      expect(result.recipientName).toBe("Sarah Johnson");
      expect(result.status).toBe("sent");
      expect(result.scheduled).toBe(false);
    });

    it("should throw error if contact has no phone", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue({ ...mockContact, primaryPhone: null }),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        message: "Test message",
      };

      await expect(sendSmsHandler(params, mockContext)).rejects.toThrow(AppError);
      await expect(sendSmsHandler(params, mockContext)).rejects.toThrow("does not have a phone");
    });

    it("should throw error if message exceeds 160 characters", async () => {
      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        message: "x".repeat(161), // 161 characters
      };

      // Zod validation should fail before reaching handler logic
      await expect(sendSmsHandler(params, mockContext)).rejects.toThrow();
      await expect(sendSmsHandler(params, mockContext)).rejects.toThrow("Too big");
    });

    it("should schedule SMS for future delivery", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        message: "Reminder: Session in 1 hour",
        schedule_time: futureTime.toISOString(),
      };

      const result = await sendSmsHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.scheduled).toBe(true);
      expect(result.status).toBe("scheduled");
      expect(result.scheduledFor).toBe(futureTime.toISOString());
    });

    it("should reject schedule time in the past", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createContactsRepository } = await import("@repo");

      const mockRepo = {
        getContact: vi.fn().mockResolvedValue(mockContact),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createContactsRepository).mockReturnValue(mockRepo as never);

      const pastTime = new Date(Date.now() - 1000); // 1 second ago

      const params = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        message: "Test",
        schedule_time: pastTime.toISOString(),
      };

      await expect(sendSmsHandler(params, mockContext)).rejects.toThrow(AppError);
      await expect(sendSmsHandler(params, mockContext)).rejects.toThrow("must be in the future");
    });
  });

  describe("scheduleReminderHandler", () => {
    it("should schedule reminder for future time", async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const params = {
        reminder_time: futureTime.toISOString(),
        message: "Follow up with Sarah about wellness goals",
        type: "notification" as const,
      };

      const result = await scheduleReminderHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.status).toBe("scheduled");
      expect(result.scheduledFor).toBe(futureTime.toISOString());
      expect(result.type).toBe("notification");
    });

    it("should throw error for past reminder time", async () => {
      const pastTime = new Date(Date.now() - 1000);

      const params = {
        reminder_time: pastTime.toISOString(),
        message: "Test reminder",
      };

      await expect(scheduleReminderHandler(params, mockContext)).rejects.toThrow(AppError);
      await expect(scheduleReminderHandler(params, mockContext)).rejects.toThrow(
        "must be in the future",
      );
    });

    it("should support different reminder types", async () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const emailParams = {
        contact_id: "123e4567-e89b-12d3-a456-426614174000",
        reminder_time: futureTime.toISOString(),
        message: "Email reminder",
        type: "email" as const,
      };

      const result = await scheduleReminderHandler(emailParams, mockContext);
      expect(result.type).toBe("email");
    });

    it("should support event-linked reminders", async () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000);

      const params = {
        event_id: "123e4567-e89b-12d3-a456-426614174000",
        reminder_time: futureTime.toISOString(),
        message: "Prepare for session",
        type: "notification" as const,
      };

      const result = await scheduleReminderHandler(params, mockContext);
      expect(result.success).toBe(true);
    });
  });

  describe("sendSessionReminderHandler", () => {
    it("should send session reminder with event details", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createCalendarRepository } = await import("@repo");

      const mockRepo = {
        getEventById: vi.fn().mockResolvedValue(mockEvent),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const params = {
        event_id: "123e4567-e89b-12d3-a456-426614174000",
        hours_before: 24,
      };

      const result = await sendSessionReminderHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.eventTitle).toBe("Yoga Session");
      expect(result.hoursBeforeEvent).toBe(24);
      expect(mockRepo.getEventById).toHaveBeenCalledWith("user-123", "123e4567-e89b-12d3-a456-426614174000");
    });

    it("should throw error if event not found", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createCalendarRepository } = await import("@repo");

      const mockRepo = {
        getEventById: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const params = {
        event_id: "123e4567-e89b-12d3-a456-426614174000",
        hours_before: 24,
      };

      await expect(sendSessionReminderHandler(params, mockContext)).rejects.toThrow(AppError);
      await expect(sendSessionReminderHandler(params, mockContext)).rejects.toThrow("not found");
    });

    it("should reject if event is too soon", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createCalendarRepository } = await import("@repo");

      // Event in 1 hour
      const soonEvent = {
        ...mockEvent,
        occurredAt: new Date(Date.now() + 60 * 60 * 1000),
      };

      const mockRepo = {
        getEventById: vi.fn().mockResolvedValue(soonEvent),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const params = {
        event_id: "123e4567-e89b-12d3-a456-426614174000",
        hours_before: 24, // Want to remind 24 hours before, but event is in 1 hour
      };

      await expect(sendSessionReminderHandler(params, mockContext)).rejects.toThrow(AppError);
      await expect(sendSessionReminderHandler(params, mockContext)).rejects.toThrow(
        "reminder time would be in the past",
      );
    });

    it("should include prep notes when requested", async () => {
      const { getDb } = await import("@/server/db/client");
      const { createCalendarRepository } = await import("@repo");

      const mockRepo = {
        getEventById: vi.fn().mockResolvedValue(mockEvent),
      };

      vi.mocked(getDb).mockResolvedValue({} as never);
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const params = {
        event_id: "123e4567-e89b-12d3-a456-426614174000",
        hours_before: 2,
        include_prep_notes: true,
      };

      const result = await sendSessionReminderHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.hoursBeforeEvent).toBe(2);
    });
  });

  describe("createEmailTemplateHandler", () => {
    it("should generate email template with AI", async () => {
      const params = {
        name: "Session Confirmation",
        purpose: "Confirm upcoming yoga session with client",
        tone: "empathetic" as const,
        key_points: ["session time", "location", "what to bring", "cancellation policy"],
      };

      const result = await createEmailTemplateHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.name).toBe("Session Confirmation");
      expect(result.tone).toBe("empathetic");
      expect(result.subject).toContain("Session Confirmation");
      expect(result.variables).toEqual(expect.arrayContaining(["contact_name", "user_name"]));
    });

    it("should handle different tones", async () => {
      const params = {
        name: "Welcome Email",
        purpose: "Welcome new clients to the practice",
        tone: "professional" as const,
        key_points: ["introduction", "next steps"],
      };

      const result = await createEmailTemplateHandler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.tone).toBe("professional");
    });

    it("should include target audience in template", async () => {
      const params = {
        name: "Workshop Invitation",
        purpose: "Invite clients to wellness workshop",
        target_audience: "regular attendees",
        tone: "motivational" as const,
        key_points: ["workshop topic", "date and time", "benefits"],
      };

      const result = await createEmailTemplateHandler(params, mockContext);

      expect(result.success).toBe(true);
    });

    it("should handle minimum key points", async () => {
      const params = {
        name: "Quick Reminder",
        purpose: "Send quick reminder",
        tone: "casual" as const,
        key_points: ["reminder message"],
      };

      const result = await createEmailTemplateHandler(params, mockContext);

      expect(result.success).toBe(true);
    });
  });
});

describe("Communication Tools - Parameter Validation", () => {
  it("should validate email parameters", () => {
    const validParams = {
      contact_id: "123e4567-e89b-12d3-a456-426614174000",
      subject: "Test Subject",
      body: "Test body content",
    };

    expect(sendEmailDefinition.parameters.required).toContain("contact_id");
    expect(sendEmailDefinition.parameters.required).toContain("subject");
    expect(sendEmailDefinition.parameters.required).toContain("body");
  });

  it("should validate notification type enum", () => {
    const typeProperty = sendNotificationDefinition.parameters.properties.type;
    expect(typeProperty).toBeDefined();
  });

  it("should validate SMS message length constraints", () => {
    const messageProperty = sendSmsDefinition.parameters.properties.message;
    expect(messageProperty).toBeDefined();
  });

  it("should validate reminder type enum", () => {
    const typeProperty = scheduleReminderDefinition.parameters.properties.type;
    expect(typeProperty).toBeDefined();
  });

  it("should validate session reminder hours_before max", () => {
    const hoursProperty = sendSessionReminderDefinition.parameters.properties.hours_before;
    expect(hoursProperty).toBeDefined();
  });

  it("should validate template tone enum", () => {
    const toneProperty = createEmailTemplateDefinition.parameters.properties.tone;
    expect(toneProperty).toBeDefined();
  });
});
