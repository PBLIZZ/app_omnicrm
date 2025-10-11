# Type System Audit - Getting Started

## What We Built

A complete forensic analysis system that scans your entire codebase and generates actionable data about all TypeScript types.

## The Problem We're Solving

Your codebase has **type proliferation** - multiple definitions of similar types, dead code, unclear purposes. Before refactoring, we need to understand **what exists and why**.

## Quick Start (5 minutes)

### Step 1: Run the Audit

```bash
pnpm tsx scripts/type-forensics/run-audit.ts
```

This takes ~20 seconds and generates all analysis files.

### Step 2: Read the Report

```bash
open docs/type-audit/TYPE-AUDIT-REPORT.md
```

Or in your editor, open:
`docs/type-audit/TYPE-AUDIT-REPORT.md`

## What You'll Find

### 🔴 Critical: Dead Code (352 types)

**Problem**: 66.4% of exported types are never imported anywhere.

**Example**:
```typescript
// src/lib/api/contacts-api.ts:43
export type ApiBulkDeleteResponse = { deleted: number };
// ☠️ Zero usages - safe to delete
```

**Action**: Review dead code list, confirm deletions

### 🟠 High Priority: Duplicates (121 groups)

**Problem**: Same concept defined multiple times

**Example**: "Contact" type
```typescript
// Variant 1: schema.ts (47 usages) ✅ KEEP
export type Contact = typeof contacts.$inferSelect;

// Variant 2: contacts.repo.ts (12 usages) ⚠️ MERGE
export type ContactDTO = Contact;  // Unnecessary alias

// Variant 3: omni-rhythm/types.ts (3 usages) ⚠️ RENAME
export interface Contact {  // Different entity!
  id: string;
  name: string;
  totalSessions: number;
}
```

**Action**: Decide which to keep, which to merge/rename/delete

### 🟡 Review Needed: Fictional Types (615 types)

**Problem**: No clear database connection or purpose

**Example**:
```typescript
// src/server/ai/contacts/types.ts:45
export interface EmailSuggestion {
  contactId: string;
  subject: string;
  body: string;
  // ... more fields
}
// Used in 2 files, but feature is incomplete
```

**Questions**:
1. Is this part of an abandoned feature?
2. Should we complete it?
3. Or delete it?

**Action**: Review each fictional type individually

## Understanding the Data

### Raw Data Files (JSON)

All in `docs/type-audit/`:

1. **types-inventory.json** - Every type definition (961 total)
2. **types-usage.json** - Import tracking (who uses what)
3. **types-duplicates.json** - Duplicate groups (121 found)
4. **types-origins.json** - Database vs fictional classification

### Human-Readable Report (Markdown)

**TYPE-AUDIT-REPORT.md** - Comprehensive analysis with:
- Executive summary
- Critical issues with examples
- Detailed duplicate group analysis
- Action plan with priorities
- Statistics and metrics

## Making Decisions

### For Dead Code

✅ **Safe to delete** if:
- Zero usages detected
- Not a public API type
- Not referenced in comments/docs

Example decision:
```json
{
  "deadCode": {
    "ApiBulkDeleteResponse": "delete",
    "AdminAllowedTable": "delete"
  }
}
```

### For Duplicates

Ask yourself:

1. **Which is the source of truth?**
   - Usually: database schema (schema.ts)

2. **What are the others?**
   - Alias? → MERGE into source
   - Redefinition? → RENAME if different entity
   - Legacy? → DELETE and replace

3. **What's the impact?**
   - Check usage count
   - Review affected files

Example decision:
```json
{
  "duplicates": {
    "Contact": {
      "ContactDTO": "merge",
      "omni-rhythm-Contact": "rename:RhythmContact",
      "Client": "delete"
    }
  }
}
```

### For Fictional Types

Ask yourself:

1. **What feature is this for?**
   - Look at file location
   - Check components using it
   - Search for API routes

2. **Is the feature complete?**
   - Component rendered? NO → Incomplete
   - API route exists? NO → Incomplete
   - Button to trigger? NO → Incomplete

3. **What's the plan?**
   - Complete it? (estimate time)
   - Delete it? (save LOC)
   - Defer? (create issue)

Example decision:
```json
{
  "fictional": {
    "EmailSuggestion": {
      "action": "delete",
      "reason": "incomplete feature, no API route"
    }
  }
}
```

## Example Workflow

### Morning: Run Audit (5 min)
```bash
pnpm tsx scripts/type-forensics/run-audit.ts
```

### Morning: Initial Review (30 min)
1. Read TYPE-AUDIT-REPORT.md
2. Note surprising findings
3. Mark obvious decisions

### Afternoon: Deep Dive (2 hours)
1. Review top 10 duplicate groups
2. Check each fictional type
3. Trace incomplete features
4. Document decisions

### Next Day: Execute (automated)
```bash
# Coming soon: cleanup script
pnpm tsx scripts/type-forensics/execute-cleanup.ts
```

## What Happens After Cleanup

### Metrics

**Before**:
- 961 types
- 352 dead (66.4%)
- 121 duplicate groups

**After** (estimated):
- ~550 types (-43%)
- 0 dead (0%)
- <5 duplicate groups (-96%)

### Code Impact

- **Removed**: ~7,000 lines of type definitions
- **Consolidated**: ~2,000 lines of duplicates
- **Cleaner**: Every type has clear purpose
- **Maintainable**: Future changes easier

## Next Steps

1. ✅ **Read the report** (you are here)
2. ⬜ **Make decisions** on duplicates/fictional types
3. ⬜ **Create decisions.json** (or mark in report)
4. ⬜ **Run cleanup** (automated, coming soon)
5. ⬜ **Validate** (`pnpm typecheck`)

## Questions?

### "How do I know what's safe to delete?"

Check usage count. Zero usages = safe.

### "What if I delete something important?"

All changes are in git. Easy to rollback.

### "Can I run the audit again later?"

Yes! Run anytime. Takes ~20 seconds.

### "What about types in comments or strings?"

The audit finds actual imports. Review manually if concerned.

### "Should I do this all at once?"

No. Start with dead code (safest), then duplicates, then fictional types.

## Tips

✅ **DO**:
- Review the full report first
- Start with dead code (lowest risk)
- Check git history for context
- Run `pnpm typecheck` after changes

❌ **DON'T**:
- Delete types with usages
- Merge structurally different types
- Rush the fictional type review
- Skip validation

## Success Criteria

After cleanup, you should have:

✅ Clear purpose for every type
✅ Zero dead code
✅ <5 duplicate groups
✅ <10% fictional types
✅ All tests passing
✅ Clean `pnpm typecheck`

---

**Ready?** Open `TYPE-AUDIT-REPORT.md` and start reviewing!