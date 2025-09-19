#!/usr/bin/env tsx
/**
 * Database Import Pattern Verification Script
 *
 * Ensures the correct database connection patterns are used:
 * 1. Always use getDb() pattern, never direct db import
 * 2. Proper async/await usage with database connections
 * 3. No database schema imports outside repository layer
 * 4. Verify CSRF token usage in API calls
 */

import * as fs from 'fs';
import { glob } from 'glob';

interface DbViolation {
  file: string;
  line: number;
  rule: string;
  description: string;
  severity: 'error' | 'warning';
}

class DatabaseImportVerifier {
  private violations: DbViolation[] = [];

  async verify(): Promise<void> {
    console.log('🗃️  Verifying database import patterns...\n');

    await this.checkDatabaseConnections();
    await this.checkSchemaImports();
    await this.checkAsyncPatterns();
    await this.checkCsrfTokens();

    this.reportResults();
  }

  private async checkDatabaseConnections(): Promise<void> {
    const allFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    });

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for direct db import (the broken pattern)
        if (line.includes('import { db }') || line.includes('import db ')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'no-direct-db-import',
            description: 'Use "import { getDb } from "@/server/db/client"" instead of direct db import',
            severity: 'error'
          });
        }

        // Check for usage of db.select without getDb
        if ((line.includes('db.select(') || line.includes('db.insert(') ||
             line.includes('db.update(') || line.includes('db.delete(')) &&
             !this.hasGetDbCall(content, index)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'use-getdb-pattern',
            description: 'Use "const db = await getDb();" pattern instead of direct db usage',
            severity: 'error'
          });
        }

        // Check for getDb without await
        if (line.includes('getDb()') && !line.includes('await getDb()')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'await-getdb-call',
            description: 'getDb() must be awaited: "const db = await getDb();"',
            severity: 'error'
          });
        }

        // Check for postgres.js specific patterns
        if (line.includes('postgres(') && !filePath.includes('server/db/client')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'no-direct-postgres',
            description: 'Use getDb() instead of direct postgres() calls',
            severity: 'error'
          });
        }
      });
    }
  }

  private async checkSchemaImports(): Promise<void> {
    const nonRepoFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/server/repositories/**',
        'src/server/services/**',
        'src/server/jobs/**',
        'src/server/db/**'
      ]
    });

    for (const filePath of nonRepoFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Schema imports should only be in server-side code
        if (line.includes('from "@/server/db/schema"')) {
          // Allow in API routes and server-side code
          if (!filePath.includes('/api/') && !filePath.includes('/server/')) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              rule: 'schema-import-boundary',
              description: 'Database schema imports should only be in server-side code. Use DTOs in components.',
              severity: 'warning'
            });
          }
        }

        // Check for table imports in components
        if ((line.includes('Table') || line.includes('table')) &&
            line.includes('from "@/server/db/schema"') &&
            filePath.includes('/components/')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'no-table-imports-in-components',
            description: 'Components should not import database tables. Use DTO types instead.',
            severity: 'error'
          });
        }
      });
    }
  }

  private async checkAsyncPatterns(): Promise<void> {
    const serverFiles = await glob('src/server/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    });

    for (const filePath of serverFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for database operations without proper error handling
        if (this.isDatabaseOperation(line) && !this.hasErrorHandling(content, index)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'db-error-handling',
            description: 'Database operations should have proper error handling',
            severity: 'warning'
          });
        }

        // Check for synchronous database calls
        if (this.isDatabaseOperation(line) && !line.includes('await')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'async-db-operations',
            description: 'Database operations must be awaited',
            severity: 'error'
          });
        }

        // Check for function that uses getDb but isn't async
        if (line.includes('getDb()') && !this.isInAsyncFunction(content, index)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'async-function-for-getdb',
            description: 'Functions using getDb() must be async',
            severity: 'error'
          });
        }
      });
    }
  }

  private async checkCsrfTokens(): Promise<void> {
    const clientFiles = await glob('src/{components,hooks,app}/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**', 'src/app/api/**']
    });

    for (const filePath of clientFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for raw fetch calls without CSRF protection
        if (line.includes('fetch(') &&
            (line.includes('"POST"') || line.includes("'POST'") ||
             line.includes('"PUT"') || line.includes("'PUT'") ||
             line.includes('"DELETE"') || line.includes("'DELETE'"))) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'use-csrf-protected-fetch',
            description: 'Use fetchPost/fetchPut/fetchDelete utilities for CSRF protection',
            severity: 'error'
          });
        }

        // Check for fetch without utilities
        if (line.includes('fetch("/api') && !line.includes('fetchGet') &&
            !line.includes('fetchPost') && !line.includes('fetchPut') &&
            !line.includes('fetchDelete')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'use-fetch-utilities',
            description: 'Use fetchGet/fetchPost utilities instead of raw fetch for API calls',
            severity: 'warning'
          });
        }
      });
    }
  }

  private hasGetDbCall(content: string, lineIndex: number): boolean {
    const lines = content.split('\n');
    // Look for getDb call in the same function scope
    for (let i = Math.max(0, lineIndex - 10); i <= Math.min(lines.length - 1, lineIndex + 5); i++) {
      if (lines[i].includes('getDb()')) {
        return true;
      }
    }
    return false;
  }

  private isDatabaseOperation(line: string): boolean {
    return /\.(select|insert|update|delete)\(/.test(line);
  }

  private hasErrorHandling(content: string, lineIndex: number): boolean {
    const lines = content.split('\n');
    // Look for try/catch or error handling in surrounding lines
    for (let i = Math.max(0, lineIndex - 5); i <= Math.min(lines.length - 1, lineIndex + 5); i++) {
      const line = lines[i];
      if (line.includes('try {') || line.includes('catch') ||
          line.includes('.catch(') || line.includes('throw')) {
        return true;
      }
    }
    return false;
  }

  private isInAsyncFunction(content: string, lineIndex: number): boolean {
    const lines = content.split('\n');
    // Look backward for function declaration
    for (let i = lineIndex; i >= Math.max(0, lineIndex - 20); i--) {
      const line = lines[i];
      if (line.includes('async function') || line.includes('async (') ||
          line.includes('= async (') || line.includes(': async (')) {
        return true;
      }
      if (line.includes('function ') && !line.includes('async')) {
        return false;
      }
    }
    return false;
  }

  private reportResults(): void {
    if (this.violations.length === 0) {
      console.log('✅ No database import pattern violations found!\n');
      return;
    }

    const errors = this.violations.filter(v => v.severity === 'error');
    const warnings = this.violations.filter(v => v.severity === 'warning');

    console.log(`❌ Found ${this.violations.length} database pattern violations:\n`);

    // Group by rule
    const byRule = this.violations.reduce((acc, violation) => {
      if (!acc[violation.rule]) acc[violation.rule] = [];
      acc[violation.rule].push(violation);
      return acc;
    }, {} as Record<string, DbViolation[]>);

    Object.entries(byRule).forEach(([rule, violations]) => {
      console.log(`🔍 Rule: ${rule} (${violations.length} violations):`);
      violations.slice(0, 5).forEach(violation => { // Limit to 5 examples per rule
        const icon = violation.severity === 'error' ? '  ❌' : '  ⚠️ ';
        console.log(`${icon} ${violation.file}:${violation.line}`);
        console.log(`     ${violation.description}\n`);
      });
      if (violations.length > 5) {
        console.log(`     ... and ${violations.length - 5} more\n`);
      }
    });

    console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings\n`);

    if (errors.length > 0) {
      console.log('❌ Database pattern violations must be fixed before merge.');
      process.exit(1);
    } else {
      console.log('⚠️  Please address warnings to maintain code quality.');
    }
  }
}

// Run the verifier
async function main() {
  const verifier = new DatabaseImportVerifier();
  await verifier.verify();
}

if (require.main === module) {
  main().catch(console.error);
}