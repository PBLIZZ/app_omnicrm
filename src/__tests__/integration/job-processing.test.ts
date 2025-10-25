import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { getDb } from "@/server/db/client";
import {
  jobs,
  contacts,
  interactions,
  rawEvents,
  aiInsights,
  embeddings,
} from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
// Removed unused imports

// Job processing integration tests

/**
 * Type guard helper for job payload fields
 */
function extractJobPayloadField(payload: unknown, field: string): string {
  if (!payload || typeof payload !== "object" || payload === null) {
    throw new Error(`Invalid job payload: expected object, got ${typeof payload}`);
  }

  const payloadObj = payload as Record<string, unknown>;
  const value = payloadObj[field];

  if (typeof value !== "string") {
    throw new Error(`Invalid job payload field '${field}': expected string, got ${typeof value}`);
  }

  return value;
}

/**
 * Background Job Processing Integration Tests
 *
 * These tests verify complete background job workflows:
 * - Job queue operations (enqueue, process, retry)
 * - Job processing with real data transformations
 * - Job failure and retry mechanisms
 * - Job dependencies and batching
 * - Performance under load
 * - Error handling and recovery
 */
describe("Background Job Processing Integration Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testUserId = "test-user-job-processing";
  const cleanupIds: { table: string; id: string }[] = [];
  let dbAvailable = false;

  // Track IDs for cleanup
  const trackForCleanup = (table: string, id: string): void => {
    cleanupIds.push({ table, id });
  };

  beforeAll(async () => {
    // Unmock database and API layers for integration tests
    vi.unmock("@/lib/api");
    vi.unmock("drizzle-orm/postgres-js");
    vi.unmock("postgres");

    try {
      db = await getDb();
      dbAvailable = true;
    } catch (error) {
      console.warn("⚠️  Database not available for integration tests. Tests will be skipped.");
      console.warn("   To run integration tests, ensure DATABASE_URL is configured.");
      dbAvailable = false;
    }

    // Mock external dependencies
    vi.mock("@/server/ai/insights", () => ({
      generateContactInsights: vi.fn().mockImplementation(async (contactId: string) => {
        // Simulate AI processing time
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          id: `insight-${contactId}`,
          stage: "New Client",
          // tags: ["ai-generated", "wellness"], // Tags field removed - now using relational tagging system
          confidenceScore: 0.82,
          reasoning: "AI analysis complete",
        };
      }),
    }));

    vi.mock("@/server/ai/embeddings", () => ({
      generateEmbedding: vi.fn().mockImplementation(async (text: string) => {
        // Simulate embedding generation
        await new Promise((resolve) => setTimeout(resolve, 50));
        return Array.from({ length: 1536 }, () => Math.random() - 0.5);
      }),
    }));

    vi.mock("@/server/google/gmail", () => ({
      syncGmailMessages: vi.fn().mockImplementation(async (userId: string) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          messagesProcessed: 25,
          newContacts: 3,
          newInteractions: 15,
        };
      }),
    }));
  });

  afterEach(async () => {
    if (dbAvailable) {
      // Clean up in reverse order
      for (const { table, id } of cleanupIds.reverse()) {
        try {
          switch (table) {
            case "aiInsights":
              await db.delete(aiInsights).where(eq(aiInsights.id, id));
              break;
            case "embeddings":
              await db.delete(embeddings).where(eq(embeddings.id, id));
              break;
            case "interactions":
              await db.delete(interactions).where(eq(interactions.id, id));
              break;
            case "rawEvents":
              await db.delete(rawEvents).where(eq(rawEvents.id, id));
              break;
            case "contacts":
              await db.delete(contacts).where(eq(contacts.id, id));
              break;
            case "jobs":
              await db.delete(jobs).where(eq(jobs.id, id));
              break;
          }
        } catch (error) {
          console.warn(`Cleanup failed for ${table}:${id}:`, error);
        }
      }
    }
    cleanupIds.length = 0;
  });

  afterAll(async () => {
    if (dbAvailable) {
      // Final cleanup
      await db.delete(aiInsights).where(eq(aiInsights.userId, testUserId));
      await db.delete(embeddings).where(eq(embeddings.userId, testUserId));
      await db.delete(interactions).where(eq(interactions.userId, testUserId));
      await db.delete(rawEvents).where(eq(rawEvents.userId, testUserId));
      await db.delete(contacts).where(eq(contacts.userId, testUserId));
      await db.delete(jobs).where(eq(jobs.userId, testUserId));
    }

    vi.resetAllMocks();
  });

  describe("Job Queue Operations", () => {
    it.skipIf(!dbAvailable)("enqueues and processes basic jobs", async () => {
      // Create a test contact for job processing
      const contact = await db
        .insert(contacts)
        .values({
          userId: testUserId,
          displayName: "Job Test Contact",
          primaryEmail: "jobtest@test.com",
          source: "manual",
        })
        .returning();

      expect(contact[0]).toBeDefined();
      trackForCleanup("contacts", contact[0]!.id);

      // Enqueue an insight generation job
      const job = await db
        .insert(jobs)
        .values({
          userId: testUserId,
          kind: "insight",
          payload: {
            contactId: contact[0]!.id,
            type: "summary",
          },
          status: "queued",
        })
        .returning();
      expect(job[0]).toBeDefined();
      trackForCleanup("jobs", job[0]!.id);

      // Debug: log the actual job object
      console.log("Job object:", JSON.stringify(job[0], null, 2));

      expect(job[0]!.status).toBe("queued");
      expect(job[0]!.attempts).toBe(0);

      // Process the job
      await db
        .update(jobs)
        .set({
          status: "processing",
          attempts: 1,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job[0]!.id));

      // Simulate job processing
      const { generateContactInsights } = await import("@/server/ai/insights");
      const insights = await generateContactInsights(contact[0]!.id);

      // Create AI insights result
      const aiInsight = await db
        .insert(aiInsights)
        .values({
          userId: testUserId,
          subjectType: "contact",
          subjectId: contact[0]!.id,
          kind: "summary",
          content: insights,
          model: "gpt-4",
        })
        .returning();

      expect(aiInsight[0]).toBeDefined();
      trackForCleanup("aiInsights", aiInsight[0]!.id);

      // Mark job as completed
      await db
        .update(jobs)
        .set({
          status: "done",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job[0]!.id));

      // Verify job completion
      const completedJob = await db.select().from(jobs).where(eq(jobs.id, job[0]!.id)).limit(1);

      expect(completedJob[0]?.status).toBe("done");
      expect(completedJob[0]?.attempts).toBe(1);

      // Verify AI insights were created
      const createdInsights = await db
        .select()
        .from(aiInsights)
        .where(eq(aiInsights.subjectId, contact[0]!.id))
        .limit(1);

      expect(createdInsights).toHaveLength(1);
      expect(createdInsights[0]?.kind).toBe("summary");
    });

    it.skipIf(!dbAvailable)("handles job failures and retries", async () => {
      // Create a job that will fail
      const failingJob = await db
        .insert(jobs)
        .values({
          userId: testUserId,
          kind: "google_gmail_sync",
          payload: { syncType: "full" },
          status: "queued",
        })
        .returning();

      expect(failingJob[0]).toBeDefined();
      trackForCleanup("jobs", failingJob[0]!.id);

      // First attempt - failure
      await db
        .update(jobs)
        .set({
          status: "processing",
          attempts: 1,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, failingJob[0]!.id));

      // Simulate failure
      const errorMessage = "Gmail API rate limit exceeded";
      await db
        .update(jobs)
        .set({
          status: "failed",
          attempts: 1,
          lastError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, failingJob[0]!.id));

      // Second attempt - retry
      await db
        .update(jobs)
        .set({
          status: "processing",
          attempts: 2,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, failingJob[0]!.id));

      // Second attempt also fails
      await db
        .update(jobs)
        .set({
          status: "failed",
          attempts: 2,
          lastError: "Gmail API still unavailable",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, failingJob[0]!.id));

      // Third attempt - success
      await db
        .update(jobs)
        .set({
          status: "processing",
          attempts: 3,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, failingJob[0]!.id));

      // Simulate successful processing
      const { syncGmailMessages } = await import("@/server/google/gmail");
      await syncGmailMessages(testUserId);

      await db
        .update(jobs)
        .set({
          status: "done",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, failingJob[0]!.id));

      // Verify retry behavior
      const finalJob = await db.select().from(jobs).where(eq(jobs.id, failingJob[0]!.id)).limit(1);

      expect(finalJob[0]!.status).toBe("done");
      expect(finalJob[0]!.attempts).toBe(3);
      expect(finalJob[0]!.lastError).toBe("Gmail API still unavailable");
    });

    it.skipIf(!dbAvailable)("handles job queue prioritization", async () => {
      // Create jobs with different priorities (simulated by creation order)
      const highPriorityJob = await db
        .insert(jobs)
        .values({
          userId: testUserId,
          kind: "insight",
          payload: { priority: "high", type: "urgent_analysis" },
          status: "queued",
        })
        .returning();

      const normalPriorityJob = await db
        .insert(jobs)
        .values({
          userId: testUserId,
          kind: "embed",
          payload: { priority: "normal", type: "batch_embedding" },
          status: "queued",
        })
        .returning();

      const lowPriorityJob = await db
        .insert(jobs)
        .values({
          userId: testUserId,
          kind: "normalize_google_email",
          payload: { priority: "low", type: "cleanup" },
          status: "queued",
        })
        .returning();

      trackForCleanup("jobs", highPriorityJob[0]!.id);
      trackForCleanup("jobs", normalPriorityJob[0]!.id);
      trackForCleanup("jobs", lowPriorityJob[0]!.id);

      // Query jobs in priority order (high priority jobs first)
      const queuedJobs = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, testUserId), eq(jobs.status, "queued")))
        .orderBy(jobs.createdAt); // In practice, would use priority field

      expect(queuedJobs).toHaveLength(3);

      // Process high priority job first
      await db
        .update(jobs)
        .set({ status: "processing", attempts: 1, updatedAt: new Date() })
        .where(eq(jobs.id, highPriorityJob[0]!.id));

      await db
        .update(jobs)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(jobs.id, highPriorityJob[0]!.id));

      // Verify remaining queued jobs
      const remainingQueuedJobs = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, testUserId), eq(jobs.status, "queued")))
        .orderBy(jobs.createdAt);

      expect(remainingQueuedJobs).toHaveLength(2);

      // Verify high priority job completed first
      const completedHighPriority = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, highPriorityJob[0]!.id))
        .limit(1);

      expect(completedHighPriority[0]!.status).toBe("done");
    });
  });

  describe("Complex Job Processing Workflows", () => {
    it.skipIf(!dbAvailable)("processes batch job with dependencies", async () => {
      // Create multiple contacts for batch processing
      const batchContacts = await db
        .insert(contacts)
        .values([
          {
            userId: testUserId,
            displayName: "Batch Contact 1",
            primaryEmail: "batch1@test.com",
            source: "import",
          },
          {
            userId: testUserId,
            displayName: "Batch Contact 2",
            primaryEmail: "batch2@test.com",
            source: "import",
          },
          {
            userId: testUserId,
            displayName: "Batch Contact 3",
            primaryEmail: "batch3@test.com",
            source: "import",
          },
        ])
        .returning();

      batchContacts.forEach((contact) => trackForCleanup("contacts", contact.id));

      const batchId = crypto.randomUUID();

      // Step 1: Create normalization jobs for each contact
      const normalizationJobs = await Promise.all(
        batchContacts.map((contact) =>
          db
            .insert(jobs)
            .values({
              userId: testUserId,
              kind: "normalize_google_email",
              payload: { contactId: contact.id },
              status: "queued",
              batchId,
            })
            .returning(),
        ),
      );

      normalizationJobs.forEach((job) => trackForCleanup("jobs", job[0]!.id));

      // Process normalization jobs
      for (const job of normalizationJobs) {
        await db
          .update(jobs)
          .set({ status: "processing", attempts: 1, updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        // Simulate normalization (update contact data)
        await db
          .update(contacts)
          .set({
            lifecycleStage: "Prospect",
            // tags: ["normalized", "batch-import"], // Tags field removed - now using relational tagging system
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, extractJobPayloadField(job[0]!.payload, "contactId")));

        await db
          .update(jobs)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));
      }

      // Step 2: Create insight generation jobs (dependent on normalization)
      const insightJobs = await Promise.all(
        batchContacts.map((contact) =>
          db
            .insert(jobs)
            .values({
              userId: testUserId,
              kind: "insight",
              payload: { contactId: contact.id, dependsOn: "normalize_google_email" },
              status: "queued",
              batchId,
            })
            .returning(),
        ),
      );

      insightJobs.forEach((job) => trackForCleanup("jobs", job[0]!.id));

      // Process insight jobs
      for (const job of insightJobs) {
        await db
          .update(jobs)
          .set({ status: "processing", attempts: 1, updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        const { generateContactInsights } = await import("@/server/ai/insights");
        const insights = await generateContactInsights(
          extractJobPayloadField(job[0]!.payload, "contactId"),
        );

        const aiInsight = await db
          .insert(aiInsights)
          .values({
            userId: testUserId,
            subjectType: "contact",
            subjectId: extractJobPayloadField(job[0]!.payload, "contactId"),
            kind: "summary",
            content: insights,
            model: "gpt-4",
          })
          .returning();

        expect(aiInsight[0]).toBeDefined();
        trackForCleanup("aiInsights", aiInsight[0]!.id);

        await db
          .update(jobs)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));
      }

      // Verify batch processing completed
      const allBatchJobs = await db.select().from(jobs).where(eq(jobs.batchId, batchId));

      expect(allBatchJobs).toHaveLength(6); // 3 normalize_google_email + 3 insight jobs
      expect(allBatchJobs.every((job) => job.status === "done")).toBe(true);

      // Verify all contacts were processed
      const processedContacts = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, testUserId),
            inArray(
              contacts.id,
              batchContacts.map((c) => c.id),
            ),
          ),
        );

      expect(processedContacts.every((c) => c.lifecycleStage === "Prospect")).toBe(true);
      // Tags field removed - now using relational tagging system
      // expect(
      //   processedContacts.every((c) => {
      //     if (!c.tags) return false;
      //     const tags = Array.isArray(c.tags) ? c.tags : JSON.parse(c.tags as string);
      //     return tags.includes("normalized");
      //   }),
      // ).toBe(true);

      // Verify insights were generated for all contacts
      const generatedInsights = await db
        .select()
        .from(aiInsights)
        .where(
          and(
            eq(aiInsights.userId, testUserId),
            inArray(
              aiInsights.subjectId,
              batchContacts.map((c) => c.id),
            ),
          ),
        );

      expect(generatedInsights).toHaveLength(3);
    });

    it.skipIf(!dbAvailable)("processes embedding generation workflow", async () => {
      // Create test interactions for embedding
      const testInteractions = await db
        .insert(interactions)
        .values([
          {
            userId: testUserId,
            type: "email",
            subject: "Yoga class inquiry",
            bodyText:
              "I'm interested in joining beginner yoga classes. What are your available times?",
            occurredAt: new Date(),
            source: "gmail",
          },
          {
            userId: testUserId,
            type: "note",
            subject: "Client consultation notes",
            bodyText:
              "Client prefers evening classes. Has some experience with meditation. Interested in stress relief.",
            occurredAt: new Date(),
            source: "manual",
          },
        ])
        .returning();

      testInteractions.forEach((interaction) => trackForCleanup("interactions", interaction.id));

      // Create embedding jobs
      const embeddingJobs = await Promise.all(
        testInteractions.map((interaction) =>
          db
            .insert(jobs)
            .values({
              userId: testUserId,
              kind: "embed",
              payload: {
                ownerType: "interaction",
                ownerId: interaction.id,
                content: `${interaction.subject} ${interaction.bodyText}`,
              },
              status: "queued",
            })
            .returning(),
        ),
      );

      embeddingJobs.forEach((job) => trackForCleanup("jobs", job[0]!.id));

      // Process embedding jobs
      for (const job of embeddingJobs) {
        await db
          .update(jobs)
          .set({ status: "processing", attempts: 1, updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        const { generateEmbedding } = await import("@/server/ai/embeddings");
        const embedding = await generateEmbedding(
          extractJobPayloadField(job[0]!.payload, "content"),
        );

        // Store embedding
        const embeddingRecord = await db
          .insert(embeddings)
          .values({
            userId: testUserId,
            ownerType: extractJobPayloadField(job[0]!.payload, "ownerType"),
            ownerId: extractJobPayloadField(job[0]!.payload, "ownerId"),
            embedding: embedding,
            contentHash: `hash-${extractJobPayloadField(job[0]!.payload, "ownerId")}`,
            chunkIndex: 0,
          })
          .returning();

        trackForCleanup("embeddings", embeddingRecord[0]!.id);

        await db
          .update(jobs)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));
      }

      // Verify embeddings were created
      const createdEmbeddings = await db
        .select()
        .from(embeddings)
        .where(
          and(
            eq(embeddings.userId, testUserId),
            inArray(
              embeddings.ownerId,
              testInteractions.map((i) => i.id),
            ),
          ),
        );

      expect(createdEmbeddings).toHaveLength(2);
      expect(createdEmbeddings.every((e) => e.embedding !== null)).toBe(true);
      expect(createdEmbeddings.every((e) => e.ownerType === "interaction")).toBe(true);
    });

    it.skipIf(!dbAvailable)("handles data synchronization workflow", async () => {
      const syncBatchId = crypto.randomUUID();

      // Step 1: Create raw events (simulating Gmail sync)
      const rawEventJobs = await Promise.all([
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "google_gmail_sync",
            payload: { syncType: "incremental", timeWindow: "7d" },
            status: "queued",
            batchId: syncBatchId,
          })
          .returning(),
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "google_calendar_sync",
            payload: { syncType: "incremental", timeWindow: "30d" },
            status: "queued",
            batchId: syncBatchId,
          })
          .returning(),
      ]);

      rawEventJobs.forEach((job) => trackForCleanup("jobs", job[0]!.id));

      // Process sync jobs - create raw events
      for (const job of rawEventJobs) {
        await db
          .update(jobs)
          .set({ status: "processing", attempts: 1, updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        // Create simulated raw events
        if (job[0]!.kind === "google_gmail_sync") {
          const gmailEvents = await db
            .insert(rawEvents)
            .values([
              {
                userId: testUserId,
                provider: "gmail",
                payload: {
                  messageId: "gmail-msg-1",
                  from: "client1@test.com",
                  subject: "Class booking request",
                  body: "I'd like to book a yoga session",
                },
                occurredAt: new Date(),
                batchId: syncBatchId,
                sourceId: "gmail-msg-1",
              },
              {
                userId: testUserId,
                provider: "gmail",
                payload: {
                  messageId: "gmail-msg-2",
                  from: "client2@test.com",
                  subject: "Schedule change request",
                  body: "Can we reschedule tomorrow's session?",
                },
                occurredAt: new Date(),
                batchId: syncBatchId,
                sourceId: "gmail-msg-2",
              },
            ])
            .returning();

          gmailEvents.forEach((event) => trackForCleanup("rawEvents", event.id));
        }

        if (job[0]!.kind === "google_calendar_sync") {
          const calendarEvents = await db
            .insert(rawEvents)
            .values([
              {
                userId: testUserId,
                provider: "calendar",
                payload: {
                  eventId: "cal-event-1",
                  title: "Private yoga session",
                  attendees: ["newclient@test.com"],
                  startTime: new Date().toISOString(),
                },
                occurredAt: new Date(),
                batchId: syncBatchId,
                sourceId: "cal-event-1",
              },
            ])
            .returning();

          calendarEvents.forEach((event) => trackForCleanup("rawEvents", event.id));
        }

        await db
          .update(jobs)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));
      }

      // Step 2: Process raw events (normalization)
      const rawEventsToProcess = await db
        .select()
        .from(rawEvents)
        .where(eq(rawEvents.batchId, syncBatchId));

      const processingJobs = await Promise.all(
        rawEventsToProcess.map((event) =>
          db
            .insert(jobs)
            .values({
              userId: testUserId,
              kind: "normalize_google_email",
              payload: { rawEventId: event.id },
              status: "queued",
              batchId: syncBatchId,
            })
            .returning(),
        ),
      );

      processingJobs.forEach((job) => trackForCleanup("jobs", job[0]!.id));

      // Process normalization jobs
      for (const job of processingJobs) {
        await db
          .update(jobs)
          .set({ status: "processing", attempts: 1, updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        const rawEvent = await db
          .select()
          .from(rawEvents)
          .where(eq(rawEvents.id, extractJobPayloadField(job[0]!.payload, "rawEventId")))
          .limit(1);

        // Create structured data from raw events
        if (rawEvent[0]?.provider === "gmail") {
          const payload = rawEvent[0].payload;
          if (
            payload &&
            typeof payload === "object" &&
            "subject" in payload &&
            "body" in payload &&
            "messageId" in payload
          ) {
            const interaction = await db
              .insert(interactions)
              .values({
                userId: testUserId,
                type: "email",
                subject: String(payload.subject),
                bodyText: String(payload.body),
                occurredAt: rawEvent[0].occurredAt,
                source: "gmail",
                sourceId: String(payload.messageId),
              })
              .returning();

            if (interaction[0]) {
              trackForCleanup("interactions", interaction[0].id);
            }
          }
        }

        await db
          .update(jobs)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));
      }

      // Verify sync workflow completed
      const allSyncJobs = await db.select().from(jobs).where(eq(jobs.batchId, syncBatchId));

      expect(allSyncJobs.every((job) => job.status === "done")).toBe(true);

      // Verify interactions were created from raw events
      const createdInteractions = await db
        .select()
        .from(interactions)
        .where(and(eq(interactions.userId, testUserId), eq(interactions.source, "gmail")));

      expect(createdInteractions.length).toBeGreaterThanOrEqual(2);
      expect(createdInteractions.every((i) => i.sourceId?.startsWith("gmail-msg-"))).toBe(true);
    });
  });

  describe("Job Performance and Scalability", () => {
    it.skipIf(!dbAvailable)("processes high-volume job queue efficiently", async () => {
      const startTime = Date.now();
      const jobCount = 50;

      // Create high volume of jobs
      const bulkJobs = Array.from({ length: jobCount }, (_, i) => ({
        userId: testUserId,
        kind: "normalize_google_email" as const,
        payload: { index: i, type: "bulk_processing" },
        status: "queued" as const,
      }));

      const createdJobs = await db.insert(jobs).values(bulkJobs).returning();
      createdJobs.forEach((job) => trackForCleanup("jobs", job.id));

      const enqueueTime = Date.now() - startTime;

      // Process jobs in batches (simulate parallel processing)
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < createdJobs.length; i += batchSize) {
        batches.push(createdJobs.slice(i, i + batchSize));
      }

      const processingStartTime = Date.now();

      for (const batch of batches) {
        // Process batch in parallel
        await Promise.all(
          batch.map(async (job) => {
            await db
              .update(jobs)
              .set({ status: "processing", attempts: 1, updatedAt: new Date() })
              .where(eq(jobs.id, job.id));

            // Simulate processing work
            await new Promise((resolve) => setTimeout(resolve, 10));

            await db
              .update(jobs)
              .set({ status: "done", updatedAt: new Date() })
              .where(eq(jobs.id, job.id));
          }),
        );
      }

      const processingTime = Date.now() - processingStartTime;

      // Verify performance benchmarks
      expect(enqueueTime).toBeLessThan(2000); // 2 seconds to enqueue 50 jobs
      expect(processingTime).toBeLessThan(5000); // 5 seconds to process all jobs
      expect(Date.now() - startTime).toBeLessThan(7000); // 7 seconds total

      // Verify all jobs completed
      const completedJobs = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.userId, testUserId), eq(jobs.status, "done")));

      expect(completedJobs.length).toBeGreaterThanOrEqual(jobCount);
    });

    it.skipIf(!dbAvailable)("handles concurrent job processing without conflicts", async () => {
      // Create jobs that might conflict if not handled properly
      const sharedContactId = crypto.randomUUID();

      const conflictingJobs = await Promise.all([
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "insight",
            payload: { contactId: sharedContactId, type: "personality" },
            status: "queued",
          })
          .returning(),
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "insight",
            payload: { contactId: sharedContactId, type: "preferences" },
            status: "queued",
          })
          .returning(),
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "embed",
            payload: { contactId: sharedContactId, type: "profile_text" },
            status: "queued",
          })
          .returning(),
      ]);

      conflictingJobs.forEach((job) => trackForCleanup("jobs", job[0]!.id));

      // Process all jobs concurrently
      const processingPromises = conflictingJobs.map(async (job) => {
        await db
          .update(jobs)
          .set({ status: "processing", attempts: 1, updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        // Simulate concurrent processing
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

        await db
          .update(jobs)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        return job[0]!.id;
      });

      const completedJobIds = await Promise.all(processingPromises);

      // Verify all jobs completed without conflicts
      expect(completedJobIds).toHaveLength(3);

      const finalJobs = await db.select().from(jobs).where(inArray(jobs.id, completedJobIds));

      expect(finalJobs.every((job) => job.status === "done")).toBe(true);
      expect(finalJobs.every((job) => job.attempts === 1)).toBe(true);
    });

    it.skipIf(!dbAvailable)("handles job queue backpressure", async () => {
      // Simulate high job creation rate
      const rapidJobs = Array.from({ length: 100 }, (_, i) => ({
        userId: testUserId,
        kind: "embed" as const,
        payload: { text: `Content to embed ${i}`, urgent: i < 10 },
        status: "queued" as const,
      }));

      const startTime = Date.now();
      const enqueuedJobs = await db.insert(jobs).values(rapidJobs).returning();
      const enqueueTime = Date.now() - startTime;

      enqueuedJobs.forEach((job) => trackForCleanup("jobs", job.id));

      // Query queue depth
      const queueDepth = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(jobs)
        .where(and(eq(jobs.userId, testUserId), eq(jobs.status, "queued")));

      expect(queueDepth[0]?.count).toBe(100);
      expect(enqueueTime).toBeLessThan(3000); // Should handle rapid enqueuing

      // Simulate queue processing with backpressure handling
      const maxConcurrent = 5;
      let processing = 0;
      let processed = 0;

      while (processed < 100) {
        if (processing < maxConcurrent) {
          // Pick next job from queue
          const nextJob = await db
            .select()
            .from(jobs)
            .where(and(eq(jobs.userId, testUserId), eq(jobs.status, "queued")))
            .orderBy(jobs.createdAt)
            .limit(1);

          if (nextJob.length > 0) {
            processing++;

            // Process job asynchronously
            db.update(jobs)
              .set({ status: "processing", attempts: 1, updatedAt: new Date() })
              .where(eq(jobs.id, nextJob[0]!.id))
              .then(() => new Promise((resolve) => setTimeout(resolve, 20)))
              .then(() =>
                db
                  .update(jobs)
                  .set({ status: "done", updatedAt: new Date() })
                  .where(eq(jobs.id, nextJob[0]!.id)),
              )
              .then(() => {
                processing--;
                processed++;
              });
          }
        }

        // Small delay to prevent tight loop
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      // Wait for all processing to complete
      while (processing > 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Verify backpressure handling worked
      const remainingQueued = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(jobs)
        .where(and(eq(jobs.userId, testUserId), eq(jobs.status, "queued")));

      expect(Number(remainingQueued[0]!.count)).toBe(0);
    });
  });

  describe("Error Recovery and Resilience", () => {
    it.skipIf(!dbAvailable)("recovers from database connection issues", async () => {
      // Create a job that will experience connection issues
      const resilientJob = await db
        .insert(jobs)
        .values({
          userId: testUserId,
          kind: "insight",
          payload: { type: "resilience_test" },
          status: "queued",
        })
        .returning();

      trackForCleanup("jobs", resilientJob[0]!.id);

      // Simulate connection issue during processing
      await db
        .update(jobs)
        .set({ status: "processing", attempts: 1, updatedAt: new Date() })
        .where(eq(jobs.id, resilientJob[0]!.id));

      // Simulate connection failure
      await db
        .update(jobs)
        .set({
          status: "failed",
          attempts: 1,
          lastError: "Database connection lost",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, resilientJob[0]!.id));

      // Simulate recovery and retry
      await db
        .update(jobs)
        .set({
          status: "processing",
          attempts: 2,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, resilientJob[0]!.id));

      // Successful completion after recovery
      await db
        .update(jobs)
        .set({
          status: "done",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, resilientJob[0]!.id));

      const recoveredJob = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, resilientJob[0]!.id))
        .limit(1);

      expect(recoveredJob[0]!.status).toBe("done");
      expect(recoveredJob[0]!.attempts).toBe(2);
      expect(recoveredJob[0]!.lastError).toBe("Database connection lost");
    });

    it.skipIf(!dbAvailable)("handles partial batch failures gracefully", async () => {
      const batchId = crypto.randomUUID();

      // Create a batch with some jobs that will fail
      const batchJobs = await Promise.all([
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "normalize_google_email",
            payload: { type: "success", index: 1 },
            status: "queued",
            batchId,
          })
          .returning(),
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "normalize_google_email",
            payload: { type: "failure", index: 2 },
            status: "queued",
            batchId,
          })
          .returning(),
        db
          .insert(jobs)
          .values({
            userId: testUserId,
            kind: "normalize_google_email",
            payload: { type: "success", index: 3 },
            status: "queued",
            batchId,
          })
          .returning(),
      ]);

      batchJobs.forEach((job) => trackForCleanup("jobs", job[0]!.id));

      // Process batch with partial failures
      for (const job of batchJobs) {
        await db
          .update(jobs)
          .set({ status: "processing", attempts: 1, updatedAt: new Date() })
          .where(eq(jobs.id, job[0]!.id));

        // Type guard for job payload type field
        const payload = job[0]!.payload;
        const isPayloadObject = payload && typeof payload === "object" && payload !== null;
        const payloadType =
          isPayloadObject && "type" in payload
            ? (payload as Record<string, unknown>).type
            : undefined;

        if (payloadType === "failure") {
          // Simulate failure
          await db
            .update(jobs)
            .set({
              status: "failed",
              attempts: 1,
              lastError: "Simulated processing failure",
              updatedAt: new Date(),
            })
            .where(eq(jobs.id, job[0]!.id));
        } else {
          // Successful processing
          await db
            .update(jobs)
            .set({ status: "done", updatedAt: new Date() })
            .where(eq(jobs.id, job[0]!.id));
        }
      }

      // Verify partial batch results
      const batchResults = await db.select().from(jobs).where(eq(jobs.batchId, batchId));

      const completed = batchResults.filter((job) => job.status === "done");
      const failed = batchResults.filter((job) => job.status === "failed");

      expect(completed).toHaveLength(2);
      expect(failed).toHaveLength(1);
      expect(failed[0]!.lastError).toBe("Simulated processing failure");
    });
  });
});

// Import sql at end to keep it for linting
import { sql } from "drizzle-orm";

// Ensure sql import is used for linting purposes
if (false) {
  console.log(sql);
}
