# Gmail Ingestion Implementation Guide

## Overview

This document provides a comprehensive account of implementing Gmail data ingestion from raw emails through to structured data and embeddings in the OmniCRM application. The implementation includes debugging tools, production-ready endpoints, and a complete processing pipeline.

## Problem Statement

The original Gmail sync functionality was failing with PGRST204 errors when attempting to insert Gmail data into the `raw_events` table. The sync processor was using complex upsert operations that were incompatible with the database constraints and RLS policies.

## Root Cause Analysis

### Issues Identified

1. **PGRST204 Errors**: Service role client failing with "No Content" errors
2. **RLS Policy Conflicts**: `raw_events` table only allows SELECT for authenticated users
3. **Unique Constraint Issues**: Constraint `(user_id, provider, source_id)` causing conflicts
4. **Complex Sync Logic**: Over-engineered approach with filtering, batching, and upserts

### Database Configuration Analysis

- **Raw Events Table**: RLS enabled, only service role can INSERT/UPDATE
- **Unique Constraint**: `raw_events_uidx` on `(user_id, provider, source_id)`
- **pgvector Extension**: Located in `public` schema (should be `extensions` but has dependencies)

## Files Created/Modified

### Diagnostic Endpoints

#### `/src/app/api/debug/service-role-test/route.ts`

**Purpose**: Diagnose service role configuration and permissions
**Key Features**:

- Tests environment variables (SUPABASE_URL, SERVICE_KEY)
- Attempts insertions into `raw_events` and `interactions`
- Provides detailed error reporting
- Supports both GET and POST methods for browser testing

```typescript
// Key functionality
export async function GET(): Promise<Response> {
  return handleRequest();
}

export async function POST(): Promise<Response> {
  return handleRequest();
}
```

#### `/src/app/api/debug/raw-sql-insert/route.ts`

**Purpose**: Bypass Supabase client with direct PostgreSQL insertions
**Key Features**:

- Uses `pg` Pool for direct database access
- Implements `ON CONFLICT DO NOTHING` strategy
- Provides fallback when Supabase client fails
- Comprehensive error handling and logging

#### `/src/app/api/debug/raw-events-check/route.ts`

**Purpose**: Verify data in `raw_events` table
**Key Features**:

- Lists recent events by provider
- Counts events by type (Gmail, test, etc.)
- Extracts Gmail-specific metadata (subjects, IDs)
- Supports filtering and pagination

#### `/src/app/api/debug/fix-insert/route.ts`

**Purpose**: Test multiple insertion strategies to find working approach
**Key Features**:

- Strategy 1: Simple INSERT (no conflict handling)
- Strategy 2: Dynamic constraint name lookup and upsert
- Strategy 3: Check-then-insert (manual conflict avoidance)
- Determines which database insertion method works

### Gmail Processing Endpoints

#### `/src/app/api/debug/gmail-simple-insert/route.ts`

**Purpose**: Fetch and insert exactly 1 Gmail message using proven strategy
**Key Features**:

- Uses `getGoogleClients()` for OAuth authentication
- Fetches most recent Gmail message with full payload
- Uses simple INSERT strategy (proven to work)
- Comprehensive logging and error handling
- Returns email preview data for verification

```typescript
// Key Gmail API integration
const { gmail } = await getGoogleClients(userId);
const listResponse = await gmail.users.messages.list({
  userId: "me",
  maxResults: 1,
});
```

#### `/src/app/api/debug/process-gmail/route.ts`

**Purpose**: Extract structured data from Gmail raw_events
**Key Features**:

- Parses Gmail API payload (headers, body, attachments)
- Extracts subject, from, to, date, messageId
- Decodes base64url encoded body content
- Creates structured `interactions` records
- Handles duplicate detection and skipping

```typescript
// Gmail payload parsing
function extractEmailData(gmailPayload: GmailPayload): {
  subject: string | null;
  from: string | null;
  to: string | null;
  date: string | null;
  messageId: string | null;
  bodyText: string;
  gmailId: string | undefined;
  threadId: string | undefined;
  labelIds: string[];
}
```

#### `/src/app/api/debug/embed-gmail/route.ts`

**Purpose**: Generate embeddings for Gmail interactions with pgvector compatibility
**Key Features**:

- Tests pgvector extension availability and schema location
- Generates mock 1536-dimensional embeddings (replaceable with OpenAI)
- Handles both `public` and `extensions` schema locations
- Graceful fallback to metadata-only storage
- Multiple insertion strategies for compatibility

```typescript
// pgvector schema detection
async function testPgvectorCompatibility(pool: Pool): Promise<{ 
  available: boolean; 
  schema: string | null; 
  error: string | null 
}>
```

#### `/src/app/api/debug/pipeline-status/route.ts`

**Purpose**: Monitor complete pipeline status and provide recommendations
**Key Features**:

- Cross-references data across `raw_events` → `interactions` → `embeddings`
- Calculates completion percentages
- Provides actionable recommendations
- Shows pipeline health and bottlenecks

### Modified Core Files

#### `/src/server/db/supabase-admin.ts`

**Changes Made**:

- Added fallback mechanism for PGRST204 errors
- Simplified upsert configuration
- Enhanced error logging with detailed context
- Added try/catch with fallback to insert on upsert failure

```typescript
// Key improvement
try {
  const { data, error } = await supaAdmin
    .from(table)
    .upsert(values as never, { ignoreDuplicates: true })
    .select();
  
  if (error?.code === "PGRST204") {
    log.info({ op: "supa_admin_upsert_fallback", table }, "falling_back_to_insert");
    return await this.insert(table, values);
  }
} catch (error) {
  // Enhanced error handling
}
```

#### `/src/server/jobs/processors/sync.ts`

**Changes Made**:

- Implemented incremental Gmail sync with proper date formatting
- Changed from Unix timestamps to Gmail's `YYYY/MM/DD` format
- Enhanced progress tracking with `newEmails` counter
- Simplified upsert calls to use new admin client signature
- Added comprehensive logging for debugging

```typescript
// Gmail incremental sync
const gmailDateFormat = since.toISOString().split('T')[0]?.replace(/-/g, '/') ?? '';
const q = daysSinceLastSync <= 30 
  ? `${baseQuery} after:${gmailDateFormat}`
  : baseQuery;
```

#### `/src/server/jobs/processors/normalize.ts`

**Changes Made**:

- Updated upsert calls to match new admin client signature
- Simplified conflict handling
- Enhanced error reporting

#### `/src/server/jobs/_tests_/sync.test.ts`

**Changes Made**:

- Fixed test mocks to handle both `insert` and `upsert` operations
- Added `raw_events` table handling to mock upsert function
- Ensured test compatibility with new admin client behavior

#### UI Component Updates

#### `/src/app/(authorisedRoute)/settings/_components/GmailSyncStatusPanel.tsx`

**Changes Made**:

- Enhanced progress display with incremental sync status
- Added `newEmails` tracking and display
- Improved phase messaging for better user experience
- Added detailed progress steps visualization

```typescript
// Enhanced progress tracking
const phaseStatus = getSyncPhaseStatus(syncPhase);
const message = totalEmails > 0 
  ? `Checking ${emailsProcessed}/${totalEmails} emails • ${newEmails} new found`
  : `Checking for new Gmail messages...`;
```

## Implementation Strategy

### Phase 1: Problem Diagnosis ✅ COMPLETED

- Created comprehensive diagnostic endpoints
- Identified root causes of PGRST204 errors
- Tested multiple database insertion strategies
- Established working baseline with simple INSERT

### Phase 2: Gmail Data Ingestion ✅ COMPLETED  

- Implemented reliable Gmail message fetching
- Created structured data extraction pipeline
- Built embedding generation with pgvector compatibility
- Established monitoring and status checking

### Phase 3: Production Implementation (RECOMMENDED NEXT STEPS)

#### 3.1 Production Gmail Sync Service

```typescript
// Recommended: Create production-ready sync service
/src/server/services/gmail-sync.service.ts
- Implement batch processing with rate limiting
- Add proper error handling and retry logic  
- Use proven simple INSERT strategy from diagnostics
- Add comprehensive monitoring and alerting
```

#### 3.2 Real Embedding Integration

```typescript
// Replace mock embeddings with OpenAI
import OpenAI from 'openai';

async function generateRealEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0]?.embedding ?? [];
}
```

#### 3.3 UI/UX Production Implementation

**Settings Page Integration**:

```typescript
// /src/app/(authorisedRoute)/settings/gmail/page.tsx
- Gmail connection status
- Manual sync trigger
- Historical sync logs
- Error resolution guidance
```

**Dashboard Integration**:

```typescript
// /src/app/(authorisedRoute)/dashboard/_components/GmailInsights.tsx
- Recent emails summary
- AI-generated insights
- Contact extraction results
- Embedding-based email search
```

## Security Considerations

### Authentication & Authorization

- All endpoints require authentication via `getServerUserId()`
- Service role bypasses RLS only for approved tables (`ALLOWED_TABLES`)
- OAuth tokens encrypted with `APP_ENCRYPTION_KEY`
- Rate limiting should be implemented for production endpoints

### Data Privacy

- Gmail data stored in user-scoped tables with RLS
- Sensitive email content should be processed with care
- Consider data retention policies for raw email storage
- Implement GDPR-compliant data deletion

### API Security

```typescript
// Recommended middleware
/src/middleware/gmail-sync.ts
- Rate limiting: 10 requests/hour per user for manual sync
- Request size limits for email payloads
- Audit logging for all Gmail data operations
- Error sanitization to prevent data leaks
```

## Database Migration Requirements

### Required Schema Updates

```sql
-- 1. Fix pgvector extension location (optional)
-- Note: User reported dependencies prevent moving to extensions schema
-- Current location in 'public' schema is functional but not ideal

-- 2. Add indexes for Gmail processing performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS raw_events_gmail_source_id_idx
  ON public.raw_events (user_id, source_id)
  WHERE provider = 'gmail';

CREATE INDEX CONCURRENTLY IF NOT EXISTS interactions_gmail_source_idx  
  ON public.interactions (user_id, source_id, created_at DESC)
  WHERE source = 'gmail';

-- 3. Add RLS policy for service role writes (if needed)
-- Current setup allows service role to bypass RLS
```

### Data Cleanup Procedures

```sql
-- Clean up diagnostic/test data
DELETE FROM raw_events WHERE provider LIKE 'test%';
DELETE FROM interactions WHERE source = 'diagnostic';
DELETE FROM embeddings WHERE meta->>'mockEmbedding' = 'true';
```

## Testing Strategy

### Unit Testing

- Gmail payload parsing functions
- Embedding generation utilities  
- Database insertion strategies
- Error handling edge cases

### Integration Testing

```typescript
// /tests/integration/gmail-sync.test.ts
- End-to-end Gmail OAuth flow
- Complete pipeline: raw_events → interactions → embeddings
- Error recovery and retry mechanisms
- Performance under load
```

### E2E Testing

```typescript
// /e2e/gmail-ingestion.spec.ts
- User connects Gmail account
- Sync triggers and completes successfully
- Data appears in dashboard
- Search functionality works with embeddings
```

## Performance Considerations

### Batch Processing

- Process emails in chunks of 50 (current `GMAIL_CHUNK_DEFAULT`)
- Implement exponential backoff for API rate limits
- Use streaming for large Gmail accounts

### Database Optimization

- Proper indexing on frequently queried columns
- Regular VACUUM and ANALYZE on large tables
- Consider partitioning `raw_events` by date for large datasets

### Memory Management

```typescript
// Streaming approach for large batches
async function processGmailBatch(messageIds: string[]) {
  const batchSize = 10;
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    await processBatch(batch);
    // Allow garbage collection between batches
  }
}
```

## Monitoring & Observability

### Logging Strategy

- Structured logging with correlation IDs
- Performance metrics (emails/second, API latency)
- Error classification and alerting
- User-specific sync statistics

### Health Check Endpoints

```typescript
/api/health/gmail-sync
- Service role connectivity
- Gmail API rate limit status  
- Database performance metrics
- Recent sync success rates
```

### Alerting

- Failed syncs after retries
- Database connection issues
- Gmail API quota exhaustion
- Embedding generation failures

## Deployment Checklist

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
APP_ENCRYPTION_KEY=32-byte-base64-key
DATABASE_URL=postgresql://...

# Optional for embeddings
OPENAI_API_KEY=your-openai-key
```

### Pre-deployment Testing

1. Run all diagnostic endpoints to verify configuration
2. Test with real Gmail account in staging
3. Verify pgvector compatibility
4. Test error recovery scenarios
5. Performance test with large Gmail accounts

### Production Deployment Steps

1. Deploy diagnostic endpoints first (keep for troubleshooting)
2. Deploy core sync improvements
3. Deploy UI enhancements
4. Enable real embedding generation
5. Monitor for 24 hours before full rollout

## Troubleshooting Guide

### Common Issues

**PGRST204 Errors**:

- Check service role key is correct
- Verify RLS policies allow service role access
- Use diagnostic endpoints to test configuration

**Gmail API Errors**:

- Verify OAuth scopes include Gmail access
- Check API quota and rate limits
- Test with diagnostic Gmail endpoints first

**Embedding Issues**:

- Test pgvector compatibility endpoint
- Check if extension is in correct schema
- Use metadata-only fallback if needed

**Performance Issues**:

- Review batch sizes and processing chunks
- Check database indexes are present
- Monitor memory usage during large syncs

### Debug Endpoints (Keep in Production)

- `/api/debug/service-role-test` - Service role health
- `/api/debug/pipeline-status` - Processing pipeline status
- `/api/debug/raw-events-check` - Data verification

## Future Enhancements

### AI Features

- Intelligent email categorization
- Contact extraction and matching
- Email sentiment analysis
- Smart thread summarization

### Advanced Sync Features

- Real-time sync with webhooks
- Selective folder/label syncing
- Delta sync for large accounts
- Conflict resolution for concurrent updates

### Analytics Dashboard

- Sync performance metrics
- Email processing statistics
- AI insights effectiveness
- User engagement tracking

## Summary

This implementation provides a robust, debuggable Gmail ingestion system with:

✅ **Proven database insertion strategy** (simple INSERT with proper error handling)  
✅ **Complete processing pipeline** (raw_events → interactions → embeddings)  
✅ **pgvector compatibility** (handles schema location issues gracefully)  
✅ **Comprehensive diagnostics** (debugging endpoints for troubleshooting)  
✅ **Production-ready foundation** (authentication, logging, error handling)

The diagnostic endpoints should be retained in production as they provide invaluable troubleshooting capabilities. The core sync improvements can be rolled out incrementally, starting with the proven insertion strategies and building up to full AI-powered email analysis.

**Next Developer**: Start by running `/api/debug/pipeline-status` to understand the current state, then follow the Phase 3 implementation plan above for production rollout.
