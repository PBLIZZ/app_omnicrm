/**
 * Type Forensics: Trace Usage
 *
 * For each type definition, find where it's imported and used
 * Detects dead code and calculates usage statistics
 */

import { Project } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

interface TypeInventory {
  types: Array<{
    id: string;
    name: string;
    file: string;
    exported: boolean;
  }>;
}

interface TypeUsageContext {
  file: string;
  line: number;
  importType: "named" | "default" | "namespace";
}

interface TypeUsage {
  definedIn: string;
  importedBy: TypeUsageContext[];
  usageCount: number;
  isDeadCode: boolean;
  usageContexts: {
    functionReturn: number;
    functionParam: number;
    variableType: number;
    extends: number;
    other: number;
  };
}

interface UsageOutput {
  generatedAt: string;
  totalTypes: number;
  typesWithUsage: number;
  deadCodeCount: number;
  lowUsageCount: number;
  usageByType: Record<string, TypeUsage>;
}

async function traceUsage(): Promise<UsageOutput> {
  console.log("🔍 Loading type inventory...\n");

  // Load inventory
  const inventoryPath = path.resolve(process.cwd(), "docs/type-audit/types-inventory.json");
  if (!fs.existsSync(inventoryPath)) {
    throw new Error("Run collect-all-types.ts first to generate inventory");
  }

  const inventory: TypeInventory = JSON.parse(fs.readFileSync(inventoryPath, "utf-8"));
  console.log(`📦 Loaded ${inventory.types.length} types from inventory\n`);

  // Initialize project
  console.log("🔍 Scanning for type usages...\n");
  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFiles = project.getSourceFiles();
  const usageByType: Record<string, TypeUsage> = {};

  // Initialize usage tracking for all types
  inventory.types.forEach((type) => {
    if (type.exported) {
      usageByType[type.name] = {
        definedIn: `${type.file}:${type.id.split(":")[2]}`,
        importedBy: [],
        usageCount: 0,
        isDeadCode: false,
        usageContexts: {
          functionReturn: 0,
          functionParam: 0,
          variableType: 0,
          extends: 0,
          other: 0,
        },
      };
    }
  });

  // Track type names to their definitions
  const typeNameToFile = new Map<string, string>();
  inventory.types.forEach((type) => {
    if (type.exported) {
      typeNameToFile.set(type.name, type.file);
    }
  });

  let filesProcessed = 0;
  const totalFiles = sourceFiles.length;

  // Scan all files for imports and usages
  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    if (filePath.includes("node_modules") || filePath.includes("/dist/") || filePath.includes("/.next/")) {
      continue;
    }

    filesProcessed++;
    if (filesProcessed % 100 === 0) {
      console.log(`   Processed ${filesProcessed}/${totalFiles} files...`);
    }

    const relativePath = path.relative(process.cwd(), filePath);

    // Check all import declarations
    sourceFile.getImportDeclarations().forEach((importDecl) => {
      const namedImports = importDecl.getNamedImports();

      namedImports.forEach((namedImport) => {
        const importName = namedImport.getName();

        if (usageByType[importName]) {
          const line = importDecl.getStartLineNumber();

          usageByType[importName].importedBy.push({
            file: relativePath,
            line,
            importType: "named",
          });
          usageByType[importName].usageCount++;
        }
      });

      // Default imports
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        const importName = defaultImport.getText();
        if (usageByType[importName]) {
          usageByType[importName].importedBy.push({
            file: relativePath,
            line: importDecl.getStartLineNumber(),
            importType: "default",
          });
          usageByType[importName].usageCount++;
        }
      }
    });

    // Scan for type references in function signatures, etc.
    sourceFile.getFunctions().forEach((func) => {
      // Check return type
      const returnType = func.getReturnType();
      const returnTypeText = returnType.getText();

      Object.keys(usageByType).forEach((typeName) => {
        if (returnTypeText.includes(typeName)) {
          usageByType[typeName].usageContexts.functionReturn++;
        }
      });

      // Check parameters
      func.getParameters().forEach((param) => {
        const paramType = param.getType().getText();
        Object.keys(usageByType).forEach((typeName) => {
          if (paramType.includes(typeName)) {
            usageByType[typeName].usageContexts.functionParam++;
          }
        });
      });
    });

    // Check variables
    sourceFile.getVariableDeclarations().forEach((varDecl) => {
      const varType = varDecl.getType().getText();
      Object.keys(usageByType).forEach((typeName) => {
        if (varType.includes(typeName)) {
          usageByType[typeName].usageContexts.variableType++;
        }
      });
    });

    // Check extends clauses
    sourceFile.getInterfaces().forEach((iface) => {
      iface.getExtends().forEach((extend) => {
        const extendText = extend.getText();
        Object.keys(usageByType).forEach((typeName) => {
          if (extendText.includes(typeName)) {
            usageByType[typeName].usageContexts.extends++;
          }
        });
      });
    });
  }

  console.log(`\n✅ Processed ${filesProcessed} files\n`);

  // Calculate statistics
  let deadCodeCount = 0;
  let lowUsageCount = 0;
  let typesWithUsage = 0;

  Object.entries(usageByType).forEach(([, usage]) => {
    if (usage.usageCount === 0) {
      usage.isDeadCode = true;
      deadCodeCount++;
    } else {
      typesWithUsage++;
      if (usage.usageCount <= 2) {
        lowUsageCount++;
      }
    }
  });

  const output: UsageOutput = {
    generatedAt: new Date().toISOString(),
    totalTypes: Object.keys(usageByType).length,
    typesWithUsage,
    deadCodeCount,
    lowUsageCount,
    usageByType,
  };

  return output;
}

async function main() {
  console.log("🔬 Type Forensics: Tracing Usage\n");
  console.log("=".repeat(50) + "\n");

  try {
    const usage = await traceUsage();

    // Write output
    const outputPath = path.resolve(process.cwd(), "docs/type-audit/types-usage.json");
    fs.writeFileSync(outputPath, JSON.stringify(usage, null, 2), "utf-8");

    console.log("=".repeat(50));
    console.log("✅ Usage Analysis Complete!\n");
    console.log(`📊 Statistics:`);
    console.log(`   Total exported types: ${usage.totalTypes}`);
    console.log(`   Types with usage: ${usage.typesWithUsage} (${((usage.typesWithUsage / usage.totalTypes) * 100).toFixed(1)}%)`);
    console.log(`   Dead code: ${usage.deadCodeCount} (${((usage.deadCodeCount / usage.totalTypes) * 100).toFixed(1)}%)`);
    console.log(`   Low usage (1-2): ${usage.lowUsageCount} (${((usage.lowUsageCount / usage.totalTypes) * 100).toFixed(1)}%)\n`);

    // Show top 10 most used types
    const topTypes = Object.entries(usage.usageByType)
      .sort(([, a], [, b]) => b.usageCount - a.usageCount)
      .slice(0, 10);

    console.log("🔥 Top 10 Most Used Types:");
    topTypes.forEach(([name, data], idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2)}. ${name.padEnd(30)} ${data.usageCount} usages`);
    });

    // Show some dead code examples
    const deadTypes = Object.entries(usage.usageByType)
      .filter(([, data]) => data.isDeadCode)
      .slice(0, 5);

    if (deadTypes.length > 0) {
      console.log(`\n☠️  Dead Code Examples (showing 5 of ${usage.deadCodeCount}):`);
      deadTypes.forEach(([name, data]) => {
        console.log(`   - ${name} (${data.definedIn})`);
      });
    }

    console.log(`\n💾 Output written to:`);
    console.log(`   ${outputPath}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();