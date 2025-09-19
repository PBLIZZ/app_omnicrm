#!/usr/bin/env tsx
/**
 * DTO Usage Verification Script
 *
 * Ensures proper Data Transfer Object patterns:
 * 1. Components use DTO types, not raw database types
 * 2. API routes return structured responses (OkEnvelope)
 * 3. Zod schemas are used for validation
 * 4. No direct schema types in frontend components
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface DtoViolation {
  file: string;
  line: number;
  rule: string;
  description: string;
  severity: 'error' | 'warning';
}

class DtoUsageVerifier {
  private violations: DtoViolation[] = [];

  async verify(): Promise<void> {
    console.log('📋 Verifying DTO usage patterns...\n');

    await this.checkComponentDtoUsage();
    await this.checkApiResponsePatterns();
    await this.checkZodSchemaUsage();
    await this.checkTypeImports();

    this.reportResults();
  }

  private async checkComponentDtoUsage(): Promise<void> {
    const componentFiles = await glob('src/components/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    });

    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for direct database schema type imports
        if (this.hasDirectSchemaTypeImport(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'component-use-dto-types',
            description: 'Components should use DTO types, not direct database schema types',
            severity: 'error'
          });
        }

        // Check for raw database table types
        if (this.hasRawDatabaseType(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'no-raw-db-types',
            description: 'Use DTO types instead of raw database types like Contact, Interaction, etc.',
            severity: 'warning'
          });
        }

        // Check for usage of $inferSelect or $inferInsert in components
        if (line.includes('$inferSelect') || line.includes('$inferInsert')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'no-infer-types-in-components',
            description: 'Components should not use Drizzle infer types. Use DTO types instead.',
            severity: 'error'
          });
        }

        // Check for missing prop type definitions
        if (this.hasMissingPropTypes(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'define-prop-types',
            description: 'Define explicit prop interfaces instead of using inferred types',
            severity: 'warning'
          });
        }
      });
    }
  }

  private async checkApiResponsePatterns(): Promise<void> {
    const apiFiles = await glob('src/app/api/**/route.{ts,tsx}', {
      cwd: process.cwd()
    });

    for (const filePath of apiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for Response.json() without OkEnvelope
        if (line.includes('Response.json(') && !this.hasOkEnvelope(content, index)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'use-ok-envelope',
            description: 'API responses should use OkEnvelope pattern: { ok: true, data: ... }',
            severity: 'warning'
          });
        }

        // Check for NextResponse without proper typing
        if (line.includes('NextResponse.json(') && !this.hasTypeAnnotation(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'type-api-responses',
            description: 'API responses should have proper TypeScript typing',
            severity: 'warning'
          });
        }

        // Check for error responses without structure
        if (this.hasUnstructuredError(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'structured-error-responses',
            description: 'Use structured error responses: { ok: false, error: "message" }',
            severity: 'warning'
          });
        }

        // Check for missing input validation
        if (this.hasUnvalidatedInput(content, index)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'validate-api-inputs',
            description: 'API route inputs should be validated with Zod schemas',
            severity: 'warning'
          });
        }
      });
    }
  }

  private async checkZodSchemaUsage(): Promise<void> {
    const allFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    });

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for manual type definitions that should use Zod
        if (this.shouldUseZodSchema(line, content)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'use-zod-schemas',
            description: 'Use Zod schemas for runtime validation instead of manual type checking',
            severity: 'warning'
          });
        }

        // Check for z.infer usage without schema import
        if (line.includes('z.infer<') && !this.hasZodSchemaImport(content)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'import-zod-schema',
            description: 'Import Zod schema from "@/lib/schemas" for type inference',
            severity: 'error'
          });
        }

        // Check for missing .strict() on object schemas
        if (line.includes('z.object(') && !line.includes('.strict()') &&
            !this.hasStrictModifier(content, index)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'use-strict-schemas',
            description: 'Use .strict() on Zod object schemas to prevent extra properties',
            severity: 'warning'
          });
        }
      });
    }
  }

  private async checkTypeImports(): Promise<void> {
    const allFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/server/**', // Server files can import database types
        'src/app/api/**' // API routes can import database types
      ]
    });

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for database schema imports in client-side files
        if (line.includes('from "@/server/db/schema"') &&
            !filePath.includes('/server/') &&
            !filePath.includes('/api/')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'client-side-schema-import',
            description: 'Client-side code should not import database schemas. Use DTO types.',
            severity: 'error'
          });
        }

        // Check for missing type-only imports
        if (this.shouldBeTypeOnlyImport(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'use-type-only-imports',
            description: 'Use "import type" for type-only imports to improve bundle size',
            severity: 'warning'
          });
        }

        // Check for circular import risks
        if (this.hasCircularImportRisk(line, filePath)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'avoid-circular-imports',
            description: 'Potential circular import detected. Consider using type-only import.',
            severity: 'warning'
          });
        }
      });
    }
  }

  private hasDirectSchemaTypeImport(line: string): boolean {
    return line.includes('from "@/server/db/schema"') &&
           (line.includes('Contact') || line.includes('Interaction') ||
            line.includes('Message') || line.includes('Thread'));
  }

  private hasRawDatabaseType(line: string): boolean {
    const dbTypePattern = /:\s*(Contact|Interaction|Message|Thread|Job|RawEvent)\b/;
    return dbTypePattern.test(line) && !line.includes('DTO') && !line.includes('Props');
  }

  private hasMissingPropTypes(line: string): boolean {
    return line.includes('props:') && line.includes('any');
  }

  private hasOkEnvelope(content: string, lineIndex: number): boolean {
    const lines = content.split('\n');
    for (let i = Math.max(0, lineIndex - 3); i <= Math.min(lines.length - 1, lineIndex + 3); i++) {
      if (lines[i].includes('"ok":') || lines[i].includes("'ok':") ||
          lines[i].includes('ok: true') || lines[i].includes('ok: false')) {
        return true;
      }
    }
    return false;
  }

  private hasTypeAnnotation(line: string): boolean {
    return line.includes(': ') && (line.includes('Response') || line.includes('<'));
  }

  private hasUnstructuredError(line: string): boolean {
    return (line.includes('throw new Error') || line.includes('return { error:')) &&
           !line.includes('ok: false');
  }

  private hasUnvalidatedInput(content: string, lineIndex: number): boolean {
    const lines = content.split('\n');
    const hasRequestBodyAccess = lines.some((line, i) =>
      Math.abs(i - lineIndex) <= 5 && (line.includes('.json()') || line.includes('request.body'))
    );
    const hasValidation = lines.some((line, i) =>
      Math.abs(i - lineIndex) <= 10 && (line.includes('.parse(') || line.includes('.safeParse('))
    );
    return hasRequestBodyAccess && !hasValidation;
  }

  private shouldUseZodSchema(line: string, content: string): boolean {
    return line.includes('interface ') &&
           line.includes('Request') &&
           !content.includes('z.object') &&
           !content.includes('from zod');
  }

  private hasZodSchemaImport(content: string): boolean {
    return content.includes('from "@/lib/schemas"') ||
           content.includes('from zod');
  }

  private hasStrictModifier(content: string, lineIndex: number): boolean {
    const lines = content.split('\n');
    for (let i = lineIndex; i <= Math.min(lines.length - 1, lineIndex + 3); i++) {
      if (lines[i].includes('.strict()')) {
        return true;
      }
    }
    return false;
  }

  private shouldBeTypeOnlyImport(line: string): boolean {
    return line.includes('import {') &&
           !line.includes('import type') &&
           !line.includes('import { type') &&
           (line.includes('Props') || line.includes('Type') || line.includes('Config'));
  }

  private hasCircularImportRisk(line: string, filePath: string): boolean {
    // Simplified circular import detection
    if (!line.includes('import')) return false;

    const importPath = line.match(/from ['"`]([^'"`]+)['"`]/)?.[1];
    if (!importPath?.startsWith('@/')) return false;

    const currentDir = path.dirname(filePath);
    const importDir = importPath.replace('@/', 'src/');

    // Basic check: importing from same directory level might indicate circular dependency
    return currentDir.includes(importDir) || importDir.includes(currentDir);
  }

  private reportResults(): void {
    if (this.violations.length === 0) {
      console.log('✅ No DTO usage violations found!\n');
      return;
    }

    const errors = this.violations.filter(v => v.severity === 'error');
    const warnings = this.violations.filter(v => v.severity === 'warning');

    console.log(`❌ Found ${this.violations.length} DTO usage violations:\n`);

    // Group by severity and rule
    const errorsByRule = errors.reduce((acc, v) => {
      if (!acc[v.rule]) acc[v.rule] = [];
      acc[v.rule].push(v);
      return acc;
    }, {} as Record<string, DtoViolation[]>);

    const warningsByRule = warnings.reduce((acc, v) => {
      if (!acc[v.rule]) acc[v.rule] = [];
      acc[v.rule].push(v);
      return acc;
    }, {} as Record<string, DtoViolation[]>);

    if (Object.keys(errorsByRule).length > 0) {
      console.log('❌ ERRORS (must fix):');
      Object.entries(errorsByRule).forEach(([rule, violations]) => {
        console.log(`\n  🔴 ${rule} (${violations.length} violations):`);
        violations.slice(0, 3).forEach(v => {
          console.log(`    • ${v.file}:${v.line} - ${v.description}`);
        });
        if (violations.length > 3) {
          console.log(`    • ... and ${violations.length - 3} more`);
        }
      });
    }

    if (Object.keys(warningsByRule).length > 0) {
      console.log('\n⚠️  WARNINGS (should fix):');
      Object.entries(warningsByRule).forEach(([rule, violations]) => {
        console.log(`\n  🟡 ${rule} (${violations.length} violations):`);
        violations.slice(0, 2).forEach(v => {
          console.log(`    • ${v.file}:${v.line} - ${v.description}`);
        });
        if (violations.length > 2) {
          console.log(`    • ... and ${violations.length - 2} more`);
        }
      });
    }

    console.log(`\nSummary: ${errors.length} errors, ${warnings.length} warnings\n`);

    if (errors.length > 0) {
      console.log('❌ DTO pattern violations must be fixed before merge.');
      process.exit(1);
    } else {
      console.log('⚠️  Please address warnings to maintain code quality.');
    }
  }
}

// Run the verifier
async function main() {
  const verifier = new DtoUsageVerifier();
  await verifier.verify();
}

if (require.main === module) {
  main().catch(console.error);
}