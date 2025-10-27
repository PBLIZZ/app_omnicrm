/**
 * AI Tools - Central Export and Registration
 *
 * This file provides centralized access to all AI tools and automatic registration.
 * Import { initializeTools } to register all tools with the global registry.
 */

import { getToolRegistry } from "./registry";
import type { ToolRegistry } from "./registry";

// Contact tools
import {
  getContactDefinition,
  getContactHandler,
  searchContactsDefinition,
  searchContactsHandler,
  listContactsDefinition,
  listContactsHandler,
  createContactDefinition,
  createContactHandler,
  updateContactDefinition,
  updateContactHandler,
} from "./implementations/contacts";

// Task tools
import {
  getTodayTasksDefinition,
  getTodayTasksHandler,
  createTaskDefinition,
  createTaskHandler,
  completeTaskDefinition,
  completeTaskHandler,
  searchTasksDefinition,
  searchTasksHandler,
  getOverdueTasksDefinition,
  getOverdueTasksHandler,
} from "./implementations/tasks";

// Calendar tools
import {
  getUpcomingSessionsDefinition,
  getUpcomingSessionsHandler,
  getEventDefinition,
  getEventHandler,
  createEventDefinition,
  createEventHandler,
  updateEventDefinition,
  updateEventHandler,
  deleteEventDefinition,
  deleteEventHandler,
  checkAvailabilityDefinition,
  checkAvailabilityHandler,
  addEventAttendeeDefinition,
  addEventAttendeeHandler,
  removeEventAttendeeDefinition,
  removeEventAttendeeHandler,
  getSessionPrepDefinition,
  getSessionPrepHandler,
  searchEventsDefinition,
  searchEventsHandler,
} from "./implementations/calendar";

// Wellness tools
import {
  logMoodDefinition,
  logMoodHandler,
  getMoodTrendsDefinition,
  getMoodTrendsHandler,
  correlateMoodHabitsDefinition,
  correlateMoodHabitsHandler,
  getWellnessScoreDefinition,
  getWellnessScoreHandler,
} from "./implementations/wellness";

// Goals & Habits tools
import {
  getGoalDefinition,
  getGoalHandler,
  listGoalsDefinition,
  listGoalsHandler,
  updateGoalProgressDefinition,
  updateGoalProgressHandler,
  analyzeGoalProgressDefinition,
  analyzeGoalProgressHandler,
  logHabitDefinition,
  logHabitHandler,
  getHabitStreakDefinition,
  getHabitStreakHandler,
  analyzeHabitPatternsDefinition,
  analyzeHabitPatternsHandler,
  getHabitAnalyticsDefinition,
  getHabitAnalyticsHandler,
} from "./implementations/goals-habits";

// Note tools
import {
  searchNotesDefinition,
  searchNotesHandler,
  getNoteDefinition,
  getNoteHandler,
  analyzeNoteSentimentDefinition,
  analyzeNoteSentimentHandler,
  tagNoteDefinition,
  tagNoteHandler,
  summarizeNotesDefinition,
  summarizeNotesHandler,
  rankNotesByRelevanceDefinition,
  rankNotesByRelevanceHandler,
} from "./implementations/notes";

// Export types
export type { ToolDefinition, ToolHandler, ToolExecutionContext, ToolExecutionResult } from "./types";
export { getToolRegistry } from "./registry";

/**
 * Initialize all tools by registering them with the global registry
 * Call this once at application startup
 */
export function initializeTools(): ToolRegistry {
  const registry = getToolRegistry();

  // Contact Management Tools
  registry.register(getContactDefinition, getContactHandler);
  registry.register(searchContactsDefinition, searchContactsHandler);
  registry.register(listContactsDefinition, listContactsHandler);
  registry.register(createContactDefinition, createContactHandler);
  registry.register(updateContactDefinition, updateContactHandler);

  // Task & Productivity Tools
  registry.register(getTodayTasksDefinition, getTodayTasksHandler);
  registry.register(createTaskDefinition, createTaskHandler);
  registry.register(completeTaskDefinition, completeTaskHandler);
  registry.register(searchTasksDefinition, searchTasksHandler);
  registry.register(getOverdueTasksDefinition, getOverdueTasksHandler);

  // Calendar & Scheduling Tools (All 10)
  registry.register(getUpcomingSessionsDefinition, getUpcomingSessionsHandler);
  registry.register(getEventDefinition, getEventHandler);
  registry.register(createEventDefinition, createEventHandler);
  registry.register(updateEventDefinition, updateEventHandler);
  registry.register(deleteEventDefinition, deleteEventHandler);
  registry.register(checkAvailabilityDefinition, checkAvailabilityHandler);
  registry.register(addEventAttendeeDefinition, addEventAttendeeHandler);
  registry.register(removeEventAttendeeDefinition, removeEventAttendeeHandler);
  registry.register(getSessionPrepDefinition, getSessionPrepHandler);
  registry.register(searchEventsDefinition, searchEventsHandler);

  // Mood & Wellness Tools
  registry.register(logMoodDefinition, logMoodHandler);
  registry.register(getMoodTrendsDefinition, getMoodTrendsHandler);
  registry.register(correlateMoodHabitsDefinition, correlateMoodHabitsHandler);
  registry.register(getWellnessScoreDefinition, getWellnessScoreHandler);

  // Goals & Habits Tools
  registry.register(getGoalDefinition, getGoalHandler);
  registry.register(listGoalsDefinition, listGoalsHandler);
  registry.register(updateGoalProgressDefinition, updateGoalProgressHandler);
  registry.register(analyzeGoalProgressDefinition, analyzeGoalProgressHandler);
  registry.register(logHabitDefinition, logHabitHandler);
  registry.register(getHabitStreakDefinition, getHabitStreakHandler);
  registry.register(analyzeHabitPatternsDefinition, analyzeHabitPatternsHandler);
  registry.register(getHabitAnalyticsDefinition, getHabitAnalyticsHandler);

  // Note Tools
  registry.register(searchNotesDefinition, searchNotesHandler);
  registry.register(getNoteDefinition, getNoteHandler);
  registry.register(analyzeNoteSentimentDefinition, analyzeNoteSentimentHandler);
  registry.register(tagNoteDefinition, tagNoteHandler);
  registry.register(summarizeNotesDefinition, summarizeNotesHandler);
  registry.register(rankNotesByRelevanceDefinition, rankNotesByRelevanceHandler);

  return registry;
}

/**
 * Get all available tool names
 */
export function getAvailableTools(): string[] {
  const registry = getToolRegistry();
  const tools = registry.listTools();
  return tools.map((t) => t.name);
}

/**
 * Check if a specific tool is registered
 */
export function isToolAvailable(toolName: string): boolean {
  const registry = getToolRegistry();
  return registry.getTool(toolName) !== null;
}
