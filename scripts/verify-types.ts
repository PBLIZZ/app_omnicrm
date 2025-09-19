#!/usr/bin/env tsx
/**
 * Type Pattern Verification Script
 *
 * Ensures TypeScript best practices and coding standards:
 * 1. No `any` types allowed
 * 2. No non-null assertions (`!`)
 * 3. No type assertions (`as`) except `as const`
 * 4. No ESLint disable comments
 * 5. Proper error handling patterns
 * 6. Consistent naming conventions
 */

import * as fs from 'fs';
import { glob } from 'glob';

interface TypeViolation {
  file: string;
  line: number;
  rule: string;
  description: string;
  severity: 'error' | 'warning';
  example?: string;
}

class TypePatternVerifier {
  private violations: TypeViolation[] = [];
  private readonly strictRules = [
    'no-any-types',
    'no-non-null-assertions',
    'no-type-assertions',
    'no-eslint-disables',
    'proper-error-handling'
  ];

  async verify(): Promise<void> {
    console.log('🔍 Verifying TypeScript type patterns...\n');

    await this.checkTypeScriptPatterns();
    await this.checkErrorHandling();
    await this.checkNamingConventions();
    await this.checkTestPatterns();

    this.reportResults();
  }

  private async checkTypeScriptPatterns(): Promise<void> {
    const allFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    });

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        this.checkAnyTypes(line, filePath, index);
        this.checkNonNullAssertions(line, filePath, index);
        this.checkTypeAssertions(line, filePath, index);
        this.checkEslintDisables(line, filePath, index);
        this.checkUnusedVariables(line, filePath, index);
        this.checkImplicitReturns(line, filePath, index);
      });
    }
  }

  private checkAnyTypes(line: string, filePath: string, index: number): void {
    // Check for explicit `any` type usage
    const anyPatterns = [
      /:\s*any\b/,           // : any
      /:\s*any\[\]/,         // : any[]
      /:\s*any\s*\|/,        // : any |
      /\|\s*any\b/,          // | any
      /<any>/,               // <any>
      /Array<any>/,          // Array<any>
      /Promise<any>/,        // Promise<any>
      /Record<[^,]*,\s*any>/ // Record<string, any>
    ];

    anyPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        // Allow any in specific contexts
        if (this.isAllowedAnyUsage(line, filePath)) {
          return;
        }

        this.violations.push({
          file: filePath,
          line: index + 1,
          rule: 'no-any-types',
          description: 'Use specific types instead of `any`. Consider using `unknown` for truly unknown types.',
          severity: 'error',
          example: line.trim()
        });
      }
    });
  }

  private checkNonNullAssertions(line: string, filePath: string, index: number): void {
    // Check for non-null assertion operator
    const nonNullPatterns = [
      /\w+!/,           // variable!
      /\)!/,            // function()!
      /\]!/,            // array[0]!
      /\}!/,            // object.prop!
    ];

    nonNullPatterns.forEach(pattern => {
      if (pattern.test(line) && !this.isAllowedNonNullAssertion(line)) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          rule: 'no-non-null-assertions',
          description: 'Use explicit null checks instead of non-null assertions (!)',
          severity: 'error',
          example: line.trim()
        });
      }
    });
  }

  private checkTypeAssertions(line: string, filePath: string, index: number): void {
    // Check for type assertions (as Type)
    if (line.includes(' as ') && !line.includes(' as const') && !line.includes(' as never')) {
      // Allow specific type assertions that are safe
      if (this.isAllowedTypeAssertion(line)) {
        return;
      }

      this.violations.push({
        file: filePath,
        line: index + 1,
        rule: 'no-type-assertions',
        description: 'Use type guards instead of type assertions. Consider using `unknown` and narrowing.',
        severity: 'warning',
        example: line.trim()
      });
    }
  }

  private checkEslintDisables(line: string, filePath: string, index: number): void {
    if (line.includes('eslint-disable')) {
      this.violations.push({
        file: filePath,
        line: index + 1,
        rule: 'no-eslint-disables',
        description: 'Fix the underlying issue instead of disabling ESLint rules',
        severity: 'error',
        example: line.trim()
      });
    }
  }

  private checkUnusedVariables(line: string, filePath: string, index: number): void {
    // Check for underscore-prefixed variables (should be removed instead)
    if (line.includes('_') && line.match(/\b_\w+\b/) && line.includes('=')) {
      this.violations.push({
        file: filePath,
        line: index + 1,
        rule: 'no-underscore-prefixes',
        description: 'Remove unused variables instead of prefixing with underscore',
        severity: 'warning',
        example: line.trim()
      });
    }
  }

  private checkImplicitReturns(line: string, filePath: string, index: number): void {
    // Check for functions that might have implicit return issues
    if (line.includes('function ') && line.includes('{') && !line.includes(': void')) {
      const hasReturn = this.functionHasExplicitReturn(filePath, index);
      if (!hasReturn && !line.includes('void')) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          rule: 'explicit-function-returns',
          description: 'Add explicit return type annotation to functions',
          severity: 'warning',
          example: line.trim()
        });
      }
    }
  }

  private async checkErrorHandling(): Promise<void> {
    const allFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    });

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for unhandled async operations
        if (this.hasUnhandledAsyncOperation(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'handle-async-errors',
            description: 'Async operations should have proper error handling',
            severity: 'warning',
            example: line.trim()
          });
        }

        // Check for generic error throwing
        if (line.includes('throw new Error(') && !this.hasSpecificError(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'specific-error-types',
            description: 'Use specific error types or error classes instead of generic Error',
            severity: 'warning',
            example: line.trim()
          });
        }

        // Check for console.error without context
        if (line.includes('console.error(') && !this.hasErrorContext(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'contextual-error-logging',
            description: 'Add context to error logging for better debugging',
            severity: 'warning',
            example: line.trim()
          });
        }
      });
    }
  }

  private async checkNamingConventions(): Promise<void> {
    const allFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: process.cwd(),
      ignore: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**']
    });

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check component naming
        if (this.hasImproperComponentNaming(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'component-naming-convention',
            description: 'React components should use PascalCase naming',
            severity: 'warning',
            example: line.trim()
          });
        }

        // Check hook naming
        if (this.hasImproperHookNaming(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'hook-naming-convention',
            description: 'Custom hooks should start with "use" and use camelCase',
            severity: 'warning',
            example: line.trim()
          });
        }

        // Check constant naming
        if (this.hasImproperConstantNaming(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'constant-naming-convention',
            description: 'Constants should use UPPER_SNAKE_CASE or camelCase appropriately',
            severity: 'warning',
            example: line.trim()
          });
        }
      });
    }
  }

  private async checkTestPatterns(): Promise<void> {
    const testFiles = await glob('src/**/*.{test,spec}.{ts,tsx}', {
      cwd: process.cwd()
    });

    for (const filePath of testFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for test descriptions
        if (line.includes('it(') && this.hasVagueTestDescription(line)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'descriptive-test-names',
            description: 'Test descriptions should clearly describe the expected behavior',
            severity: 'warning',
            example: line.trim()
          });
        }

        // Check for proper test cleanup
        if (line.includes('afterEach') || line.includes('beforeEach')) {
          // This is good, no violation
        } else if (this.hasStatefulTest(content)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            rule: 'test-isolation',
            description: 'Tests should clean up after themselves to avoid state leakage',
            severity: 'warning'
          });
        }
      });
    }
  }

  // Helper methods for rule checking
  private isAllowedAnyUsage(line: string, filePath: string): boolean {
    return (
      line.includes('// @ts-expect-error') ||
      line.includes('// TODO: type this') ||
      filePath.includes('legacy') ||
      line.includes('JSON.parse') ||
      line.includes('process.env')
    );
  }

  private isAllowedNonNullAssertion(line: string): boolean {
    return (
      line.includes('getElementById') ||
      line.includes('querySelector') ||
      line.includes('process.env.')
    );
  }

  private isAllowedTypeAssertion(line: string): boolean {
    return (
      line.includes('as HTMLElement') ||
      line.includes('as HTMLInputElement') ||
      line.includes('as React.') ||
      line.includes('as ComponentProps')
    );
  }

  private functionHasExplicitReturn(filePath: string, functionLineIndex: number): boolean {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    // Simple check for return statement in next 10 lines
    for (let i = functionLineIndex; i < Math.min(lines.length, functionLineIndex + 10); i++) {
      if (lines[i].includes('return') || lines[i].includes(': ')) {
        return true;
      }
    }
    return false;
  }

  private hasUnhandledAsyncOperation(line: string): boolean {
    return line.includes('await ') && !line.includes('try') && !line.includes('.catch(');
  }

  private hasSpecificError(line: string): boolean {
    return line.includes('Error(') &&
           (line.includes('ValidationError') || line.includes('DatabaseError') ||
            line.includes('ApiError') || line.includes('${'));
  }

  private hasErrorContext(line: string): boolean {
    return line.includes('console.error(') &&
           (line.includes(',') || line.includes('${') || line.includes('+'));
  }

  private hasImproperComponentNaming(line: string): boolean {
    const componentPattern = /export\s+(default\s+)?function\s+([a-z]\w*)/;
    return componentPattern.test(line);
  }

  private hasImproperHookNaming(line: string): boolean {
    const hookPattern = /export\s+(const|function)\s+([a-z]\w*)\s*=/;
    const match = line.match(hookPattern);
    return !!match && !match[2].startsWith('use');
  }

  private hasImproperConstantNaming(line: string): boolean {
    const constantPattern = /const\s+([A-Z]+[a-z]+\w*)\s*=/;
    return constantPattern.test(line) && !line.includes('component') && !line.includes('Component');
  }

  private hasVagueTestDescription(line: string): boolean {
    const vague = ['works', 'test', 'should work', 'is ok', 'passes'];
    return vague.some(phrase => line.toLowerCase().includes(phrase));
  }

  private hasStatefulTest(content: string): boolean {
    return content.includes('global.') || content.includes('window.') ||
           content.includes('localStorage') || content.includes('sessionStorage');
  }

  private reportResults(): void {
    if (this.violations.length === 0) {
      console.log('✅ No type pattern violations found!\n');
      return;
    }

    const errors = this.violations.filter(v => v.severity === 'error');
    const warnings = this.violations.filter(v => v.severity === 'warning');

    console.log(`🔍 Found ${this.violations.length} type pattern issues:\n`);

    // Group by rule for better reporting
    const byRule = this.violations.reduce((acc, violation) => {
      if (!acc[violation.rule]) acc[violation.rule] = [];
      acc[violation.rule].push(violation);
      return acc;
    }, {} as Record<string, TypeViolation[]>);

    // Report strict rules first (errors)
    const strictViolations = Object.entries(byRule).filter(([rule]) =>
      this.strictRules.includes(rule)
    );

    if (strictViolations.length > 0) {
      console.log('❌ CRITICAL VIOLATIONS (must fix):');
      strictViolations.forEach(([rule, violations]) => {
        console.log(`\n  🔴 ${rule} (${violations.length} violations):`);
        violations.slice(0, 3).forEach(v => {
          console.log(`    • ${v.file}:${v.line}`);
          console.log(`      ${v.description}`);
          if (v.example) {
            console.log(`      Example: ${v.example}`);
          }
        });
        if (violations.length > 3) {
          console.log(`    • ... and ${violations.length - 3} more`);
        }
      });
    }

    // Report other violations (warnings)
    const otherViolations = Object.entries(byRule).filter(([rule]) =>
      !this.strictRules.includes(rule)
    );

    if (otherViolations.length > 0) {
      console.log('\n⚠️  CODE QUALITY ISSUES (should fix):');
      otherViolations.forEach(([rule, violations]) => {
        console.log(`\n  🟡 ${rule} (${violations.length} violations):`);
        violations.slice(0, 2).forEach(v => {
          console.log(`    • ${v.file}:${v.line} - ${v.description}`);
        });
        if (violations.length > 2) {
          console.log(`    • ... and ${violations.length - 2} more`);
        }
      });
    }

    console.log(`\n📊 Summary: ${errors.length} errors, ${warnings.length} warnings\n`);

    // Provide improvement suggestions
    console.log('💡 Common fixes:');
    if (byRule['no-any-types']) {
      console.log('  • Replace `any` with specific types or `unknown`');
    }
    if (byRule['no-non-null-assertions']) {
      console.log('  • Add null checks: if (value !== null) { ... }');
    }
    if (byRule['no-type-assertions']) {
      console.log('  • Use type guards: function isType(val): val is Type { ... }');
    }
    if (byRule['no-eslint-disables']) {
      console.log('  • Fix the underlying TypeScript/ESLint issue');
    }

    if (errors.length > 0) {
      console.log('\n❌ Critical type violations must be fixed before merge.');
      process.exit(1);
    } else {
      console.log('\n⚠️  Consider addressing warnings to improve code quality.');
    }
  }
}

// Run the verifier
async function main() {
  const verifier = new TypePatternVerifier();
  await verifier.verify();
}

if (require.main === module) {
  main().catch(console.error);
}