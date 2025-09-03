# Live Database vs schema.ts Comparison

**Date**: 2025-08-28

## Critical Discrepancies Found

### ✅ MATCHES (Good):

- All core table structures match
- Primary key patterns consistent (UUID with gen_random_uuid())
- Basic column types and nullability align
- JSONB columns properly typed

### ⚠️ MAJOR DISCREPANCIES:

#### 1. **Missing Table in schema.ts**: `notes`

**Live DB Has**:

```sql
notes (id, contact_id, user_id, title, content, created_at, updated_at)
```

**schema.ts**: ✅ Has this table - GOOD

#### 2. **Missing Columns in Live DB**:

**calendar_events missing fields:**

- `calendar_id` (in schema.ts but not in live DB)
- `time_zone` (in schema.ts but not in live DB)
- `is_all_day` (in schema.ts but not in live DB)
- `recurring` (in schema.ts but not in live DB)
- `recurrence_rule` (in schema.ts but not in live DB)
- `visibility` (in schema.ts but not in live DB)
- `event_type` (in schema.ts but not in live DB)
- `capacity` (in schema.ts but not in live DB)
- `actual_attendance` (in schema.ts but not in live DB)
- `embeddings` (in schema.ts but not in live DB)
- `keywords` (in schema.ts but not in live DB)
- `business_category` (in schema.ts but not in live DB)
- `last_synced` (in schema.ts but not in live DB)
- `google_updated` (in schema.ts but not in live DB)

**contact_timeline missing fields:**

- `event_id` (in schema.ts, references calendar_events)
- `duration` (in schema.ts but not in live DB)
- `attendance_status` (in schema.ts but not in live DB)
- `metadata` (in schema.ts but not in live DB)
- `confidence` (in schema.ts but not in live DB)
- `source` (in schema.ts but not in live DB)

#### 3. **Data Type Mismatches**:

**contacts.confidence_score**:

- Live DB: `text`
- schema.ts: `numeric(3,2)`

**contacts missing field**:

- Live DB: Missing `notes` field
- schema.ts: Has `notes: text` field

#### 4. **Missing Foreign Key References**:

Live DB shows actual FK relationships that schema.ts doesn't model:

- `contact_timeline_contact_id_fkey` → contacts(id)
- `notes_contact_id_fkey` → contacts(id)
- Many others properly defined in live DB

## Root Cause Analysis

The **schema.ts file is AHEAD of the live database**. This suggests:

1. **Recent schema.ts updates** haven't been applied to live DB
2. **Missing migrations** for calendar_events enhancements
3. **Missing migrations** for contact_timeline enhancements
4. **contacts.notes field** was added to schema.ts but not migrated
5. **confidence_score type change** not applied

## Migration Strategy Impact

This is **PERFECT for Drizzle migration**! Here's why:

### ✅ Drizzle Will Handle:

- **Adding missing columns** to calendar_events (13+ new fields)
- **Adding missing columns** to contact_timeline (6+ new fields)
- **Adding contacts.notes field**
- **Changing confidence_score from text to numeric**
- **Updating foreign key relationships**

### ⚠️ Manual SQL Still Required:

- **RLS policies** for new columns/relationships
- **Indexes** for new fields (performance)
- **pgvector functionality** (extensions)

## Recommended Approach

1. **Let Drizzle generate the migration** - it will catch all these differences
2. **Review generated SQL carefully** - ensure it matches expectations
3. **Apply via MCP with monitoring** - safe, traceable execution
4. **Add manual RLS policies** for new fields after migration
5. **Add performance indexes** for new columns manually

## Benefits

✅ **Brings live DB up to current schema.ts**  
✅ **Adds all missing enhancements** (calendar features, timeline features)
✅ **Fixes data type inconsistencies**
✅ **Maintains all existing data** (additive changes only)
✅ **Perfect test case** for Drizzle's introspection capabilities

This discrepancy actually makes Drizzle migration MORE valuable - it will automatically sync your database to match your latest schema definitions!
