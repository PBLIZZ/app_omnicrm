# Gmail/Calendar Sync Performance Audit Report

**Audit Date:** August 11, 2025  
**Scope:** Gmail/Calendar sync workflow performance analysis  
**Auditor:** Claude Code Performance Auditor

## Executive Summary

The Gmail/Calendar sync workflow demonstrates solid architectural foundations with appropriate rate limiting, job queuing, and database optimization patterns. However, several **CRITICAL** and **HIGH** severity performance issues require immediate attention for production scalability.

### Key Findings Summary

- **CRITICAL**: N+1 query pattern in normalization processors
- **HIGH**: Missing database connection pooling configuration
- **HIGH**: Inefficient single-row database insertions during sync
- **MODERATE**: Suboptimal batch processing sizes for large datasets
- **MODERATE**: Frontend lacks proper loading states and pagination

### Priority Recommendations

1. **Immediate**: Implement batch insertions for raw_events and interactions tables
2. **Short-term**: Add database connection pooling and optimize normalization queries
3. **Medium-term**: Implement streaming/chunked processing for large datasets
4. **Long-term**: Add comprehensive monitoring and alerting for sync performance

---

## Detailed Performance Analysis

### 1. Database Performance

#### 1.1 Query Efficiency Analysis - **CRITICAL**

**File:** `/src/server/jobs/processors/normalize.ts`

**Issue:** N+1 query pattern in normalization processors

```typescript
// PROBLEMATIC: Individual SELECT for each raw event
for (const r of rows) {
  const existing = await dbo
    .select({ id: interactions.id })
    .from(interactions)
    .where(
      and(
        eq(interactions.userId, userId),
        eq(interactions.source, "gmail"),
        eq(interactions.sourceId, messageId),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    itemsSkipped += 1;
    continue;
  }
  // Then individual INSERT
  await supaAdminGuard.insert("interactions", { ... });
}
```

**Performance Impact:**

- For 2000 emails: 2000+ individual SELECT queries + 2000 INSERT queries
- Estimated latency: 4-6 seconds for moderate datasets
- Database connection exhaustion risk under concurrent processing

**Recommended Fix:**

```typescript
// Batch dedupe check
const sourceIds = rows.map((r) => r.payload?.id).filter(Boolean);
const existing = await dbo
  .select({ sourceId: interactions.sourceId })
  .from(interactions)
  .where(
    and(
      eq(interactions.userId, userId),
      eq(interactions.source, "gmail"),
      inArray(interactions.sourceId, sourceIds),
    ),
  );
const existingSet = new Set(existing.map((e) => e.sourceId));

// Batch insert new records
const newInteractions = rows
  .filter((r) => !existingSet.has(r.payload?.id))
  .map((r) => ({
    /* transform raw event */
  }));

if (newInteractions.length > 0) {
  await supaAdminGuard.insert("interactions", newInteractions);
}
```

#### 1.2 Raw Data Insertion Performance - **HIGH**

**File:** `/src/server/jobs/processors/sync.ts`

**Issue:** Individual insertions during Gmail sync

```typescript
// Line 81-90: Individual INSERT per message
await supaAdminGuard.insert("raw_events", {
  user_id: userId,
  provider: "gmail",
  payload: msg,
  occurred_at: occurredAt,
  // ... other fields
});
```

**Performance Impact:**

- 2000 individual database round-trips for max batch size
- Transaction overhead for each insertion
- Blocking synchronous pattern prevents parallel processing

**Recommended Solution:**

- Accumulate insertions in memory arrays
- Batch insert every 100-500 records
- Implement async/parallel processing where possible

#### 1.3 Database Connection Management - **HIGH**

**File:** `/src/server/db/client.ts`

**Current State:** Singleton pattern without explicit pooling

```typescript
// No explicit connection pool configuration visible
const client = new ClientCtor({ connectionString: databaseUrl });
await client.connect();
```

**Risks:**

- Connection exhaustion under concurrent job processing
- No connection timeout or retry configuration
- Single connection bottleneck for high-throughput scenarios

**Recommendation:**

- Implement proper connection pooling (10-20 connections)
- Configure connection timeouts and retry logic
- Add connection health monitoring

#### 1.4 Index Optimization Review - **MODERATE**

**Files:** `/supabase/sql/11_db_perf_optimizations.sql`, `/supabase/sql/12_perf_indexes.sql`

**Strengths:**

- Comprehensive indexes for user_id, provider, occurred_at patterns
- Unique constraints for deduplication
- Proper composite indexes for common query patterns

**Missing Indexes:**

- `raw_events(user_id, provider, source_id)` - partially covered but could be optimized
- `jobs(user_id, status, kind, updated_at)` - composite for job runner queries
- `interactions(user_id, batch_id)` for batch operations

### 2. Google API Usage Analysis

#### 2.1 Rate Limiting Implementation - **LOW**

**File:** `/src/server/google/gmail.ts`

**Current Implementation:**

```typescript
// Line 32-35: Proper retry with exponential backoff
const delay = Math.min(300 * 2 ** attempt, 2000) + Math.floor(Math.random() * 200);

// Line 44: Appropriate chunk size
const chunk = 25;

// Line 74: Inter-batch delays
await new Promise((r) => setTimeout(r, 200));
```

**Assessment:** **GOOD** - Well-implemented rate limiting with:

- Exponential backoff with jitter
- Conservative batch sizes (25 items)
- Inter-batch delays (200ms)
- Timeout protection (10s per request)

#### 2.2 Batch Processing Efficiency - **MODERATE**

**Current Batch Sizes:**

- Gmail message fetch: 25 per batch
- Gmail message list: 100 per page
- Calendar events: 2500 per page

**Analysis:**

- Gmail 25-item batches are conservative but safe
- Could potentially increase to 50-100 for better throughput
- Calendar 2500 limit is appropriate for API constraints

**Optimization Opportunity:**

- Dynamic batch sizing based on response times
- Parallel processing of independent batches
- Streaming response handling for large datasets

#### 2.3 Quota Management - **LOW**

**Current State:** Basic hard limits implemented

```typescript
const MAX_PER_RUN = 2000; // Line 50
const deadlineMs = startedAt + 3 * 60 * 1000; // 3 minute cap
```

**Assessment:** Adequate protection against runaway processes, but lacks:

- Dynamic quota tracking based on API response headers
- User-specific quota management
- Graceful degradation when approaching limits

### 3. Job Processing Performance

#### 3.1 Concurrent Execution Analysis - **MODERATE**

**File:** `/src/app/api/jobs/runner/route.ts`

**Current Pattern:** Sequential job processing

```typescript
for (const job of queued as JobRecord[]) {
  // Process one job at a time
  await handler(job as unknown, userId);
  // Small delay between jobs
  await new Promise((r) => setTimeout(r, BASE_DELAY_MS));
}
```

**Performance Limitations:**

- No concurrent job execution
- Fixed 200ms delay between jobs regardless of job type
- Synchronous processing prevents optimal resource utilization

**Recommended Improvements:**

```typescript
// Process jobs in parallel with concurrency control
const concurrencyLimit = 3; // Configurable
const jobBatches = chunk(queued, concurrencyLimit);

for (const batch of jobBatches) {
  await Promise.allSettled(batch.map((job) => processJobWithRetry(job, userId)));
}
```

#### 3.2 Memory Usage Patterns - **MODERATE**

**Analysis of Memory-Intensive Operations:**

1. **Gmail Sync** (Line 49-96 in sync.ts):
   - Fetches up to 2000 messages in 25-item chunks
   - Each message payload stored in memory temporarily
   - Estimated memory usage: 50-200MB for full sync

2. **Calendar Sync** (Line 147-177):
   - Loads all calendar events into memory at once
   - Less memory-intensive than Gmail due to smaller payloads

3. **Normalization** (normalize.ts):
   - Loads all raw events for a batch into memory
   - Potential memory issue for large batches without pagination

**Recommendations:**

- Implement streaming/pagination for raw event processing
- Add memory usage monitoring and alerts
- Consider processing in smaller sub-batches for large datasets

#### 3.3 Job Queue Scalability - **MODERATE**

**Current Limitations:**

- Fixed batch size of 25 jobs per runner execution
- No prioritization system for different job types
- Single-threaded job processing per user

**Scaling Bottlenecks:**

- Database polling for job queue (not push-based)
- No distributed job processing capability
- Limited error handling and retry sophistication

### 4. Data Processing Efficiency

#### 4.1 Normalization Performance - **HIGH**

**File:** `/src/server/jobs/processors/normalize.ts`

**Current Process:**

1. Load all raw events into memory (Line 18-27)
2. Sequential processing with individual database queries
3. Individual duplicate checks and insertions

**Performance Issues:**

- Memory usage scales linearly with batch size
- O(n) database queries for duplicate checking
- No bulk operations for better throughput

#### 4.2 Contact Matching Overhead - **LOW**

**Current State:** Contact matching is deferred (contact_id set to null)

**Analysis:** Good design choice to avoid blocking sync on contact resolution

- Allows fast initial sync completion
- Contact matching can be handled in separate background jobs
- Reduces complexity and failure points in critical sync path

### 5. Frontend Performance Analysis

#### 5.1 Preview Operations - **MODERATE**

**File:** `/src/app/settings/sync/page.tsx`

**Current Implementation:**

```typescript
// Line 341-351: Gmail preview without loading states
onClick={async () => {
  const result = (await callJSON(
    `${base}/api/sync/preview/gmail`,
  )) as PreviewAPIResponse;
  // Direct state update - no loading indication
  setGmail({ countByLabel: d.countByLabel, sampleSubjects: d.sampleSubjects });
}}
```

**Performance Issues:**

- No loading states during API calls
- No error boundaries for failed requests
- Synchronous UI blocking during preview operations
- No caching of preview results

**Recommended Improvements:**

```typescript
const [previewLoading, setPreviewLoading] = useState<{ gmail: boolean; calendar: boolean }>({
  gmail: false,
  calendar: false,
});

// Add proper loading states and error handling
const handleGmailPreview = async () => {
  setPreviewLoading((prev) => ({ ...prev, gmail: true }));
  try {
    const result = await callJSON(`${base}/api/sync/preview/gmail`);
    // Handle result...
  } catch (error) {
    // Error handling...
  } finally {
    setPreviewLoading((prev) => ({ ...prev, gmail: false }));
  }
};
```

#### 5.2 State Management Efficiency - **MODERATE**

**Current Approach:**

- Multiple useState hooks for different data types
- No persistence of sync preferences
- Manual state updates without optimistic updates

**Optimization Opportunities:**

- Implement React Query or SWR for API state management
- Add optimistic updates for better perceived performance
- Persist preview data locally to avoid repeated API calls

### 6. Production Deployment Considerations

#### 6.1 Monitoring and Alerting - **HIGH**

**Current Monitoring:** Basic console.log metrics

```typescript
console.log(
  JSON.stringify({
    event: "gmail_sync_metrics",
    userId,
    batchId,
    itemsFetched,
    itemsInserted,
    itemsSkipped,
    durationMs,
  }),
);
```

**Missing Production Requirements:**

- Application Performance Monitoring (APM) integration
- Database performance metrics
- API rate limit monitoring
- Memory and CPU usage tracking
- Custom business metrics dashboards

#### 6.2 Scaling Architecture - **HIGH**

**Current Limitations for Scale:**

- Single-process job processing
- No horizontal scaling capabilities
- Database connection limits
- Missing queue management for high-concurrency scenarios

**Scaling Recommendations:**

1. Implement proper job queue system (Redis/Bull)
2. Add horizontal scaling capabilities
3. Database read replicas for reporting queries
4. CDN for static assets and API response caching
5. Load balancing for multiple app instances

---

## Optimization Roadmap

### Phase 1: Critical Fixes (1-2 weeks)

**Priority: CRITICAL/HIGH**

1. **Implement Batch Database Operations**
   - Refactor normalization processors to use batch queries
   - Add bulk insert capabilities to supaAdminGuard
   - Reduce database round-trips by 90%+

2. **Add Database Connection Pooling**
   - Configure proper connection pool (10-20 connections)
   - Add connection health monitoring
   - Implement connection timeout and retry logic

3. **Fix N+1 Query Patterns**
   - Batch duplicate checking in normalize processors
   - Implement bulk operations for better performance
   - Add query optimization for common patterns

### Phase 2: Performance Optimization (2-4 weeks)

**Priority: MODERATE/HIGH**

1. **Improve Job Processing**
   - Add controlled concurrency for job execution
   - Implement priority queuing system
   - Add job processing metrics and monitoring

2. **Optimize API Batch Sizes**
   - Dynamic batch sizing based on response times
   - Parallel processing where safe
   - Add adaptive rate limiting

3. **Enhance Frontend Performance**
   - Add proper loading states and error handling
   - Implement caching for preview results
   - Add optimistic updates for better UX

### Phase 3: Scalability Improvements (4-6 weeks)

**Priority: MODERATE**

1. **Production Monitoring**
   - APM integration (DataDog, New Relic, etc.)
   - Custom business metrics dashboards
   - Alert configuration for critical thresholds

2. **Advanced Optimization**
   - Streaming data processing for large datasets
   - Database query optimization and index tuning
   - Memory usage optimization

3. **Horizontal Scaling Preparation**
   - Queue system implementation (Redis/Bull)
   - Database scaling strategy (read replicas)
   - Load balancing configuration

---

## Performance Benchmarks and Targets

### Current Performance (Estimated)

- **Gmail Sync (2000 emails):** 4-6 minutes
- **Calendar Sync (1000 events):** 2-3 minutes
- **Normalization (2000 records):** 3-5 minutes
- **Database queries:** 1000+ individual queries per sync

### Target Performance (Post-Optimization)

- **Gmail Sync (2000 emails):** 1-2 minutes (50% improvement)
- **Calendar Sync (1000 events):** 30-60 seconds (50% improvement)
- **Normalization (2000 records):** 30-90 seconds (70% improvement)
- **Database queries:** <50 batch queries per sync (90% reduction)

### Key Metrics to Monitor

1. **Sync Performance**
   - Items processed per minute
   - Sync completion time by data size
   - API rate limit utilization

2. **Database Performance**
   - Query execution time (p95, p99)
   - Connection pool utilization
   - Index hit ratio

3. **Job Processing**
   - Job queue depth and processing rate
   - Job failure rate and retry patterns
   - Memory usage per job type

4. **User Experience**
   - Preview generation time
   - UI responsiveness metrics
   - Error rates and user-reported issues

---

## Conclusion

The Gmail/Calendar sync workflow demonstrates solid engineering practices but requires critical performance optimizations before production deployment. The most impactful improvements involve database query optimization and batch processing implementation.

**Immediate Action Required:**

1. Fix N+1 query patterns in normalization processors
2. Implement batch database insertions
3. Add proper database connection pooling
4. Enhance monitoring and alerting capabilities

With these optimizations implemented, the system should handle production workloads efficiently while providing a smooth user experience.

**Risk Assessment:** Current implementation may experience performance degradation with concurrent users or large datasets. Recommended fixes should be prioritized before general availability release.
