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
  updateLifecycleStageDefinition,
  updateLifecycleStageHandler,
  getReferralSourcesDefinition,
  getReferralSourcesHandler,
  addContactTagDefinition,
  addContactTagHandler,
  removeContactTagDefinition,
  removeContactTagHandler,
  getContactTimelineDefinition,
  getContactTimelineHandler,
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
  createProjectDefinition,
  createProjectHandler,
  listProjectsDefinition,
  listProjectsHandler,
  assignTaskToProjectDefinition,
  assignTaskToProjectHandler,
  getProjectTasksDefinition,
  getProjectTasksHandler,
  listZonesDefinition,
  listZonesHandler,
  updateTaskDefinition,
  updateTaskHandler,
  assignTaskToZoneDefinition,
  assignTaskToZoneHandler,
  createSubtaskDefinition,
  createSubtaskHandler,
  updateTaskStatusDefinition,
  updateTaskStatusHandler,
  getProjectDefinition,
  getProjectHandler,
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

// Compliance & Consent tools
import {
  getConsentStatusDefinition,
  getConsentStatusHandler,
  listMissingConsentsDefinition,
  listMissingConsentsHandler,
  getConsentHistoryDefinition,
  getConsentHistoryHandler,
  generateConsentReminderDefinition,
  generateConsentReminderHandler,
  checkHipaaComplianceDefinition,
  checkHipaaComplianceHandler,
} from "./implementations/compliance";

// Research & Knowledge tools
import {
  searchWellnessKnowledgeDefinition,
  searchWellnessKnowledgeHandler,
  getProtocolSuggestionsDefinition,
  getProtocolSuggestionsHandler,
  searchMedicalResearchDefinition,
  searchMedicalResearchHandler,
  getContraindicationsDefinition,
  getContraindicationsHandler,
  findEvidenceBasedResourcesDefinition,
  findEvidenceBasedResourcesHandler,
} from "./implementations/research";

// Gmail tools
import {
  getEmailDefinition,
  getEmailHandler,
  searchEmailsDefinition,
  searchEmailsHandler,
  listEmailThreadsDefinition,
  listEmailThreadsHandler,
  getEmailsByContactDefinition,
  getEmailsByContactHandler,
  groupEmailsBySenderDefinition,
  groupEmailsBySenderHandler,
  groupEmailsByTopicDefinition,
  groupEmailsByTopicHandler,
  categorizeEmailDefinition,
  categorizeEmailHandler,
  generateMarketingDigestDefinition,
  generateMarketingDigestHandler,
  generateWellnessDigestDefinition,
  generateWellnessDigestHandler,
  generateBusinessDigestDefinition,
  generateBusinessDigestHandler,
  generateGeneralDigestDefinition,
  generateGeneralDigestHandler,
  generateWeeklyDigestAllDefinition,
  generateWeeklyDigestAllHandler,
} from "./implementations/gmail";

// Communication tools
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
} from "./implementations/communication";

// Semantic Search & Chat tools
import {
  searchConversationHistoryDefinition,
  searchConversationHistoryHandler,
  getThreadSummaryDefinition,
  getThreadSummaryHandler,
  semanticSearchAllDefinition,
  semanticSearchAllHandler,
  findSimilarContactsDefinition,
  findSimilarContactsHandler,
  findRelatedContentDefinition,
  findRelatedContentHandler,
  generateEmbeddingsDefinition,
  generateEmbeddingsHandler,
  updateEmbeddingsDefinition,
  updateEmbeddingsHandler,
  searchByEmbeddingDefinition,
  searchByEmbeddingHandler,
} from "./implementations/semantic-search";

// Export types
export type { ToolDefinition, ToolHandler, ToolExecutionContext, ToolExecutionResult } from "./types";
export { getToolRegistry } from "./registry";

/**
 * Initialize all tools by registering them with the global registry
 * Call this once at application startup
 */
export function initializeTools(): ToolRegistry {
  const registry = getToolRegistry();

  // Contact Management Tools (All 10)
  registry.register(getContactDefinition, getContactHandler);
  registry.register(searchContactsDefinition, searchContactsHandler);
  registry.register(listContactsDefinition, listContactsHandler);
  registry.register(createContactDefinition, createContactHandler);
  registry.register(updateContactDefinition, updateContactHandler);
  registry.register(updateLifecycleStageDefinition, updateLifecycleStageHandler);
  registry.register(getReferralSourcesDefinition, getReferralSourcesHandler);
  registry.register(addContactTagDefinition, addContactTagHandler);
  registry.register(removeContactTagDefinition, removeContactTagHandler);
  registry.register(getContactTimelineDefinition, getContactTimelineHandler);

  // Task & Productivity Tools (All 15 tools)
  registry.register(getTodayTasksDefinition, getTodayTasksHandler);
  registry.register(createTaskDefinition, createTaskHandler);
  registry.register(completeTaskDefinition, completeTaskHandler);
  registry.register(searchTasksDefinition, searchTasksHandler);
  registry.register(getOverdueTasksDefinition, getOverdueTasksHandler);
  registry.register(createProjectDefinition, createProjectHandler);
  registry.register(listProjectsDefinition, listProjectsHandler);
  registry.register(assignTaskToProjectDefinition, assignTaskToProjectHandler);
  registry.register(getProjectTasksDefinition, getProjectTasksHandler);
  registry.register(listZonesDefinition, listZonesHandler);
  registry.register(updateTaskDefinition, updateTaskHandler);
  registry.register(assignTaskToZoneDefinition, assignTaskToZoneHandler);
  registry.register(createSubtaskDefinition, createSubtaskHandler);
  registry.register(updateTaskStatusDefinition, updateTaskStatusHandler);
  registry.register(getProjectDefinition, getProjectHandler);

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

  // Compliance & Consent Tools
  registry.register(getConsentStatusDefinition, getConsentStatusHandler);
  registry.register(listMissingConsentsDefinition, listMissingConsentsHandler);
  registry.register(getConsentHistoryDefinition, getConsentHistoryHandler);
  registry.register(generateConsentReminderDefinition, generateConsentReminderHandler);
  registry.register(checkHipaaComplianceDefinition, checkHipaaComplianceHandler);

  // Research & Knowledge Tools (All cost credits - external APIs)
  registry.register(searchWellnessKnowledgeDefinition, searchWellnessKnowledgeHandler);
  registry.register(getProtocolSuggestionsDefinition, getProtocolSuggestionsHandler);
  registry.register(searchMedicalResearchDefinition, searchMedicalResearchHandler);
  registry.register(getContraindicationsDefinition, getContraindicationsHandler);
  registry.register(findEvidenceBasedResourcesDefinition, findEvidenceBasedResourcesHandler);

  // Gmail Integration Tools (All 12)
  registry.register(getEmailDefinition, getEmailHandler);
  registry.register(searchEmailsDefinition, searchEmailsHandler);
  registry.register(listEmailThreadsDefinition, listEmailThreadsHandler);
  registry.register(getEmailsByContactDefinition, getEmailsByContactHandler);
  registry.register(groupEmailsBySenderDefinition, groupEmailsBySenderHandler);
  registry.register(groupEmailsByTopicDefinition, groupEmailsByTopicHandler);
  registry.register(categorizeEmailDefinition, categorizeEmailHandler);
  registry.register(generateMarketingDigestDefinition, generateMarketingDigestHandler);
  registry.register(generateWellnessDigestDefinition, generateWellnessDigestHandler);
  registry.register(generateBusinessDigestDefinition, generateBusinessDigestHandler);
  registry.register(generateGeneralDigestDefinition, generateGeneralDigestHandler);
  registry.register(generateWeeklyDigestAllDefinition, generateWeeklyDigestAllHandler);

  // Communication Tools (Email, SMS, Notifications, Reminders)
  registry.register(sendEmailDefinition, sendEmailHandler);
  registry.register(sendNotificationDefinition, sendNotificationHandler);
  registry.register(sendSmsDefinition, sendSmsHandler);
  registry.register(scheduleReminderDefinition, scheduleReminderHandler);
  registry.register(sendSessionReminderDefinition, sendSessionReminderHandler);
  registry.register(createEmailTemplateDefinition, createEmailTemplateHandler);

  // Semantic Search & Chat Tools (All 8)
  registry.register(searchConversationHistoryDefinition, searchConversationHistoryHandler);
  registry.register(getThreadSummaryDefinition, getThreadSummaryHandler);
  registry.register(semanticSearchAllDefinition, semanticSearchAllHandler);
  registry.register(findSimilarContactsDefinition, findSimilarContactsHandler);
  registry.register(findRelatedContentDefinition, findRelatedContentHandler);
  registry.register(generateEmbeddingsDefinition, generateEmbeddingsHandler);
  registry.register(updateEmbeddingsDefinition, updateEmbeddingsHandler);
  registry.register(searchByEmbeddingDefinition, searchByEmbeddingHandler);

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
