/**
 * Communication Tools
 *
 * AI-callable tools for communication management in the wellness CRM.
 * Implements email, SMS, notifications, and reminder functionality.
 *
 * Note: Email and SMS services are stubbed for now - integrate with actual providers as needed.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createCalendarRepository, createContactsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TOOL 1: send_email
// ============================================================================

const SendEmailParamsSchema = z.object({
  contact_id: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  template_id: z.string().uuid().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
});

type SendEmailParams = z.infer<typeof SendEmailParamsSchema>;

export const sendEmailDefinition: ToolDefinition = {
  name: "send_email",
  category: "communication",
  version: "1.0.0",
  description:
    "Send an email to a contact. Can use a template or custom content. AI should draft professional, empathetic messages appropriate for wellness/healthcare context. Cost applies when AI generates email content.",
  useCases: [
    "When user asks 'email Sarah about her appointment'",
    "When sending appointment confirmations or updates",
    "When user wants to 'send a follow-up email to John'",
    "When communicating session reminders or wellness tips",
  ],
  exampleCalls: [
    'send_email({"contact_id": "uuid", "subject": "Session Confirmation", "body": "Hi Sarah, confirming your yoga session tomorrow at 2pm..."})',
    'send_email({"contact_id": "uuid", "subject": "Wellness Check-in", "body": "Hope you\'re doing well...", "template_id": "uuid"})',
    'When user says: "Email John to confirm his massage appointment" → AI drafts and calls send_email',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to email (required)",
      },
      subject: {
        type: "string",
        description: "Email subject line (1-200 characters)",
      },
      body: {
        type: "string",
        description: "Email body content (plain text or HTML)",
      },
      template_id: {
        type: "string",
        description: "Optional: UUID of email template to use",
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "Optional: CC email addresses",
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "Optional: BCC email addresses",
      },
    },
    required: ["contact_id", "subject", "body"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 5, // Costs credits when AI generates content
  isIdempotent: false, // Don't send same email twice
  cacheable: false,
  rateLimit: {
    maxCalls: 20,
    windowMs: 3600000, // 20 emails per hour
  },
  tags: ["communication", "email", "write"],
  deprecated: false,
};

export const sendEmailHandler: ToolHandler<SendEmailParams> = async (params, context) => {
  const validated = SendEmailParamsSchema.parse(params);
  const db = await getDb();
  const contactsRepo = createContactsRepository(db);

  try {
    // Verify contact exists and get email
    const contact = await contactsRepo.getContact(validated.contact_id, context.userId);
    if (!contact) {
      throw new AppError(
        `Contact with ID ${validated.contact_id} not found`,
        "CONTACT_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    const email = contact.primaryEmail;
    const displayName = contact.displayName;

    if (!email) {
      throw new AppError(
        `Contact ${displayName} does not have an email address`,
        "NO_EMAIL_ADDRESS",
        "validation",
        true,
        400,
      );
    }

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, we'll stub the email sending
    const emailData = {
      to: email,
      toName: displayName,
      subject: validated.subject,
      body: validated.body,
      cc: validated.cc,
      bcc: validated.bcc,
      templateId: validated.template_id,
      sentAt: new Date().toISOString(),
    };

    // Stub: Log that we would send email
    console.log("[STUB] Would send email:", emailData);

    // In production, create interaction record for sent email
    // const interaction = await createInteraction(...)

    return {
      success: true,
      emailId: `stub-${Date.now()}`, // Would be actual email provider ID
      recipientEmail: email,
      recipientName: displayName,
      subject: validated.subject,
      sentAt: emailData.sentAt,
      message: "Email queued for delivery (stubbed)",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to send email",
      "SEND_EMAIL_FAILED",
      "external",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 2: send_notification
// ============================================================================

const SendNotificationParamsSchema = z.object({
  contact_id: z.string().uuid().optional(),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  action_url: z.string().url().optional(),
  action_label: z.string().max(50).optional(),
});

type SendNotificationParams = z.infer<typeof SendNotificationParamsSchema>;

export const sendNotificationDefinition: ToolDefinition = {
  name: "send_notification",
  category: "communication",
  version: "1.0.0",
  description:
    "Send an in-app notification to a contact or the current user. Creates a notification visible in the application. Does not cost credits as it's an internal notification.",
  useCases: [
    "When user completes an action: 'notify me when my task is complete'",
    "When sending reminders: 'remind Sarah about her upcoming session'",
    "When alerting about updates: 'notify clients about schedule changes'",
    "When providing feedback: 'send success notification after booking'",
  ],
  exampleCalls: [
    'send_notification({"contact_id": "uuid", "title": "Session Reminder", "message": "Your yoga session is tomorrow at 2pm", "type": "info"})',
    'send_notification({"title": "Task Complete", "message": "All follow-ups completed", "type": "success"})',
    'When user says: "Notify me when this is done" → send_notification',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "Optional: UUID of contact to notify. If omitted, notifies current user",
      },
      title: {
        type: "string",
        description: "Notification title (1-100 characters)",
      },
      message: {
        type: "string",
        description: "Notification message body (1-500 characters)",
      },
      type: {
        type: "string",
        description: "Notification type: 'info', 'success', 'warning', or 'error'",
      },
      action_url: {
        type: "string",
        description: "Optional: URL to navigate to when notification clicked",
      },
      action_label: {
        type: "string",
        description: "Optional: Label for action button (max 50 chars)",
      },
    },
    required: ["title", "message"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0, // Internal notification - no cost
  isIdempotent: false,
  cacheable: false,
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 notifications per minute
  },
  tags: ["communication", "notification", "write"],
  deprecated: false,
};

export const sendNotificationHandler: ToolHandler<SendNotificationParams> = async (
  params,
  context,
) => {
  const validated = SendNotificationParamsSchema.parse(params);

  try {
    // Determine recipient
    const recipientUserId = validated.contact_id || context.userId;

    // TODO: Integrate with actual notification service
    // For now, we'll stub the notification
    const notification = {
      id: `notif-${Date.now()}`,
      recipientUserId,
      title: validated.title,
      message: validated.message,
      type: validated.type,
      actionUrl: validated.action_url,
      actionLabel: validated.action_label,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Stub: Log that we would create notification
    console.log("[STUB] Would create notification:", notification);

    // In production, save to notifications table and push via websocket/SSE

    return {
      success: true,
      notificationId: notification.id,
      recipientId: recipientUserId,
      title: validated.title,
      type: validated.type,
      createdAt: notification.createdAt,
      message: "Notification created (stubbed)",
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to send notification",
      "SEND_NOTIFICATION_FAILED",
      "internal",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 3: send_sms
// ============================================================================

const SendSmsParamsSchema = z.object({
  contact_id: z.string().uuid(),
  message: z.string().min(1).max(160), // Standard SMS length
  schedule_time: z.string().datetime().optional(),
});

type SendSmsParams = z.infer<typeof SendSmsParamsSchema>;

export const sendSmsDefinition: ToolDefinition = {
  name: "send_sms",
  category: "communication",
  version: "1.0.0",
  description:
    "Send an SMS text message to a contact's phone number. Messages limited to 160 characters. Costs credits as SMS APIs charge per message. Can schedule for later delivery.",
  useCases: [
    "When user asks 'text Sarah about her appointment change'",
    "When sending urgent reminders: 'SMS John that his session starts in 30 minutes'",
    "When confirming bookings: 'send confirmation text to new client'",
    "When following up: 'text clients who missed their session'",
  ],
  exampleCalls: [
    'send_sms({"contact_id": "uuid", "message": "Hi Sarah, your yoga session tomorrow at 2pm is confirmed. See you then!"})',
    'send_sms({"contact_id": "uuid", "message": "Reminder: Session in 30 min", "schedule_time": "2025-10-29T13:30:00Z"})',
    'When user says: "Text John to confirm his appointment" → AI drafts and calls send_sms',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to text (required)",
      },
      message: {
        type: "string",
        description: "SMS message content (max 160 characters)",
      },
      schedule_time: {
        type: "string",
        description: "Optional: Schedule SMS for future delivery (ISO 8601 format)",
      },
    },
    required: ["contact_id", "message"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 5, // SMS APIs charge per message
  isIdempotent: false, // Don't send duplicate texts
  cacheable: false,
  rateLimit: {
    maxCalls: 30,
    windowMs: 3600000, // 30 SMS per hour
  },
  tags: ["communication", "sms", "write"],
  deprecated: false,
};

export const sendSmsHandler: ToolHandler<SendSmsParams> = async (params, context) => {
  const validated = SendSmsParamsSchema.parse(params);
  const db = await getDb();
  const contactsRepo = createContactsRepository(db);

  try {
    // Verify contact exists and get phone number
    const contact = await contactsRepo.getContact(validated.contact_id, context.userId);
    if (!contact) {
      throw new AppError(
        `Contact with ID ${validated.contact_id} not found`,
        "CONTACT_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    const phone = contact.primaryPhone;
    const displayName = contact.displayName;

    if (!phone) {
      throw new AppError(
        `Contact ${displayName} does not have a phone number`,
        "NO_PHONE_NUMBER",
        "validation",
        true,
        400,
      );
    }

    // Validate message length
    if (validated.message.length > 160) {
      throw new AppError(
        "SMS message exceeds 160 character limit",
        "MESSAGE_TOO_LONG",
        "validation",
        true,
        400,
      );
    }

    // Parse schedule time if provided
    let scheduleTime: Date | undefined;
    if (validated.schedule_time) {
      scheduleTime = new Date(validated.schedule_time);
      if (isNaN(scheduleTime.getTime())) {
        throw new AppError(
          "Invalid schedule_time format. Use ISO 8601 format",
          "INVALID_DATE_FORMAT",
          "validation",
          true,
          400,
        );
      }
      if (scheduleTime <= new Date()) {
        throw new AppError(
          "Schedule time must be in the future",
          "INVALID_SCHEDULE_TIME",
          "validation",
          true,
          400,
        );
      }
    }

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    const smsData = {
      to: phone,
      toName: displayName,
      message: validated.message,
      scheduledFor: scheduleTime?.toISOString(),
      sentAt: scheduleTime ? null : new Date().toISOString(),
    };

    // Stub: Log that we would send SMS
    console.log("[STUB] Would send SMS:", smsData);

    return {
      success: true,
      smsId: `stub-sms-${Date.now()}`, // Would be actual SMS provider ID
      recipientPhone: phone,
      recipientName: displayName,
      message: validated.message,
      scheduled: !!scheduleTime,
      scheduledFor: scheduleTime?.toISOString(),
      sentAt: smsData.sentAt,
      status: scheduleTime ? "scheduled" : "sent",
      messageStatus: "SMS queued for delivery (stubbed)",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to send SMS",
      "SEND_SMS_FAILED",
      "external",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 4: schedule_reminder
// ============================================================================

const ScheduleReminderParamsSchema = z.object({
  contact_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  reminder_time: z.string().datetime(),
  message: z.string().min(1).max(500),
  type: z.enum(["email", "sms", "notification"]).default("notification"),
});

type ScheduleReminderParams = z.infer<typeof ScheduleReminderParamsSchema>;

export const scheduleReminderDefinition: ToolDefinition = {
  name: "schedule_reminder",
  category: "communication",
  version: "1.0.0",
  description:
    "Schedule an automated reminder for future delivery. Can remind via email, SMS, or in-app notification. Useful for appointment reminders, follow-ups, and task deadlines. Does not cost credits to schedule.",
  useCases: [
    "When user asks 'remind me to follow up with Sarah in 2 days'",
    "When scheduling: 'send a reminder 1 hour before the session'",
    "When planning: 'remind John about his appointment tomorrow at 9am'",
    "When setting up automations: 'reminder to check in with clients weekly'",
  ],
  exampleCalls: [
    'schedule_reminder({"contact_id": "uuid", "reminder_time": "2025-10-30T13:00:00Z", "message": "Session tomorrow at 2pm", "type": "sms"})',
    'schedule_reminder({"event_id": "uuid", "reminder_time": "2025-10-30T09:00:00Z", "message": "Session prep reminder", "type": "notification"})',
    'When user says: "Remind me to call Sarah tomorrow" → schedule_reminder',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "Optional: UUID of contact to remind (if not set, reminds current user)",
      },
      event_id: {
        type: "string",
        description: "Optional: UUID of related calendar event",
      },
      reminder_time: {
        type: "string",
        description: "When to send reminder (ISO 8601 format, must be future)",
      },
      message: {
        type: "string",
        description: "Reminder message content (1-500 characters)",
      },
      type: {
        type: "string",
        description: "Delivery method: 'email', 'sms', or 'notification'",
      },
    },
    required: ["reminder_time", "message"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0, // Scheduling is free, actual delivery may cost
  isIdempotent: false,
  cacheable: false,
  rateLimit: {
    maxCalls: 100,
    windowMs: 60000, // 100 reminders per minute
  },
  tags: ["communication", "reminder", "automation", "write"],
  deprecated: false,
};

export const scheduleReminderHandler: ToolHandler<ScheduleReminderParams> = async (
  params,
  context,
) => {
  const validated = ScheduleReminderParamsSchema.parse(params);

  try {
    // Parse and validate reminder time
    const reminderTime = new Date(validated.reminder_time);
    if (isNaN(reminderTime.getTime())) {
      throw new AppError(
        "Invalid reminder_time format. Use ISO 8601 format",
        "INVALID_DATE_FORMAT",
        "validation",
        true,
        400,
      );
    }

    if (reminderTime <= new Date()) {
      throw new AppError(
        "Reminder time must be in the future",
        "INVALID_REMINDER_TIME",
        "validation",
        true,
        400,
      );
    }

    // TODO: Create job in jobs table for reminder delivery
    const reminder = {
      id: `reminder-${Date.now()}`,
      userId: context.userId,
      contactId: validated.contact_id,
      eventId: validated.event_id,
      reminderTime: reminderTime.toISOString(),
      message: validated.message,
      type: validated.type,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    // Stub: Log that we would create reminder job
    console.log("[STUB] Would create reminder job:", reminder);

    // In production, insert into jobs table with kind='reminder'
    // and scheduled execution time

    return {
      success: true,
      reminderId: reminder.id,
      scheduledFor: reminder.reminderTime,
      type: validated.type,
      message: validated.message,
      status: "scheduled",
      jobStatus: "Reminder scheduled (stubbed)",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to schedule reminder",
      "SCHEDULE_REMINDER_FAILED",
      "internal",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 5: send_session_reminder
// ============================================================================

const SendSessionReminderParamsSchema = z.object({
  event_id: z.string().uuid(),
  hours_before: z.number().int().positive().max(72).default(24),
  include_prep_notes: z.boolean().default(false),
});

type SendSessionReminderParams = z.infer<typeof SendSessionReminderParamsSchema>;

export const sendSessionReminderDefinition: ToolDefinition = {
  name: "send_session_reminder",
  category: "communication",
  version: "1.0.0",
  description:
    "Send a pre-session reminder to the contact associated with a calendar event. Automatically includes session details (time, location) and optionally preparation notes. Does not cost credits.",
  useCases: [
    "When user asks 'remind clients about tomorrow's sessions'",
    "When automating: 'send session reminders 24 hours in advance'",
    "When preparing: 'remind Sarah about her appointment with prep instructions'",
    "When reducing no-shows: 'automatic reminders for all upcoming sessions'",
  ],
  exampleCalls: [
    'send_session_reminder({"event_id": "uuid", "hours_before": 24})',
    'send_session_reminder({"event_id": "uuid", "hours_before": 2, "include_prep_notes": true})',
    'When user says: "Send reminder for tomorrow\'s yoga class" → send_session_reminder',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      event_id: {
        type: "string",
        description: "UUID of the calendar event to remind about",
      },
      hours_before: {
        type: "number",
        description: "Hours before event to send reminder (default 24, max 72)",
      },
      include_prep_notes: {
        type: "boolean",
        description: "Include preparation instructions in reminder (default false)",
      },
    },
    required: ["event_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0, // Internal reminder system - no cost
  isIdempotent: false,
  cacheable: false,
  rateLimit: {
    maxCalls: 100,
    windowMs: 60000, // 100 session reminders per minute
  },
  tags: ["communication", "calendar", "reminder", "write"],
  deprecated: false,
};

export const sendSessionReminderHandler: ToolHandler<SendSessionReminderParams> = async (
  params,
  context,
) => {
  const validated = SendSessionReminderParamsSchema.parse(params);
  const db = await getDb();
  const calendarRepo = createCalendarRepository(db);

  try {
    // Get event details
    const event = await calendarRepo.getEventById(context.userId, validated.event_id);
    if (!event) {
      throw new AppError(
        `Calendar event with ID ${validated.event_id} not found`,
        "EVENT_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    // Calculate reminder time
    const eventTime = new Date(event.occurredAt);
    const reminderTime = new Date(eventTime.getTime() - validated.hours_before * 60 * 60 * 1000);

    if (reminderTime <= new Date()) {
      throw new AppError(
        `Event is too soon - reminder time would be in the past`,
        "REMINDER_TIME_PAST",
        "validation",
        true,
        400,
      );
    }

    // Build reminder message
    const eventDate = eventTime.toLocaleDateString();
    const eventTimeStr = eventTime.toLocaleTimeString();
    let message = `Reminder: You have "${event.subject || "Session"}" scheduled for ${eventDate} at ${eventTimeStr}`;

    if (event.sourceMeta && typeof event.sourceMeta === "object" && "location" in event.sourceMeta) {
      message += `\nLocation: ${event.sourceMeta.location}`;
    }

    if (validated.include_prep_notes) {
      message += "\n\nPlease arrive 5-10 minutes early and bring comfortable clothing.";
    }

    // TODO: Schedule reminder notification/email
    const reminder = {
      id: `session-reminder-${Date.now()}`,
      eventId: validated.event_id,
      contactId: event.contactId,
      reminderTime: reminderTime.toISOString(),
      message,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    // Stub: Log that we would schedule reminder
    console.log("[STUB] Would schedule session reminder:", reminder);

    return {
      success: true,
      reminderId: reminder.id,
      eventId: validated.event_id,
      eventTitle: event.subject,
      eventTime: eventTime.toISOString(),
      reminderScheduledFor: reminderTime.toISOString(),
      hoursBeforeEvent: validated.hours_before,
      message: "Session reminder scheduled (stubbed)",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to send session reminder",
      "SEND_SESSION_REMINDER_FAILED",
      "internal",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 6: create_email_template
// ============================================================================

const CreateEmailTemplateParamsSchema = z.object({
  name: z.string().min(1).max(100),
  purpose: z.string().min(1).max(500),
  target_audience: z.string().max(200).optional(),
  tone: z.enum(["professional", "casual", "empathetic", "motivational"]).default("empathetic"),
  key_points: z.array(z.string()).min(1).max(10),
});

type CreateEmailTemplateParams = z.infer<typeof CreateEmailTemplateParamsSchema>;

export const createEmailTemplateDefinition: ToolDefinition = {
  name: "create_email_template",
  category: "communication",
  version: "1.0.0",
  description:
    "Generate a professional email template using AI based on purpose and key points. Creates reusable templates for common communication scenarios. Costs credits as it uses LLM to generate template content.",
  useCases: [
    "When user asks 'create a template for appointment confirmations'",
    "When building library: 'generate welcome email template for new clients'",
    "When standardizing: 'create template for session follow-ups'",
    "When automating: 'make a template for wellness check-ins'",
  ],
  exampleCalls: [
    'create_email_template({"name": "Session Confirmation", "purpose": "Confirm upcoming yoga session", "tone": "empathetic", "key_points": ["session time", "location", "what to bring"]})',
    'create_email_template({"name": "Welcome Email", "purpose": "Welcome new clients", "tone": "professional", "key_points": ["introduction", "what to expect", "next steps"]})',
    'When user says: "Create a template for appointment reminders" → create_email_template',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Template name for reference (1-100 characters)",
      },
      purpose: {
        type: "string",
        description: "What this template is for (1-500 characters)",
      },
      target_audience: {
        type: "string",
        description: "Optional: Who receives this (e.g., 'new clients', 'regular attendees')",
      },
      tone: {
        type: "string",
        description: "Email tone: 'professional', 'casual', 'empathetic', or 'motivational'",
      },
      key_points: {
        type: "array",
        items: { type: "string" },
        description: "Key information to include (1-10 points)",
      },
    },
    required: ["name", "purpose", "key_points"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 5, // Uses LLM to generate template
  isIdempotent: true, // Same inputs = same template
  cacheable: false,
  rateLimit: {
    maxCalls: 10,
    windowMs: 60000, // 10 template generations per minute
  },
  tags: ["communication", "email", "template", "ai-generation", "write"],
  deprecated: false,
};

export const createEmailTemplateHandler: ToolHandler<CreateEmailTemplateParams> = async (
  params,
  context,
) => {
  const validated = CreateEmailTemplateParamsSchema.parse(params);

  try {
    // TODO: Call LLM to generate template content based on inputs
    // For now, create a stub template
    const templateSubject = `${validated.name} - {{contact_name}}`;
    const templateBody = `Dear {{contact_name}},

${validated.purpose}

Key Information:
${validated.key_points.map((point, i) => `${i + 1}. ${point}`).join("\n")}

Thank you,
{{user_name}}`;

    const template = {
      id: `template-${Date.now()}`,
      userId: context.userId,
      name: validated.name,
      purpose: validated.purpose,
      targetAudience: validated.target_audience,
      tone: validated.tone,
      subject: templateSubject,
      body: templateBody,
      variables: ["contact_name", "user_name"],
      createdAt: new Date().toISOString(),
    };

    // Stub: Log that we would save template and call LLM
    console.log("[STUB] Would generate email template with LLM:", template);

    // In production:
    // 1. Call LLM with prompt to generate professional template
    // 2. Save to email_templates table
    // 3. Return template ID for reuse

    return {
      success: true,
      templateId: template.id,
      name: validated.name,
      subject: templateSubject,
      body: templateBody,
      tone: validated.tone,
      variables: template.variables,
      message: "Email template generated (stubbed - would use LLM in production)",
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create email template",
      "CREATE_TEMPLATE_FAILED",
      "ai",
      false,
      500,
    );
  }
};
