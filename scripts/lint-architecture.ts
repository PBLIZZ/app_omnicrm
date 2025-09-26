#!/usr/bin/env tsx
/**
 * Architecture Boundary Verification Script
 *
 * Enforces clean architecture principles:
 * 1. API routes should only contain thin handlers
 * 2. Business logic should be in server/ modules
 * 3. Components should use hooks, not direct API calls
 * 4. Services should be properly layered
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

interface ArchitectureViolation {
  file: string;
  line: number;
  rule: string;
  description: string;
  severity: "error" | "warning";
}

class ArchitectureLinter {
  private violations: ArchitectureViolation[] = [];
  private readonly srcDir = path.join(process.cwd(), "src");

  async lint(): Promise<void> {
    console.log("🏗️  Linting architecture boundaries...\n");

    await this.checkApiRoutes();
    await this.checkComponentBoundaries();
    await this.checkServiceLayers();
    await this.checkImportPatterns();

    this.reportResults();
  }

  private async checkApiRoutes(): Promise<void> {
    const apiRoutes = await glob("src/app/api/**/route.{ts,tsx}", { cwd: process.cwd() });

    for (const routePath of apiRoutes) {
      const content = fs.readFileSync(routePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // API routes should delegate to services, not contain business logic
        if (this.containsBusinessLogic(line)) {
          this.violations.push({
            file: routePath,
            line: index + 1,
            rule: "api-thin-handlers",
            description: "API route contains business logic. Move to server/services/",
            severity: "error",
          });
        }

        // API routes should not directly import db client
        if (line.includes('from "@/server/db"') && !line.includes('from "@/server/db/client"')) {
          this.violations.push({
            file: routePath,
            line: index + 1,
            rule: "api-no-direct-db",
            description: "API route should not import db directly. Use services instead.",
            severity: "error",
          });
        }

        // Check for proper error handling
        if (line.includes("throw new Error") && !this.hasErrorBoundary(content, index)) {
          this.violations.push({
            file: routePath,
            line: index + 1,
            rule: "api-error-handling",
            description: "Use OkEnvelope pattern for API errors",
            severity: "warning",
          });
        }
      });
    }
  }

  private async checkComponentBoundaries(): Promise<void> {
    const components = await glob("src/components/**/*.{ts,tsx}", { cwd: process.cwd() });

    for (const componentPath of components) {
      const content = fs.readFileSync(componentPath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // Components should not directly call fetch
        if (
          line.includes("fetch(") &&
          !line.includes("get(") &&
          !line.includes("post(") &&
          !line.includes("put(") &&
          !line.includes("del(")
        ) {
          this.violations.push({
            file: componentPath,
            line: index + 1,
            rule: "component-no-raw-fetch",
            description: "Use get/post/put/del utilities from @/lib/api instead of raw fetch",
            severity: "error",
          });
        }

        // Components should use hooks, not direct service imports
        if (line.includes('from "@/server/services/')) {
          this.violations.push({
            file: componentPath,
            line: index + 1,
            rule: "component-use-hooks",
            description: "Components should use custom hooks, not direct service imports",
            severity: "error",
          });
        }

        // Components should not import database types directly
        if (line.includes('from "@/server/db/schema"')) {
          this.violations.push({
            file: componentPath,
            line: index + 1,
            rule: "component-use-dto",
            description: "Use DTO types instead of direct database schema imports",
            severity: "warning",
          });
        }
      });
    }
  }

  private async checkServiceLayers(): Promise<void> {
    const services = await glob("src/server/services/**/*.{ts,tsx}", { cwd: process.cwd() });

    for (const servicePath of services) {
      const content = fs.readFileSync(servicePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // Services should use getDb() pattern
        if (line.includes('from "@/server/db"') && !line.includes('from "@/server/db/client"')) {
          this.violations.push({
            file: servicePath,
            line: index + 1,
            rule: "service-use-getdb",
            description: 'Services must use getDb() pattern from "@/server/db/client"',
            severity: "error",
          });
        }

        // Services should not import UI components
        if (line.includes('from "@/components/')) {
          this.violations.push({
            file: servicePath,
            line: index + 1,
            rule: "service-no-ui-imports",
            description: "Services should not import UI components",
            severity: "error",
          });
        }

        // Check for proper async/await usage with getDb
        if (line.includes("getDb()") && !line.includes("await")) {
          this.violations.push({
            file: servicePath,
            line: index + 1,
            rule: "service-await-getdb",
            description: "getDb() must be awaited",
            severity: "error",
          });
        }
      });
    }
  }

  private async checkImportPatterns(): Promise<void> {
    const allFiles = await glob("src/**/*.{ts,tsx}", {
      cwd: process.cwd(),
      ignore: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
    });

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // Check for TypeScript safety violations
        if (line.includes(" any") || line.includes(" any;") || line.includes(" any,")) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: "no-any-types",
            description: "Avoid any types. Use proper TypeScript types.",
            severity: "error",
          });
        }

        // Check for non-null assertions
        if (line.includes("!.") || line.includes("!;") || line.includes("!)")) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: "no-non-null-assertions",
            description: "Avoid non-null assertions. Use explicit null checks.",
            severity: "error",
          });
        }

        // Check for type assertions
        if (line.includes(" as ") && !line.includes(" as const")) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: "no-type-assertions",
            description: "Avoid type assertions. Use type guards instead.",
            severity: "warning",
          });
        }

        // Check for ESLint disables
        if (line.includes("eslint-disable")) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: "no-eslint-disables",
            description: "Fix the underlying issue instead of disabling ESLint.",
            severity: "warning",
          });
        }
      });
    }
  }

  private containsBusinessLogic(line: string): boolean {
    const businessLogicPatterns = [
      /await.*\.select\(/,
      /await.*\.insert\(/,
      /await.*\.update\(/,
      /await.*\.delete\(/,
      /\.map\(.*=>.*\)/,
      /\.filter\(.*=>.*\)/,
      /\.reduce\(.*,.*\)/,
      /for\s*\(.*of/,
      /while\s*\(/,
      /if\s*\(.*\)\s*{[\s\S]*return/,
    ];

    return businessLogicPatterns.some((pattern) => pattern.test(line));
  }

  private hasErrorBoundary(content: string, lineIndex: number): boolean {
    const surroundingLines = content.split("\n").slice(Math.max(0, lineIndex - 5), lineIndex + 5);
    return surroundingLines.some(
      (line) => line.includes("try {") || line.includes("catch") || line.includes("OkEnvelope"),
    );
  }

  private reportResults(): void {
    if (this.violations.length === 0) {
      console.log("✅ No architecture boundary violations found!\n");
      return;
    }

    const errors = this.violations.filter((v) => v.severity === "error");
    const warnings = this.violations.filter((v) => v.severity === "warning");

    console.log(`❌ Found ${this.violations.length} architecture violations:\n`);

    // Group by file
    const byFile = this.violations.reduce(
      (acc, violation) => {
        if (!acc[violation.file]) acc[violation.file] = [];
        acc[violation.file].push(violation);
        return acc;
      },
      {} as Record<string, ArchitectureViolation[]>,
    );

    Object.entries(byFile).forEach(([file, violations]) => {
      console.log(`📁 ${file}:`);
      violations.forEach((violation) => {
        const icon = violation.severity === "error" ? "  ❌" : "  ⚠️ ";
        console.log(`${icon} Line ${violation.line}: ${violation.description}`);
        console.log(`     Rule: ${violation.rule}\n`);
      });
    });

    console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings\n`);

    if (errors.length > 0) {
      console.log("❌ Architecture violations must be fixed before merge.");
      process.exit(1);
    } else {
      console.log("⚠️  Please address warnings to maintain code quality.");
    }
  }
}

// Run the linter
async function main() {
  const linter = new ArchitectureLinter();
  await linter.lint();
}

if (require.main === module) {
  main().catch(console.error);
}
