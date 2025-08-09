// @ts-nocheck
import { relations } from "drizzle-orm/relations";
import {
  embeddings,
  aiInsights,
  jobs,
  documents,
  contacts,
  interactions,
  rawEvents,
  threads,
  messages,
  toolInvocations,
} from "./schema.introspected";
// At runtime, `usersInAuth` exists in the introspected output (auth.users).
// Avoid TS import errors during typecheck by declaring a type-only placeholder.

type UsersInAuth = { id: unknown };
declare const usersInAuth: UsersInAuth;

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [embeddings.userId],
    references: [usersInAuth.id],
  }),
}));

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  embeddings: many(embeddings),
  aiInsights: many(aiInsights),
  jobs: many(jobs),
  documents: many(documents),
  contacts: many(contacts),
  interactions: many(interactions),
  rawEvents: many(rawEvents),
  threads: many(threads),
  messages: many(messages),
  toolInvocations: many(toolInvocations),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [aiInsights.userId],
    references: [usersInAuth.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [jobs.userId],
    references: [usersInAuth.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [documents.userId],
    references: [usersInAuth.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [contacts.userId],
    references: [usersInAuth.id],
  }),
  interactions: many(interactions),
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

export const rawEventsRelations = relations(rawEvents, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [rawEvents.userId],
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
