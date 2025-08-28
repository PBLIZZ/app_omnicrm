import { google } from "googleapis";
import { getGoogleCredentials } from "./auth";

export interface TaskCalendarEvent {
  id?: string;
  taskId: string;
  title: string;
  description?: string;
  dueDate: Date;
  estimatedMinutes?: number;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "waiting" | "done" | "cancelled";
}

const TASKS_CALENDAR_NAME = "Tasks & Deadlines";
const TASKS_CALENDAR_DESCRIPTION =
  "Automatically managed calendar for task deadlines and project milestones";

export class TasksCalendarService {
  private calendar: any;
  private tasksCalendarId: string | null = null;

  constructor(private userId: string) {}

  async initialize() {
    const credentials = await getGoogleCredentials(this.userId);
    if (!credentials) {
      throw new Error("Google credentials not found");
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
    });

    this.calendar = google.calendar({ version: "v3", auth: oauth2Client });
    await this.ensureTasksCalendar();
  }

  private async ensureTasksCalendar() {
    try {
      // Check if tasks calendar already exists
      const calendarsResponse = await this.calendar.calendarList.list();
      const existingCalendar = calendarsResponse.data.items?.find(
        (cal: any) => cal.summary === TASKS_CALENDAR_NAME,
      );

      if (existingCalendar) {
        this.tasksCalendarId = existingCalendar.id;
        return;
      }

      // Create tasks calendar
      const calendarResponse = await this.calendar.calendars.insert({
        requestBody: {
          summary: TASKS_CALENDAR_NAME,
          description: TASKS_CALENDAR_DESCRIPTION,
          timeZone: "UTC",
        },
      });

      this.tasksCalendarId = calendarResponse.data.id;

      // Set calendar color to distinguish it (teal)
      await this.calendar.calendarList.patch({
        calendarId: this.tasksCalendarId,
        requestBody: {
          colorId: "7", // Teal color
          selected: true,
        },
      });

      console.log(`Created tasks calendar: ${this.tasksCalendarId}`);
    } catch (error) {
      console.error("Error ensuring tasks calendar:", error);
      throw error;
    }
  }

  async createTaskEvent(taskEvent: TaskCalendarEvent): Promise<string | null> {
    if (!this.tasksCalendarId) {
      throw new Error("Tasks calendar not initialized");
    }

    try {
      const startTime = new Date(taskEvent.dueDate);
      const endTime = new Date(startTime);

      // If estimated time is provided, use it; otherwise default to 1 hour
      const durationMinutes = taskEvent.estimatedMinutes || 60;
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      const priorityEmoji = {
        urgent: "🔥",
        high: "⚡",
        medium: "📋",
        low: "📝",
      };

      const statusEmoji = {
        todo: "⭕",
        in_progress: "🔄",
        waiting: "⏳",
        done: "✅",
        cancelled: "❌",
      };

      const event = {
        summary: `${priorityEmoji[taskEvent.priority]} ${taskEvent.title}`,
        description: [
          taskEvent.description || "",
          "",
          `Status: ${statusEmoji[taskEvent.status]} ${taskEvent.status.replace("_", " ")}`,
          `Priority: ${taskEvent.priority.toUpperCase()}`,
          `Task ID: ${taskEvent.taskId}`,
          "",
          "🤖 Automatically managed by Task Manager",
        ].join("\n"),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "UTC",
        },
        colorId: this.getColorIdForPriority(taskEvent.priority),
        extendedProperties: {
          private: {
            taskId: taskEvent.taskId,
            taskManagerEvent: "true",
            priority: taskEvent.priority,
            status: taskEvent.status,
          },
        },
        reminders: {
          useDefault: false,
          overrides: this.getRemindersForPriority(taskEvent.priority),
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.tasksCalendarId,
        requestBody: event,
      });

      return response.data.id;
    } catch (error) {
      console.error("Error creating task calendar event:", error);
      return null;
    }
  }

  async updateTaskEvent(eventId: string, taskEvent: Partial<TaskCalendarEvent>): Promise<boolean> {
    if (!this.tasksCalendarId) {
      throw new Error("Tasks calendar not initialized");
    }

    try {
      // Get existing event
      const existingEvent = await this.calendar.events.get({
        calendarId: this.tasksCalendarId,
        eventId,
      });

      const updates: any = {};

      if (taskEvent.title) {
        const priorityEmoji = {
          urgent: "🔥",
          high: "⚡",
          medium: "📋",
          low: "📝",
        };
        const priority =
          taskEvent.priority ||
          existingEvent.data.extendedProperties?.private?.priority ||
          "medium";
        updates.summary = `${priorityEmoji[priority as keyof typeof priorityEmoji]} ${taskEvent.title}`;
      }

      if (taskEvent.dueDate) {
        const startTime = new Date(taskEvent.dueDate);
        const endTime = new Date(startTime);
        const durationMinutes = taskEvent.estimatedMinutes || 60;
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);

        updates.start = {
          dateTime: startTime.toISOString(),
          timeZone: "UTC",
        };
        updates.end = {
          dateTime: endTime.toISOString(),
          timeZone: "UTC",
        };
      }

      if (taskEvent.description !== undefined || taskEvent.status || taskEvent.priority) {
        const statusEmoji = {
          todo: "⭕",
          in_progress: "🔄",
          waiting: "⏳",
          done: "✅",
          cancelled: "❌",
        };

        const status =
          taskEvent.status || existingEvent.data.extendedProperties?.private?.status || "todo";
        const priority =
          taskEvent.priority ||
          existingEvent.data.extendedProperties?.private?.priority ||
          "medium";

        updates.description = [
          taskEvent.description || existingEvent.data.description?.split("\n")[0] || "",
          "",
          `Status: ${statusEmoji[status as keyof typeof statusEmoji]} ${status.replace("_", " ")}`,
          `Priority: ${priority.toUpperCase()}`,
          `Task ID: ${taskEvent.taskId || existingEvent.data.extendedProperties?.private?.taskId}`,
          "",
          "🤖 Automatically managed by Task Manager",
        ].join("\n");
      }

      if (taskEvent.priority) {
        updates.colorId = this.getColorIdForPriority(taskEvent.priority);
        updates.reminders = {
          useDefault: false,
          overrides: this.getRemindersForPriority(taskEvent.priority),
        };
      }

      if (taskEvent.status || taskEvent.priority) {
        updates.extendedProperties = {
          private: {
            ...existingEvent.data.extendedProperties?.private,
            ...(taskEvent.status && { status: taskEvent.status }),
            ...(taskEvent.priority && { priority: taskEvent.priority }),
          },
        };
      }

      await this.calendar.events.patch({
        calendarId: this.tasksCalendarId,
        eventId,
        requestBody: updates,
      });

      return true;
    } catch (error) {
      console.error("Error updating task calendar event:", error);
      return false;
    }
  }

  async deleteTaskEvent(eventId: string): Promise<boolean> {
    if (!this.tasksCalendarId) {
      throw new Error("Tasks calendar not initialized");
    }

    try {
      await this.calendar.events.delete({
        calendarId: this.tasksCalendarId,
        eventId,
      });
      return true;
    } catch (error) {
      console.error("Error deleting task calendar event:", error);
      return false;
    }
  }

  async getTaskEvents(startDate?: Date, endDate?: Date): Promise<TaskCalendarEvent[]> {
    if (!this.tasksCalendarId) {
      throw new Error("Tasks calendar not initialized");
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: this.tasksCalendarId,
        timeMin: startDate?.toISOString(),
        timeMax: endDate?.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 1000,
      });

      return (
        response.data.items?.map((event: any) => ({
          id: event.id,
          taskId: event.extendedProperties?.private?.taskId,
          title: event.summary?.replace(/^[🔥⚡📋📝]\s/, "") || "",
          description: event.description?.split("\n")[0] || "",
          dueDate: new Date(event.start.dateTime || event.start.date),
          priority: event.extendedProperties?.private?.priority || "medium",
          status: event.extendedProperties?.private?.status || "todo",
        })) || []
      );
    } catch (error) {
      console.error("Error getting task calendar events:", error);
      return [];
    }
  }

  private getColorIdForPriority(priority: string): string {
    // Google Calendar color IDs
    const colorMap = {
      urgent: "11", // Red
      high: "6", // Orange
      medium: "9", // Blue
      low: "2", // Green
    };
    return colorMap[priority as keyof typeof colorMap] || "9";
  }

  private getRemindersForPriority(priority: string) {
    const reminderMap = {
      urgent: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
      high: [{ method: "popup", minutes: 60 }],
      medium: [{ method: "popup", minutes: 30 }],
      low: [{ method: "popup", minutes: 60 }],
    };
    return reminderMap[priority as keyof typeof reminderMap] || reminderMap.medium;
  }
}

export async function syncTaskToCalendar(
  userId: string,
  taskEvent: TaskCalendarEvent,
): Promise<string | null> {
  try {
    const service = new TasksCalendarService(userId);
    await service.initialize();
    return await service.createTaskEvent(taskEvent);
  } catch (error) {
    console.error("Error syncing task to calendar:", error);
    return null;
  }
}

export async function updateTaskInCalendar(
  userId: string,
  eventId: string,
  updates: Partial<TaskCalendarEvent>,
): Promise<boolean> {
  try {
    const service = new TasksCalendarService(userId);
    await service.initialize();
    return await service.updateTaskEvent(eventId, updates);
  } catch (error) {
    console.error("Error updating task in calendar:", error);
    return false;
  }
}

export async function removeTaskFromCalendar(userId: string, eventId: string): Promise<boolean> {
  try {
    const service = new TasksCalendarService(userId);
    await service.initialize();
    return await service.deleteTaskEvent(eventId);
  } catch (error) {
    console.error("Error removing task from calendar:", error);
    return false;
  }
}
