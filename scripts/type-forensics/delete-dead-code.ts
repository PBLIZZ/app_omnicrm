#!/usr/bin/env tsx

/**
 * Delete Dead Code Types
 *
 * Systematically removes all types with zero usages (dead code)
 * from the codebase based on the type audit results.
 */

import * as fs from "fs";
import * as path from "path";

interface TypeUsage {
  definedIn: string;
  importedBy: Array<{ file: string; line: number; importType: string }>;
  usageCount: number;
  isDeadCode: boolean;
}

interface UsageData {
  usageByType: Record<string, TypeUsage>;
  deadCodeCount: number;
}

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const USAGE_FILE = path.join(PROJECT_ROOT, "docs/type-audit/types-usage.json");
const DELETION_LOG = path.join(PROJECT_ROOT, "docs/type-audit/deletion-log.json");

interface DeletionResult {
  typeName: string;
  file: string;
  line: number;
  success: boolean;
  error?: string;
}

async function main() {
  console.log("🗑️  Dead Code Deletion Tool\n");

  // Load usage data
  const usageData: UsageData = JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));

  // Filter dead code
  const deadTypes = Object.entries(usageData.usageByType)
    .filter(([_, usage]) => usage.isDeadCode)
    .map(([name, usage]) => ({ name, ...usage }));

  console.log(`📊 Found ${deadTypes.length} dead code types\n`);

  const results: DeletionResult[] = [];
  const fileChanges = new Map<string, Set<string>>();

  // Group by file for efficient processing
  for (const deadType of deadTypes) {
    const [filePath, lineStr] = deadType.definedIn.split(":");
    const line = parseInt(lineStr, 10);

    if (!fileChanges.has(filePath)) {
      fileChanges.set(filePath, new Set());
    }
    fileChanges.get(filePath)!.add(deadType.name);

    results.push({
      typeName: deadType.name,
      file: filePath,
      line,
      success: false,
    });
  }

  console.log(`📁 Processing ${fileChanges.size} files...\n`);

  // Process each file
  for (const [relativeFilePath, typeNames] of fileChanges.entries()) {
    const filePath = path.join(PROJECT_ROOT, relativeFilePath);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${relativeFilePath}`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      let modified = content;
      let deletedCount = 0;

      for (const typeName of typeNames) {
        // Patterns to match type exports
        const patterns = [
          // export type Foo = ...
          new RegExp(`^export\\s+type\\s+${typeName}\\s*=\\s*[^;]+;\\s*$`, "gm"),
          // export interface Foo { ... }
          new RegExp(`^export\\s+interface\\s+${typeName}\\s*\\{[^}]*\\}\\s*$`, "gm"),
          // export enum Foo { ... }
          new RegExp(`^export\\s+enum\\s+${typeName}\\s*\\{[^}]*\\}\\s*$`, "gm"),
          // export class Foo { ... }
          new RegExp(`^export\\s+class\\s+${typeName}\\s*\\{[\\s\\S]*?^\\}\\s*$`, "gm"),
          // Multi-line type with proper brace matching
          new RegExp(`^export\\s+type\\s+${typeName}\\s*=\\s*\\{[\\s\\S]*?^\\};?\\s*$`, "gm"),
          // Multi-line interface with proper brace matching
          new RegExp(`^export\\s+interface\\s+${typeName}\\s*\\{[\\s\\S]*?^\\}\\s*$`, "gm"),
        ];

        for (const pattern of patterns) {
          const beforeLength = modified.length;
          modified = modified.replace(pattern, "");
          if (modified.length < beforeLength) {
            deletedCount++;
            console.log(`  ✓ Deleted ${typeName} from ${relativeFilePath}`);

            // Mark as successful in results
            const result = results.find(r => r.typeName === typeName && r.file === relativeFilePath);
            if (result) result.success = true;
            break;
          }
        }
      }

      if (deletedCount > 0) {
        // Clean up extra blank lines
        modified = modified.replace(/\n{3,}/g, "\n\n");
        fs.writeFileSync(filePath, modified, "utf-8");
        console.log(`✅ Updated ${relativeFilePath} (deleted ${deletedCount} types)\n`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${relativeFilePath}:`, error);
      for (const typeName of typeNames) {
        const result = results.find(r => r.typeName === typeName && r.file === relativeFilePath);
        if (result) {
          result.success = false;
          result.error = error instanceof Error ? error.message : String(error);
        }
      }
    }
  }

  // Save results
  const summary = {
    timestamp: new Date().toISOString(),
    totalAttempted: results.length,
    successfulDeletions: results.filter(r => r.success).length,
    failedDeletions: results.filter(r => !r.success).length,
    results: results,
  };

  fs.writeFileSync(DELETION_LOG, JSON.stringify(summary, null, 2));

  console.log("\n📊 Summary:");
  console.log(`  Total types processed: ${results.length}`);
  console.log(`  ✅ Successfully deleted: ${summary.successfulDeletions}`);
  console.log(`  ❌ Failed to delete: ${summary.failedDeletions}`);
  console.log(`\n📄 Detailed log saved to: docs/type-audit/deletion-log.json`);

  if (summary.failedDeletions > 0) {
    console.log("\n⚠️  Some types could not be deleted automatically.");
    console.log("   These may require manual deletion (e.g., complex multi-line types).");
  }
}

main().catch(console.error);