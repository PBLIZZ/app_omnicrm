/**
 * Type Forensics: Generate Report
 *
 * Combines all forensic data into human-readable markdown
 */

import * as fs from "fs";
import * as path from "path";

interface TypeInventory {
  types: Array<{ name: string; file: string; category: string }>;
  byCategory: Record<string, number>;
}

interface TypeUsage {
  usageByType: Record<string, { usageCount: number; definedIn: string; isDeadCode: boolean }>;
  deadCodeCount: number;
  lowUsageCount: number;
}

interface Duplicates {
  duplicateGroups: Array<{
    baseName: string;
    count: number;
    totalUsages: number;
    variants: Array<{
      name: string;
      file: string;
      line: number;
      role: string;
      usageCount: number;
      recommendation: string;
      structuralSimilarity?: number;
    }>;
  }>;
}

interface Origins {
  byOrigin: Record<string, number>;
  origins: Record<string, { origin: string; confidence: number; notes?: string }>;
}

function loadData() {
  const basePath = path.resolve(process.cwd(), "docs/type-audit");

  return {
    inventory: JSON.parse(fs.readFileSync(`${basePath}/types-inventory.json`, "utf-8")) as TypeInventory,
    usage: JSON.parse(fs.readFileSync(`${basePath}/types-usage.json`, "utf-8")) as TypeUsage,
    duplicates: JSON.parse(fs.readFileSync(`${basePath}/types-duplicates.json`, "utf-8")) as Duplicates,
    origins: JSON.parse(fs.readFileSync(`${basePath}/types-origins.json`, "utf-8")) as Origins,
  };
}

function generateReport(): string {
  const data = loadData();
  const now = new Date().toISOString().split("T")[0];

  let report = `# Type System Forensic Audit Report

**Generated**: ${now}
**Codebase**: OmniCRM

---

## 📊 Executive Summary

- **Total Types Found**: ${data.inventory.types.length}
- **Exported Types**: ${Object.keys(data.usage.usageByType).length}
- **Types with Usage**: ${Object.keys(data.usage.usageByType).length - data.usage.deadCodeCount} (${(((Object.keys(data.usage.usageByType).length - data.usage.deadCodeCount) / Object.keys(data.usage.usageByType).length) * 100).toFixed(1)}%)
- **Dead Code**: ${data.usage.deadCodeCount} types (${((data.usage.deadCodeCount / Object.keys(data.usage.usageByType).length) * 100).toFixed(1)}%)
- **Duplicate Groups**: ${data.duplicates.duplicateGroups.length}
- **Duplicated Types**: ${data.duplicates.duplicateGroups.reduce((sum, g) => sum + g.count, 0)} (${((data.duplicates.duplicateGroups.reduce((sum, g) => sum + g.count, 0) / data.inventory.types.length) * 100).toFixed(1)}%)

---

## 🎯 Key Findings

### 1. Massive Dead Code Problem
**${data.usage.deadCodeCount} types (${((data.usage.deadCodeCount / Object.keys(data.usage.usageByType).length) * 100).toFixed(1)}%)** are exported but never imported anywhere.

**Impact**: Removing dead code could eliminate ~${Math.round(data.usage.deadCodeCount * 20)} lines of type definitions.

### 2. Significant Duplication
**${data.duplicates.duplicateGroups.length} groups** of duplicate types affecting **${data.duplicates.duplicateGroups.reduce((sum, g) => sum + g.count, 0)} type definitions**.

**Top duplicates**:
${data.duplicates.duplicateGroups
  .slice(0, 5)
  .map((g, i) => `${i + 1}. **${g.baseName}**: ${g.count} variants, ${g.totalUsages} total usages`)
  .join("\n")}

### 3. Unclear Type Origins
**${data.origins.byOrigin["fictional"] ?? 0} types (${((data.origins.byOrigin["fictional"]! / data.inventory.types.length) * 100).toFixed(1)}%)** have no clear database connection or purpose.

---

## 🔴 CRITICAL: Dead Code to Delete

The following ${Math.min(20, data.usage.deadCodeCount)} types are exported but have **zero usages**:

${Object.entries(data.usage.usageByType)
  .filter(([, u]) => u.isDeadCode)
  .slice(0, 20)
  .map(([name, u]) => `- \`${name}\` (${u.definedIn})`)
  .join("\n")}

${data.usage.deadCodeCount > 20 ? `\n... and ${data.usage.deadCodeCount - 20} more (see types-usage.json)` : ""}

**Recommendation**: Delete all dead code types (automated script available)

---

## 🟠 HIGH PRIORITY: Duplicate Groups

${data.duplicates.duplicateGroups.slice(0, 10).map((group) => {
  const header = `### ${group.baseName} (${group.count} variants, ${group.totalUsages} total usages)`;
  const variants = group.variants.map((v) => {
    const simText = v.structuralSimilarity ? ` - ${(v.structuralSimilarity * 100).toFixed(0)}% structurally similar` : "";
    return `
**${v.name}** (${v.file}:${v.line})
- Role: ${v.role}
- Usage: ${v.usageCount} files${simText}
- **Action**: ${v.recommendation}
`;
  }).join("\n");

  return `${header}\n${variants}\n**DECISION NEEDED**: Approve merge/rename/delete actions above\n`;
}).join("\n---\n\n")}

${data.duplicates.duplicateGroups.length > 10 ? `\n... and ${data.duplicates.duplicateGroups.length - 10} more groups (see types-duplicates.json)` : ""}

---

## 🟡 REVIEW NEEDED: Questionable Types

### Fictional Types (No Clear Purpose)

These types have no clear database connection:

${Object.entries(data.origins.origins)
  .filter(([, o]) => o.origin === "fictional")
  .slice(0, 15)
  .map(([name, o]) => {
    const usage = data.usage.usageByType[name];
    const usageText = usage ? `${usage.usageCount} usages` : "not exported";
    return `- \`${name}\` - ${usageText}${o.notes ? ` (${o.notes})` : ""}`;
  })
  .join("\n")}

${Object.entries(data.origins.origins).filter(([, o]) => o.origin === "fictional").length > 15 ? `\n... and ${Object.entries(data.origins.origins).filter(([, o]) => o.origin === "fictional").length - 15} more` : ""}

**Questions to Answer**:
1. Is this type part of an incomplete feature?
2. Can this be derived from existing database types?
3. Should this be deleted?

---

## 📈 Statistics by Category

| Category | Count | % of Total | Dead Code | Avg Usage |
|----------|-------|------------|-----------|-----------|
${Object.entries(data.inventory.byCategory)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, count]) => {
    const pct = ((count / data.inventory.types.length) * 100).toFixed(1);
    const categoryTypes = data.inventory.types.filter((t) => t.category === cat).map((t) => t.name);
    const deadCount = categoryTypes.filter((name) => data.usage.usageByType[name]?.isDeadCode).length;
    const avgUsage = categoryTypes
      .map((name) => data.usage.usageByType[name]?.usageCount ?? 0)
      .reduce((sum, u) => sum + u, 0) / categoryTypes.length;

    return `| ${cat} | ${count} | ${pct}% | ${deadCount} | ${avgUsage.toFixed(1)} |`;
  })
  .join("\n")}

---

## 📈 Statistics by Origin

| Origin | Count | % of Total |
|--------|-------|------------|
${Object.entries(data.origins.byOrigin)
  .sort(([, a], [, b]) => b - a)
  .map(([origin, count]) => {
    const pct = ((count / data.inventory.types.length) * 100).toFixed(1);
    return `| ${origin} | ${count} | ${pct}% |`;
  })
  .join("\n")}

---

## 🚀 Recommended Action Plan

### Phase 1: Safe Deletions (Immediate - Low Risk)
**Target**: ${data.usage.deadCodeCount} dead code types
**Impact**: Removes ~${Math.round(data.usage.deadCodeCount * 20)} lines of unused code
**Risk**: NONE (zero usages detected)
**Time**: 30 minutes (automated script)
**Script**: \`pnpm tsx scripts/type-forensics/execute-cleanup.ts --delete-dead-code\`

### Phase 2: Duplicate Merges (Week 1 - Low-Medium Risk)
**Target**: ${data.duplicates.duplicateGroups.filter((g) => g.variants.some((v) => v.recommendation.includes("MERGE"))).length} duplicate groups
**Impact**: Consolidates ${data.duplicates.duplicateGroups.reduce((sum, g) => sum + g.variants.filter((v) => v.recommendation.includes("MERGE")).length, 0)} duplicate definitions
**Risk**: LOW (mechanical refactor)
**Time**: 2-4 hours (semi-automated)
**Requires**: Human review of merge decisions

### Phase 3: Type Renames (Week 1 - Medium Risk)
**Target**: ${data.duplicates.duplicateGroups.filter((g) => g.variants.some((v) => v.recommendation.includes("RENAME"))).length} naming conflicts
**Impact**: Clarifies purpose of similar types
**Risk**: MEDIUM (semantic changes)
**Time**: 2 hours
**Requires**: Manual review

### Phase 4: Fictional Type Review (Week 2 - High Priority)
**Target**: ${Object.entries(data.origins.origins).filter(([, o]) => o.origin === "fictional").length} types with unclear purpose
**Impact**: Identifies incomplete features, removes cruft
**Risk**: MEDIUM (feature decisions)
**Time**: 3-4 hours (manual review)
**Requires**: Developer knowledge of features

---

## 💾 Data Files

All raw data is available in JSON format:

- [types-inventory.json](./types-inventory.json) - Complete type inventory (${data.inventory.types.length} types)
- [types-usage.json](./types-usage.json) - Usage statistics
- [types-duplicates.json](./types-duplicates.json) - Duplicate analysis (${data.duplicates.duplicateGroups.length} groups)
- [types-origins.json](./types-origins.json) - Origin classification

---

## 🎯 Success Metrics

After cleanup, target state:

- ✅ **Zero dead code** (currently ${data.usage.deadCodeCount})
- ✅ **<5 duplicate groups** (currently ${data.duplicates.duplicateGroups.length})
- ✅ **<10% fictional types** (currently ${((data.origins.byOrigin["fictional"]! / data.inventory.types.length) * 100).toFixed(1)}%)
- ✅ **Clear purpose for every type** (documented in code)

**Estimated LOC reduction**: ${Math.round(data.usage.deadCodeCount * 20 + data.duplicates.duplicateGroups.reduce((sum, g) => sum + g.count - 1, 0) * 15)} lines (20-25%)

---

## 📝 Next Steps

1. **Review this report** and mark decisions
2. **Run Phase 1** (delete dead code)
3. **Review duplicate groups** and approve merges
4. **Execute Phase 2** (merge duplicates)
5. **Review fictional types** individually
6. **Run validation** (\`pnpm typecheck\`)

---

*Generated by Type Forensics System*
`;

  return report;
}

async function main() {
  console.log("🔬 Type Forensics: Generating Report\n");
  console.log("=".repeat(50) + "\n");

  try {
    console.log("📖 Generating comprehensive report...\n");
    const report = generateReport();

    const outputPath = path.resolve(process.cwd(), "docs/type-audit/TYPE-AUDIT-REPORT.md");
    fs.writeFileSync(outputPath, report, "utf-8");

    console.log("=".repeat(50));
    console.log("✅ Report Generated!\n");
    console.log("📄 Review your audit report:");
    console.log(`   ${outputPath}\n`);
    console.log("🎯 Next steps:");
    console.log("   1. Open the report and review findings");
    console.log("   2. Make decisions on duplicate groups");
    console.log("   3. Create decisions.json file");
    console.log("   4. Run cleanup scripts\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();