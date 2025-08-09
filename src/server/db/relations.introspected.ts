// @ts-nocheck
import { relations } from "drizzle-orm/relations";
import {
  usersInAuth,
  aiQuotas,
  aiUsage,
  documents,
  embeddings,
  aiInsights,
  contacts,
  interactions,
  rawEvents,
  jobs,
  threads,
  messages,
  toolInvocations,
} from "./schema";

export const aiQuotasRelations = relations(aiQuotas, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [aiQuotas.userId],
    references: [usersInAuth.id],
  }),
}));

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  aiQuotas: many(aiQuotas),
  aiUsages: many(aiUsage),
  documents: many(documents),
  embeddings: many(embeddings),
  aiInsights: many(aiInsights),
  interactions: many(interactions),
  rawEvents: many(rawEvents),
  jobs: many(jobs),
  contacts: many(contacts),
  threads: many(threads),
  messages: many(messages),
  toolInvocations: many(toolInvocations),
}));

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [aiUsage.userId],
    references: [usersInAuth.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [documents.userId],
    references: [usersInAuth.id],
  }),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [embeddings.userId],
    references: [usersInAuth.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [aiInsights.userId],
    references: [usersInAuth.id],
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  contact: one(contacts, {
    fields: [interactions.contactId],
    references: [contacts.id],
  }),
  usersInAuth: one(usersInAuth, {
    fields: [interactions.userId],
    references: [usersInAuth.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  interactions: many(interactions),
  usersInAuth: one(usersInAuth, {
    fields: [contacts.userId],
    references: [usersInAuth.id],
  }),
}));

export const rawEventsRelations = relations(rawEvents, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [rawEvents.userId],
    references: [usersInAuth.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [jobs.userId],
    references: [usersInAuth.id],
  }),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [threads.userId],
    references: [usersInAuth.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
  usersInAuth: one(usersInAuth, {
    fields: [messages.userId],
    references: [usersInAuth.id],
  }),
  toolInvocations: many(toolInvocations),
}));

export const toolInvocationsRelations = relations(toolInvocations, ({ one }) => ({
  message: one(messages, {
    fields: [toolInvocations.messageId],
    references: [messages.id],
  }),
  usersInAuth: one(usersInAuth, {
    fields: [toolInvocations.userId],
    references: [usersInAuth.id],
  }),
}));
