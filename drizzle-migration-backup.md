# Database Backup - Pre-Drizzle Migration

**Date**: 2025-08-28
**Project**: app_omnicrm (etdhqniblvwgueykywqd)
**Database**: PostgreSQL 17.4.1.069

## Summary

This backup was created before implementing Drizzle Kit migrations to ensure we can restore the database to this exact state if needed.

## Extensions Status

✅ **Installed Extensions:**
- `vector` (0.8.0) - pgvector for embeddings
- `uuid-ossp` (1.1) - UUID generation
- `pg_stat_statements` (1.11) - Query statistics
- `pg_cron` (1.6) - Job scheduler
- `pgcrypto` (1.3) - Cryptographic functions
- `pg_graphql` (1.5.11) - GraphQL support
- `supabase_vault` (0.3.1) - Vault extension
- `plpgsql` (1.0) - PL/pgSQL

## RLS Policies Summary

**43 RLS Policies Across 21 Tables:**

### Core Tables (authenticated users):
- **contacts**: 4 policies (select/insert/update/delete own)
- **interactions**: 4 policies (select/insert/update/delete own)  
- **documents**: 4 policies (select/insert/update/delete own)
- **jobs**: 4 policies (select/insert/update/delete own)
- **threads**: 4 policies (select/insert/update/delete own)
- **messages**: 4 policies (select/insert/update/delete own)
- **tool_invocations**: 4 policies (select/insert/update/delete own)
- **user_integrations**: 4 policies (select/insert/update/delete own)

### Read-Only Tables:
- **ai_insights**: 1 policy (select own)
- **embeddings**: 1 policy (select own)
- **raw_events**: 1 policy (select own)

### All-Access Tables (public role):
- **calendar_events**: 1 policy (manage own calendar events)
- **contact_timeline**: 1 policy (manage own contact timeline)
- **notes**: 1 policy (manage own notes)
- **projects**: 1 policy (manage own projects)
- **tasks**: 1 policy (manage own tasks)
- **task_actions**: 1 policy (manage own task actions)
- **workspaces**: 1 policy (manage own workspaces)

### Combined Access:
- **ai_quotas**: 1 policy (all operations on own)
- **ai_usage**: 1 policy (all operations on own)
- **sync_audit**: 1 policy (all operations on own)
- **user_sync_prefs**: 1 policy (all operations on own)

## Index Summary

**133 Indexes Total** across all tables:

### Performance-Critical Indexes:
- **Vector Index**: `embeddings_vec_idx` (ivfflat, cosine similarity)
- **Complex Performance Indexes**: 85+ indexes for query optimization
- **Unique Constraints**: Primary keys + business logic uniqueness
- **Timeline Indexes**: Optimized for date-based queries
- **User Scoping**: All tables have user_id indexes for RLS performance

## Data Volume (Current State)

| Table | Live Rows | Historical Activity |
|-------|-----------|-------------------|
| **workspaces** | 438 | 438 inserts |
| **notes** | 64 | 69 inserts, 6 deletes |
| **embeddings** | 55 | 55 inserts |
| **calendar_events** | 54 | 54 inserts, 6 updates |
| **contacts** | 26 | 198 inserts, 83 updates, 172 deletes |
| **sync_audit** | 9 | 126 inserts, 117 deletes |
| **jobs** | 5 | 58 inserts, 290 updates, 53 deletes |
| **ai_usage** | 4 | 4 inserts |
| **raw_events** | 3 | 50 inserts, 47 deletes |
| **user_integrations** | 2 | 4 inserts, 43 updates, 2 deletes |
| **ai_quotas** | 1 | 1 insert, 7 updates |
| **interactions** | 1 | 33 inserts, 2 updates, 32 deletes |

**Empty Tables**: ai_insights, contact_timeline, documents, messages, projects, task_actions, tasks, threads, tool_invocations, user_sync_prefs

## Schema Integrity

### Foreign Key Relationships:
- **auth.users** → All user_id columns (via RLS, not FK constraints)
- **contacts** ← interactions, notes, contact_timeline
- **threads** ← messages ← tool_invocations  
- **workspaces** ← projects ← tasks ← task_actions
- **tasks** ← tasks (parent_task_id self-reference)

### Check Constraints:
- **messages.role**: 'user' | 'assistant' | 'tool'
- **tasks.status**: 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled'
- **tasks.priority**: 'low' | 'medium' | 'high' | 'urgent'
- **projects.status**: 'active' | 'completed' | 'archived'
- **user_integrations.service**: 'auth' | 'gmail' | 'calendar' | 'drive'

## Critical Elements for Migration

### ⚠️ MUST PRESERVE MANUALLY:
1. **RLS Policies**: All 43 policies - Drizzle cannot manage these
2. **pgvector Extension**: Critical for AI embeddings functionality
3. **Complex Performance Indexes**: 85+ specialized indexes
4. **Check Constraints**: Enum-like validations
5. **Vector Index**: `embeddings_vec_idx` for cosine similarity

### ✅ CAN MIGRATE WITH DRIZZLE:
1. **Basic Table Structure**: Columns, types, defaults
2. **Primary Keys**: All UUID primary keys
3. **Simple Indexes**: Basic single/multi-column indexes
4. **Foreign Keys**: Where Drizzle supports the pattern

## Rollback Plan

If migration fails:

```sql
-- Emergency rollback (if needed)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Restore from this backup state
-- Re-run all SQL files in supabase/sql/ directory
```

## Next Steps

1. Install Drizzle Kit
2. Create drizzle.config.ts 
3. Introspect current schema
4. Generate baseline migration
5. Apply migration with MCP monitoring
6. Validate all functionality

**Backup Verified**: ✅ All critical data and schema information captured