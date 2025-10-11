/**
 * Type Forensics: Collect All Types
 *
 * Scans entire codebase and extracts every type/interface definition
 * with location, kind, and metadata.
 */

import { Project, Node } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

interface TypeDefinition {
  id: string;
  name: string;
  kind: "interface" | "type-alias" | "enum" | "class";
  file: string;
  line: number;
  startLine: number;
  endLine: number;
  category: "database" | "business-schema" | "repository" | "component" | "utility" | "service" | "unknown";
  code: string;
  fields: string[];
  exported: boolean;
  isGeneric: boolean;
  dependencies: string[];
}

interface InventoryOutput {
  generatedAt: string;
  totalTypes: number;
  totalFiles: number;
  byCategory: Record<string, number>;
  byKind: Record<string, number>;
  types: TypeDefinition[];
}

function categorizeFile(filePath: string): TypeDefinition["category"] {
  if (filePath.includes("/db/schema.ts")) return "database";
  if (filePath.includes("/db/business-schemas/")) return "business-schema";
  if (filePath.includes("/repo/src/")) return "repository";
  if (filePath.includes("/_components/")) return "component";
  if (filePath.includes("/server/services/")) return "service";
  if (filePath.includes("/lib/") || filePath.includes("/utils/")) return "utility";
  return "unknown";
}

function extractFields(node: Node): string[] {
  const fields: string[] = [];

  if (Node.isInterfaceDeclaration(node)) {
    node.getProperties().forEach((prop) => {
      fields.push(prop.getName());
    });
  }

  // For now, skip complex field extraction for type aliases
  // We'll just count them in a later analysis pass
  return fields;
}

function extractDependencies(node: Node): string[] {
  const deps: Set<string> = new Set();

  node.forEachDescendant((child) => {
    if (Node.isTypeReference(child)) {
      const typeName = child.getTypeName();
      if (Node.isIdentifier(typeName)) {
        deps.add(typeName.getText());
      }
    }
  });

  return Array.from(deps);
}

async function collectAllTypes(): Promise<InventoryOutput> {
  console.log("🔍 Scanning codebase for type definitions...\n");

  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFiles = project.getSourceFiles();
  console.log(`📁 Found ${sourceFiles.length} source files\n`);

  const types: TypeDefinition[] = [];
  let fileCount = 0;

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    // Skip node_modules and build outputs
    if (filePath.includes("node_modules") || filePath.includes("/dist/") || filePath.includes("/.next/")) {
      continue;
    }

    fileCount++;
    const relativePath = path.relative(process.cwd(), filePath);
    const category = categorizeFile(relativePath);

    // Collect interfaces
    sourceFile.getInterfaces().forEach((iface) => {
      const name = iface.getName();
      const line = iface.getStartLineNumber();

      types.push({
        id: `${relativePath}:${name}:${line}`,
        name,
        kind: "interface",
        file: relativePath,
        line,
        startLine: line,
        endLine: iface.getEndLineNumber(),
        category,
        code: iface.getText().slice(0, 200), // First 200 chars
        fields: extractFields(iface),
        exported: iface.isExported(),
        isGeneric: iface.getTypeParameters().length > 0,
        dependencies: extractDependencies(iface),
      });
    });

    // Collect type aliases
    sourceFile.getTypeAliases().forEach((typeAlias) => {
      const name = typeAlias.getName();
      const line = typeAlias.getStartLineNumber();

      types.push({
        id: `${relativePath}:${name}:${line}`,
        name,
        kind: "type-alias",
        file: relativePath,
        line,
        startLine: line,
        endLine: typeAlias.getEndLineNumber(),
        category,
        code: typeAlias.getText().slice(0, 200),
        fields: extractFields(typeAlias.getTypeNode() ?? typeAlias),
        exported: typeAlias.isExported(),
        isGeneric: typeAlias.getTypeParameters().length > 0,
        dependencies: extractDependencies(typeAlias),
      });
    });

    // Collect enums
    sourceFile.getEnums().forEach((enumDecl) => {
      const name = enumDecl.getName();
      const line = enumDecl.getStartLineNumber();

      types.push({
        id: `${relativePath}:${name}:${line}`,
        name,
        kind: "enum",
        file: relativePath,
        line,
        startLine: line,
        endLine: enumDecl.getEndLineNumber(),
        category,
        code: enumDecl.getText().slice(0, 200),
        fields: enumDecl.getMembers().map((m) => m.getName()),
        exported: enumDecl.isExported(),
        isGeneric: false,
        dependencies: [],
      });
    });

    // Collect exported classes (might be used as types)
    sourceFile.getClasses().forEach((classDecl) => {
      if (classDecl.isExported()) {
        const name = classDecl.getName();
        if (!name) return;

        const line = classDecl.getStartLineNumber();

        types.push({
          id: `${relativePath}:${name}:${line}`,
          name,
          kind: "class",
          file: relativePath,
          line,
          startLine: line,
          endLine: classDecl.getEndLineNumber(),
          category,
          code: classDecl.getText().slice(0, 200),
          fields: classDecl.getProperties().map((p) => p.getName()),
          exported: true,
          isGeneric: classDecl.getTypeParameters().length > 0,
          dependencies: [],
        });
      }
    });
  }

  // Calculate statistics
  const byCategory: Record<string, number> = {};
  const byKind: Record<string, number> = {};

  types.forEach((type) => {
    byCategory[type.category] = (byCategory[type.category] ?? 0) + 1;
    byKind[type.kind] = (byKind[type.kind] ?? 0) + 1;
  });

  const output: InventoryOutput = {
    generatedAt: new Date().toISOString(),
    totalTypes: types.length,
    totalFiles: fileCount,
    byCategory,
    byKind,
    types: types.sort((a, b) => a.name.localeCompare(b.name)),
  };

  return output;
}

async function main() {
  console.log("🔬 Type Forensics: Collecting All Types\n");
  console.log("=".repeat(50) + "\n");

  try {
    const inventory = await collectAllTypes();

    // Write output
    const outputPath = path.resolve(process.cwd(), "docs/type-audit/types-inventory.json");
    fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2), "utf-8");

    console.log("\n" + "=".repeat(50));
    console.log("✅ Collection Complete!\n");
    console.log(`📊 Statistics:`);
    console.log(`   Total types found: ${inventory.totalTypes}`);
    console.log(`   Files scanned: ${inventory.totalFiles}\n`);

    console.log(`📦 By Category:`);
    Object.entries(inventory.byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, count]) => {
        const pct = ((count / inventory.totalTypes) * 100).toFixed(1);
        console.log(`   ${cat.padEnd(20)} ${count.toString().padStart(4)} (${pct}%)`);
      });

    console.log(`\n📝 By Kind:`);
    Object.entries(inventory.byKind)
      .sort(([, a], [, b]) => b - a)
      .forEach(([kind, count]) => {
        const pct = ((count / inventory.totalTypes) * 100).toFixed(1);
        console.log(`   ${kind.padEnd(20)} ${count.toString().padStart(4)} (${pct}%)`);
      });

    console.log(`\n💾 Output written to:`);
    console.log(`   ${outputPath}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();