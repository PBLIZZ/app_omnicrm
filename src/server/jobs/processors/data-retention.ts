import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { rawEvents, syncAudit, aiUsage } from "@/server/db/schema";
import { lt } from "drizzle-orm";
import { log } from "@/server/log";
import type { JobRecord } from "../types";

// Configurable retention periods (in days)
const RETENTION_POLICIES = {
  RAW_EVENTS: Number(process.env["RETENTION_RAW_EVENTS_DAYS"] ?? 730), // 2 years default
  COMPLETED_JOBS: Number(process.env["RETENTION_COMPLETED_JOBS_DAYS"] ?? 90), // 3 months
  AUDIT_LOGS: Number(process.env["RETENTION_AUDIT_LOGS_DAYS"] ?? 365), // 1 year
  AI_USAGE_LOGS: Number(process.env["RETENTION_AI_USAGE_DAYS"] ?? 365), // 1 year
  DELETION_AUDIT_LOGS: Number(process.env["RETENTION_DELETION_AUDIT_DAYS"] ?? 30), // 30 days for compliance
};

interface RetentionJobPayload {
  dryRun?: boolean;
  targetTable?: "raw_events" | "jobs" | "sync_audit" | "ai_usage" | "all";
  olderThanDays?: number;
}

function isRetentionPayload(payload: unknown): payload is RetentionJobPayload {
  return typeof payload === "object" && payload !== null;
}

/**
 * Data retention cleanup job - removes old data per retention policies
 * Helps maintain compliance and database performance
 */
export async function runDataRetention(job: JobRecord): Promise<void> {
  const startTime = Date.now();
  const db = await getDb();

  try {
    const payload = isRetentionPayload(job.payload) ? job.payload : {};
    const dryRun = payload.dryRun ?? false;
    const targetTable = payload.targetTable ?? "all";

    log.info(
      {
        op: "data_retention.start",
        userId: job.userId,
        targetTable,
        dryRun,
        retentionPolicies: RETENTION_POLICIES,
        jobId: job.id,
      },
      "Starting data retention cleanup",
    );

    let totalCleaned = 0;
    const cleanupResults: Record<string, number> = {};

    // Clean up raw events (oldest data, highest volume)
    if (targetTable === "all" || targetTable === "raw_events") {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - RETENTION_POLICIES.RAW_EVENTS);

      if (dryRun) {
        const { rows } = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM raw_events 
          WHERE created_at < ${retentionDate}
        `);
        cleanupResults["raw_events_would_delete"] = Number(rows[0]?.["count"] ?? 0);
      } else {
        const result = await db.delete(rawEvents).where(lt(rawEvents.createdAt, retentionDate));

        cleanupResults["raw_events_cleaned"] = result.rowCount ?? 0;
        totalCleaned += cleanupResults["raw_events_cleaned"];
      }
    }

    // Clean up completed jobs (reduce clutter)
    if (targetTable === "all" || targetTable === "jobs") {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - RETENTION_POLICIES.COMPLETED_JOBS);

      if (dryRun) {
        const { rows } = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM jobs 
          WHERE created_at < ${retentionDate} 
          AND status IN ('completed', 'failed')
        `);
        cleanupResults["jobs_would_delete"] = Number(rows[0]?.["count"] ?? 0);
      } else {
        const { rowCount } = await db.execute(sql`
          DELETE FROM jobs 
          WHERE created_at < ${retentionDate}
          AND status IN ('completed', 'failed')
        `);

        cleanupResults["jobs_cleaned"] = rowCount ?? 0;
        totalCleaned += cleanupResults["jobs_cleaned"];
      }
    }

    // Clean up audit logs (keep compliance-critical deletion logs longer)
    if (targetTable === "all" || targetTable === "sync_audit") {
      const regularAuditRetentionDate = new Date();
      regularAuditRetentionDate.setDate(
        regularAuditRetentionDate.getDate() - RETENTION_POLICIES.AUDIT_LOGS,
      );

      const deletionAuditRetentionDate = new Date();
      deletionAuditRetentionDate.setDate(
        deletionAuditRetentionDate.getDate() - RETENTION_POLICIES.DELETION_AUDIT_LOGS,
      );

      if (dryRun) {
        // Count regular audit logs
        const { rows: regularRows } = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM sync_audit 
          WHERE created_at < ${regularAuditRetentionDate}
          AND action NOT LIKE '%deletion%'
        `);

        // Count deletion audit logs (older retention)
        const { rows: deletionRows } = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM sync_audit 
          WHERE created_at < ${deletionAuditRetentionDate}
          AND action LIKE '%deletion%'
        `);

        cleanupResults["audit_regular_would_delete"] = Number(regularRows[0]?.["count"] ?? 0);
        cleanupResults["audit_deletion_would_delete"] = Number(deletionRows[0]?.["count"] ?? 0);
      } else {
        // Clean regular audit logs
        const regularResult = await db.delete(syncAudit).where(sql`
            created_at < ${regularAuditRetentionDate}
            AND action NOT LIKE '%deletion%'
          `);

        // Clean deletion audit logs (with longer retention)
        const deletionResult = await db.delete(syncAudit).where(sql`
            created_at < ${deletionAuditRetentionDate}
            AND action LIKE '%deletion%'
          `);

        cleanupResults["audit_regular_cleaned"] = regularResult.rowCount ?? 0;
        cleanupResults["audit_deletion_cleaned"] = deletionResult.rowCount ?? 0;
        totalCleaned +=
          cleanupResults["audit_regular_cleaned"] + cleanupResults["audit_deletion_cleaned"];
      }
    }

    // Clean up AI usage logs (keep for cost analysis and quota management)
    if (targetTable === "all" || targetTable === "ai_usage") {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - RETENTION_POLICIES.AI_USAGE_LOGS);

      if (dryRun) {
        const { rows } = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM ai_usage 
          WHERE created_at < ${retentionDate}
        `);
        cleanupResults["ai_usage_would_delete"] = Number(rows[0]?.["count"] ?? 0);
      } else {
        const result = await db.delete(aiUsage).where(lt(aiUsage.createdAt, retentionDate));

        cleanupResults["ai_usage_cleaned"] = result.rowCount ?? 0;
        totalCleaned += cleanupResults["ai_usage_cleaned"];
      }
    }

    // Database maintenance after cleanup (if not dry run)
    if (!dryRun && totalCleaned > 0) {
      log.info(
        {
          op: "data_retention.maintenance",
          userId: job.userId,
          totalCleaned,
        },
        "Running database maintenance after cleanup",
      );

      // Vacuum analyze to reclaim space and update statistics
      await db.execute(sql`VACUUM ANALYZE`);
    }

    const duration = Date.now() - startTime;

    log.info(
      {
        op: "data_retention.complete",
        userId: job.userId,
        dryRun,
        targetTable,
        totalCleaned,
        cleanupResults,
        duration,
        jobId: job.id,
      },
      `Data retention cleanup ${dryRun ? "analysis" : "execution"} completed`,
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(
      {
        op: "data_retention.error",
        userId: job.userId,
        error: error instanceof Error ? error.message : String(error),
        duration,
        jobId: job.id,
      },
      "Data retention cleanup failed",
    );
    throw error;
  }
}

/**
 * Helper function to estimate storage savings from retention cleanup
 */
export async function estimateRetentionSavings(userId?: string): Promise<{
  rawEventsToClean: number;
  jobsToClean: number;
  auditLogsToClean: number;
  aiUsageToClean: number;
  estimatedSpaceSavingsMB: number;
}> {
  const db = await getDb();

  // Calculate cutoff dates
  const rawEventsCutoff = new Date();
  rawEventsCutoff.setDate(rawEventsCutoff.getDate() - RETENTION_POLICIES.RAW_EVENTS);

  const jobsCutoff = new Date();
  jobsCutoff.setDate(jobsCutoff.getDate() - RETENTION_POLICIES.COMPLETED_JOBS);

  const auditCutoff = new Date();
  auditCutoff.setDate(auditCutoff.getDate() - RETENTION_POLICIES.AUDIT_LOGS);

  const aiUsageCutoff = new Date();
  aiUsageCutoff.setDate(aiUsageCutoff.getDate() - RETENTION_POLICIES.AI_USAGE_LOGS);

  const userFilter = userId ? sql` AND user_id = ${userId}::uuid` : sql``;

  // Get counts for cleanable records
  const [rawEventsCount, jobsCount, auditCount, aiUsageCount] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*) as count
      FROM raw_events 
      WHERE created_at < ${rawEventsCutoff}${userFilter}
    `),
    db.execute(sql`
      SELECT COUNT(*) as count
      FROM jobs 
      WHERE created_at < ${jobsCutoff} 
      AND status IN ('completed', 'failed')${userFilter}
    `),
    db.execute(sql`
      SELECT COUNT(*) as count
      FROM sync_audit 
      WHERE created_at < ${auditCutoff}${userFilter}
    `),
    db.execute(sql`
      SELECT COUNT(*) as count
      FROM ai_usage 
      WHERE created_at < ${aiUsageCutoff}${userFilter}
    `),
  ]);

  const rawEventsToClean = Number(rawEventsCount.rows[0]?.["count"] ?? 0);
  const jobsToClean = Number(jobsCount.rows[0]?.["count"] ?? 0);
  const auditLogsToClean = Number(auditCount.rows[0]?.["count"] ?? 0);
  const aiUsageToClean = Number(aiUsageCount.rows[0]?.["count"] ?? 0);

  // Rough estimate: raw_events ~2KB each, jobs ~1KB, audit ~0.5KB, ai_usage ~0.3KB
  const estimatedSpaceSavingsMB = Math.round(
    (rawEventsToClean * 2 + jobsToClean * 1 + auditLogsToClean * 0.5 + aiUsageToClean * 0.3) / 1024,
  );

  return {
    rawEventsToClean,
    jobsToClean,
    auditLogsToClean,
    aiUsageToClean,
    estimatedSpaceSavingsMB,
  };
}
