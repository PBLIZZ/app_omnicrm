/**
 * Type Forensics: Classify Origins
 *
 * Determine if types are database-derived, computed, or fictional
 */

import * as fs from "fs";
import * as path from "path";

interface TypeDefinition {
  id: string;
  name: string;
  file: string;
  code: string;
  category: string;
  dependencies: string[];
}

interface TypeOrigin {
  origin: "database-table" | "database-derived" | "computed" | "ui-only" | "api-boundary" | "fictional";
  confidence: number;
  table?: string;
  baseTypes?: string[];
  computedFields?: string[];
  evidence: {
    isDatabaseTable: boolean;
    extendsDatabase: boolean;
    usedInDatabase: boolean;
    usedInComponents: boolean;
    usedInAPIs: boolean;
  };
  notes?: string;
}

interface OriginsOutput {
  generatedAt: string;
  totalTypes: number;
  byOrigin: Record<string, number>;
  origins: Record<string, TypeOrigin>;
}


const DATABASE_TYPE_NAMES = new Set([
  "Contact",
  "Note",
  "Interaction",
  "CalendarEvent",
  "Task",
  "Project",
  "Zone",
  "Job",
  "AiInsight",
  "Message",
  "Thread",
  "UserIntegration",
  "SyncSession",
  "InboxItem",
  "Goal",
  "OnboardingToken",
]);

function classifyOrigin(type: TypeDefinition): TypeOrigin {
  const evidence = {
    isDatabaseTable: false,
    extendsDatabase: false,
    usedInDatabase: false,
    usedInComponents: false,
    usedInAPIs: false,
  };

  // Check if it's a direct database table type
  if (
    type.category === "database" &&
    (type.code.includes("pgTable") || DATABASE_TYPE_NAMES.has(type.name))
  ) {
    evidence.isDatabaseTable = true;
    const tableName = type.name.toLowerCase().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

    return {
      origin: "database-table",
      confidence: 1.0,
      table: tableName,
      evidence,
    };
  }

  // Check if it extends/picks from database types
  const extendsDatabaseType = type.dependencies.some((dep) => DATABASE_TYPE_NAMES.has(dep));
  if (extendsDatabaseType) {
    evidence.extendsDatabase = true;
    evidence.usedInDatabase = true;

    // If it has additional fields beyond database type, it's computed
    if (
      type.name.includes("With") ||
      type.name.includes("List") ||
      type.name.includes("Enriched") ||
      type.name.includes("Extended")
    ) {
      return {
        origin: "computed",
        confidence: 0.9,
        baseTypes: type.dependencies.filter((dep) => DATABASE_TYPE_NAMES.has(dep)),
        evidence,
        notes: "Extends database type with computed fields",
      };
    }

    return {
      origin: "database-derived",
      confidence: 0.95,
      baseTypes: type.dependencies.filter((dep) => DATABASE_TYPE_NAMES.has(dep)),
      evidence,
    };
  }

  // Check file location patterns
  evidence.usedInComponents = type.file.includes("_components/") || type.file.includes("/app/");
  evidence.usedInAPIs = type.file.includes("/api/") || type.category === "business-schema";
  evidence.usedInDatabase =
    type.file.includes("/db/") || type.file.includes("/repo/") || type.file.includes("/server/");

  // Classify based on evidence
  if (evidence.usedInComponents && !evidence.usedInDatabase) {
    return {
      origin: "ui-only",
      confidence: 0.8,
      evidence,
      notes: "Used only in components, not backed by database",
    };
  }

  if (evidence.usedInAPIs && type.category === "business-schema") {
    return {
      origin: "api-boundary",
      confidence: 0.9,
      evidence,
      notes: "Validation schema for API endpoints",
    };
  }

  // Default: fictional (purpose unclear)
  return {
    origin: "fictional",
    confidence: 0.7,
    evidence,
    notes: "No clear database connection or purpose",
  };
}

async function classifyOrigins(): Promise<OriginsOutput> {
  console.log("🔍 Loading type data...\n");

  const inventoryPath = path.resolve(process.cwd(), "docs/type-audit/types-inventory.json");
  if (!fs.existsSync(inventoryPath)) {
    throw new Error("Run collect-all-types.ts first");
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf-8"));
  console.log(`📦 Loaded ${inventory.types.length} types\n`);
  console.log("🔍 Classifying origins...\n");

  const origins: Record<string, TypeOrigin> = {};
  const byOrigin: Record<string, number> = {};

  inventory.types.forEach((type: TypeDefinition) => {
    const origin = classifyOrigin(type);
    origins[type.name] = origin;
    byOrigin[origin.origin] = (byOrigin[origin.origin] ?? 0) + 1;
  });

  return {
    generatedAt: new Date().toISOString(),
    totalTypes: inventory.types.length,
    byOrigin,
    origins,
  };
}

async function main() {
  console.log("🔬 Type Forensics: Classifying Origins\n");
  console.log("=".repeat(50) + "\n");

  try {
    const origins = await classifyOrigins();

    const outputPath = path.resolve(process.cwd(), "docs/type-audit/types-origins.json");
    fs.writeFileSync(outputPath, JSON.stringify(origins, null, 2), "utf-8");

    console.log("=".repeat(50));
    console.log("✅ Origin Classification Complete!\n");
    console.log(`📊 Statistics:`);
    console.log(`   Total types classified: ${origins.totalTypes}\n`);

    console.log("📦 By Origin:");
    Object.entries(origins.byOrigin)
      .sort(([, a], [, b]) => b - a)
      .forEach(([origin, count]) => {
        const pct = ((count / origins.totalTypes) * 100).toFixed(1);
        console.log(`   ${origin.padEnd(20)} ${count.toString().padStart(4)} (${pct}%)`);
      });

    console.log(`\n💾 Output written to:`);
    console.log(`   ${outputPath}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();