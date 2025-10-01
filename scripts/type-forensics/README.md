# Type Forensics System

Complete forensic analysis of TypeScript types in the codebase.

## Quick Start

Run the full audit suite:

```bash
pnpm tsx scripts/type-forensics/run-audit.ts
```

This will:
1. Collect all type definitions (961 types found)
2. Trace usage patterns (identifies dead code)
3. Detect duplicates (find duplicate groups)
4. Classify origins (database vs fictional)
5. Generate comprehensive report

**Output**: `docs/type-audit/TYPE-AUDIT-REPORT.md`

## Individual Scripts

Run scripts individually if needed:

### 1. Collect Types
```bash
pnpm tsx scripts/type-forensics/collect-all-types.ts
```
Output: `docs/type-audit/types-inventory.json`

### 2. Trace Usage
```bash
pnpm tsx scripts/type-forensics/trace-usage.ts
```
Output: `docs/type-audit/types-usage.json`

### 3. Detect Duplicates
```bash
pnpm tsx scripts/type-forensics/detect-duplicates.ts
```
Output: `docs/type-audit/types-duplicates.json`

### 4. Classify Origins
```bash
pnpm tsx scripts/type-forensics/classify-origins.ts
```
Output: `docs/type-audit/types-origins.json`

### 5. Generate Report
```bash
pnpm tsx scripts/type-forensics/generate-report.ts
```
Output: `docs/type-audit/TYPE-AUDIT-REPORT.md`

## Understanding the Data

### types-inventory.json
Complete list of all types with location, kind, and metadata.

**Key fields**:
- `name`: Type name
- `file`: Location
- `category`: database, business-schema, repository, component, etc.
- `exported`: Whether it's exported
- `fields`: Property names

### types-usage.json
Usage statistics for each exported type.

**Key fields**:
- `usageCount`: Number of files importing this type
- `isDeadCode`: True if never imported
- `importedBy`: List of files using this type

### types-duplicates.json
Groups of types with similar names.

**Key fields**:
- `baseName`: Normalized type name
- `variants`: Different versions of the same concept
- `recommendation`: MERGE, DELETE, RENAME, or KEEP

### types-origins.json
Classification of type origins.

**Key fields**:
- `origin`: database-table, computed, fictional, etc.
- `confidence`: 0-1 score
- `evidence`: What led to this classification

### TYPE-AUDIT-REPORT.md
Human-readable summary with:
- Executive summary
- Critical issues (dead code, duplicates)
- Detailed analysis of top problems
- Action plan with priorities
- Statistics and metrics

## Typical Workflow

1. **Run audit**:
   ```bash
   pnpm tsx scripts/type-forensics/run-audit.ts
   ```

2. **Review report**:
   Open `docs/type-audit/TYPE-AUDIT-REPORT.md`

3. **Make decisions**:
   For each duplicate group, decide:
   - Keep which variant?
   - Merge others into it?
   - Rename conflicts?
   - Delete unused?

4. **Execute cleanup** (coming soon):
   ```bash
   pnpm tsx scripts/type-forensics/execute-cleanup.ts
   ```

## Key Findings (Current Codebase)

- **961 total types** across 574 files
- **352 dead code types** (66.4%) - never imported
- **121 duplicate groups** (33.7% of types)
- **615 fictional types** (64%) - no clear database connection

## Recommendations

### Immediate (Low Risk)
- Delete 352 dead code types
- Saves ~7,000 lines of code
- Zero risk (no usages)

### Week 1 (Low-Medium Risk)
- Merge 43+ duplicate groups
- Consolidate aliases (ContactDTO → Contact)
- Rename conflicts (omni-rhythm Contact → RhythmContact)

### Week 2 (Manual Review)
- Review 615 fictional types
- Identify incomplete features
- Delete or complete them

## Technical Details

Built with:
- **ts-morph**: TypeScript AST parsing
- **Node.js**: Script runtime
- **TypeScript**: Type-safe scripts

Requirements:
- Node.js 18+
- pnpm
- TypeScript project with tsconfig.json

## Maintenance

Re-run the audit periodically:
- After major refactors
- Before releases
- Monthly health check

## Support

For issues or questions:
1. Check script output for errors
2. Review generated JSON files
3. Check file paths in tsconfig.json
4. Ensure all dependencies installed