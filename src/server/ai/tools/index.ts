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
