/**
 * Type Forensics: Detect Duplicates
 *
 * Find types with same/similar names or structure
 * Provide recommendations for merging
 */

import * as fs from "fs";
import * as path from "path";

interface TypeDefinition {
  id: string;
  name: string;
  file: string;
  line: number;
  code: string;
  fields: string[];
  category: string;
}

interface TypeUsage {
  usageCount: number;
  definedIn: string;
}

interface DuplicateVariant {
  name: string;
  file: string;
  line: number;
  role: "source-of-truth" | "alias" | "redefinition" | "legacy-alias";
  usageCount: number;
  structure: string;
  structuralSimilarity?: number;
  recommendation: string;
}

interface DuplicationGroup {
  baseName: string;
  count: number;
  totalUsages: number;
  variants: DuplicateVariant[];
}

interface DuplicatesOutput {
  generatedAt: string;
  totalTypes: number;
  duplicateGroupsCount: number;
  totalDuplicates: number;
  duplicateGroups: DuplicationGroup[];
}

function normalizeTypeName(name: string): string {
  // Remove common suffixes/prefixes
  return name
    .replace(/DTO$/, "")
    .replace(/Type$/, "")
    .replace(/Interface$/, "")
    .replace(/Schema$/, "")
    .replace(/^I/, ""); // Interface prefix
}

function calculateStructuralSimilarity(fields1: string[], fields2: string[]): number {
  if (fields1.length === 0 && fields2.length === 0) return 1.0;
  if (fields1.length === 0 || fields2.length === 0) return 0.0;

  const set1 = new Set(fields1);
  const set2 = new Set(fields2);
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

function determineRole(variant: {
  name: string;
  file: string;
  code: string;
  usageCount: number;
  category: string;
}): DuplicateVariant["role"] {
  // Check if it's an alias (type X = Y)
  if (variant.code.includes("=") && !variant.code.includes("{")) {
    if (variant.name.includes("Client") || variant.file.includes("legacy")) {
      return "legacy-alias";
    }
    return "alias";
  }

  // Check if it's from database schema
  if (variant.category === "database" || variant.file.includes("/db/schema.ts")) {
    return "source-of-truth";
  }

  // Check if it's a repo DTO
  if (variant.category === "repository" && variant.name.endsWith("DTO")) {
    return "alias";
  }

  // Otherwise it's a redefinition
  return "redefinition";
}

function getRecommendation(variant: DuplicateVariant, group: { sourceOfTruth?: string }): string {
  switch (variant.role) {
    case "alias":
      if (variant.usageCount === 0) {
        return "DELETE - unused alias";
      }
      return `MERGE into ${group.sourceOfTruth ?? "source type"}`;
    case "legacy-alias":
      return "DELETE and replace with modern type";
    case "redefinition":
      if (variant.structuralSimilarity && variant.structuralSimilarity < 0.3) {
        return "RENAME - different entity with same name";
      }
      return "REVIEW - may need merge or rename";
    case "source-of-truth":
      return "KEEP - this is the canonical definition";
    default:
      return "REVIEW";
  }
}

async function detectDuplicates(): Promise<DuplicatesOutput> {
  console.log("🔍 Loading type data...\n");

  // Load inventory and usage
  const inventoryPath = path.resolve(process.cwd(), "docs/type-audit/types-inventory.json");
  const usagePath = path.resolve(process.cwd(), "docs/type-audit/types-usage.json");

  if (!fs.existsSync(inventoryPath) || !fs.existsSync(usagePath)) {
    throw new Error("Run collect-all-types.ts and trace-usage.ts first");
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf-8"));
  const usage: { usageByType: Record<string, TypeUsage> } = JSON.parse(
    fs.readFileSync(usagePath, "utf-8"),
  );

  console.log(`📦 Loaded ${inventory.types.length} types\n`);
  console.log("🔍 Detecting duplicates...\n");

  // Group types by normalized name
  const typesByNormalizedName = new Map<string, TypeDefinition[]>();

  inventory.types.forEach((type: TypeDefinition) => {
    const normalized = normalizeTypeName(type.name);
    if (!typesByNormalizedName.has(normalized)) {
      typesByNormalizedName.set(normalized, []);
    }
    typesByNormalizedName.get(normalized)!.push(type);
  });

  // Find groups with multiple variants
  const duplicateGroups: DuplicationGroup[] = [];

  typesByNormalizedName.forEach((variants, baseName) => {
    if (variants.length > 1) {
      const groupVariants: DuplicateVariant[] = [];
      let sourceOfTruth: string | undefined;

      // First pass: determine roles
      variants.forEach((variant) => {
        const usageCount = usage.usageByType[variant.name]?.usageCount ?? 0;
        const role = determineRole({
          name: variant.name,
          file: variant.file,
          code: variant.code,
          usageCount,
          category: variant.category,
        });

        if (role === "source-of-truth") {
          sourceOfTruth = variant.name;
        }

        groupVariants.push({
          name: variant.name,
          file: variant.file,
          line: variant.line,
          role,
          usageCount,
          structure: variant.fields.join(", "),
          recommendation: "", // Will be filled in second pass
        });
      });

      // Second pass: calculate similarities and recommendations
      groupVariants.forEach((variant, idx) => {
        // Calculate structural similarity to first variant
        if (idx > 0) {
          const basVariant = variants[0];
          const similarity = calculateStructuralSimilarity(basVariant!.fields, variants[idx]!.fields);
          variant.structuralSimilarity = similarity;
        }

        variant.recommendation = getRecommendation(variant, { sourceOfTruth });
      });

      // Sort by role priority (source-of-truth first)
      groupVariants.sort((a, b) => {
        const roleOrder = {
          "source-of-truth": 0,
          alias: 1,
          "legacy-alias": 2,
          redefinition: 3,
        };
        return roleOrder[a.role] - roleOrder[b.role];
      });

      const totalUsages = groupVariants.reduce((sum, v) => sum + v.usageCount, 0);

      duplicateGroups.push({
        baseName,
        count: variants.length,
        totalUsages,
        variants: groupVariants,
      });
    }
  });

  // Sort by total usages (most impactful first)
  duplicateGroups.sort((a, b) => b.totalUsages - a.totalUsages);

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.count, 0);

  const output: DuplicatesOutput = {
    generatedAt: new Date().toISOString(),
    totalTypes: inventory.types.length,
    duplicateGroupsCount: duplicateGroups.length,
    totalDuplicates,
    duplicateGroups,
  };

  return output;
}

async function main() {
  console.log("🔬 Type Forensics: Detecting Duplicates\n");
  console.log("=".repeat(50) + "\n");

  try {
    const duplicates = await detectDuplicates();

    // Write output
    const outputPath = path.resolve(process.cwd(), "docs/type-audit/types-duplicates.json");
    fs.writeFileSync(outputPath, JSON.stringify(duplicates, null, 2), "utf-8");

    console.log("=".repeat(50));
    console.log("✅ Duplicate Detection Complete!\n");
    console.log(`📊 Statistics:`);
    console.log(`   Total types analyzed: ${duplicates.totalTypes}`);
    console.log(`   Duplicate groups found: ${duplicates.duplicateGroupsCount}`);
    console.log(`   Total duplicated types: ${duplicates.totalDuplicates} (${((duplicates.totalDuplicates / duplicates.totalTypes) * 100).toFixed(1)}%)\n`);

    // Show top duplicate groups
    console.log("🔥 Top 10 Duplicate Groups (by total usage):");
    duplicates.duplicateGroups.slice(0, 10).forEach((group, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2)}. ${group.baseName.padEnd(25)} ${group.count} variants, ${group.totalUsages} total usages`);
    });

    // Show example with details
    if (duplicates.duplicateGroups.length > 0) {
      console.log(`\n📋 Example: "${duplicates.duplicateGroups[0]!.baseName}" Group:`);
      duplicates.duplicateGroups[0]!.variants.forEach((variant) => {
        const simText = variant.structuralSimilarity
          ? ` (${(variant.structuralSimilarity * 100).toFixed(0)}% similar)`
          : "";
        console.log(`      ${variant.name} - ${variant.role}${simText}`);
        console.log(`      ${variant.file}:${variant.line}`);
        console.log(`      ${variant.usageCount} usages - ${variant.recommendation}`);
        console.log();
      });
    }

    console.log(`💾 Output written to:`);
    console.log(`   ${outputPath}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();