#!/usr/bin/env tsx
/**
 * MCP-Enhanced Migration Validation Script
 * 
 * Validates database state after migration and ensures all systems work.
 * Checks schema consistency, RLS policies, and application connectivity.
 */

import { execSync } from 'child_process';

interface ValidationResult {
  passed: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>;
}

async function validateMigration(): Promise<ValidationResult> {
  console.log('🔍 Validating migration results...');
  
  const result: ValidationResult = {
    passed: true,
    checks: []
  };
  
  try {
    // Check 1: Database connectivity
    await checkDatabaseConnectivity(result);
    
    // Check 2: Schema consistency
    await checkSchemaConsistency(result);
    
    // Check 3: RLS policies
    await checkRLSPolicies(result);
    
    // Check 4: Application health
    await checkApplicationHealth(result);
    
    // Check 5: Type generation
    await checkTypeGeneration(result);
    
    // Summary
    const failedChecks = result.checks.filter(c => c.status === 'fail');
    const warningChecks = result.checks.filter(c => c.status === 'warning');
    
    result.passed = failedChecks.length === 0;
    
    console.log('\n📋 Validation Summary:');
    console.log(`✅ Passed: ${result.checks.filter(c => c.status === 'pass').length}`);
    console.log(`⚠️  Warnings: ${warningChecks.length}`);
    console.log(`❌ Failed: ${failedChecks.length}`);
    
    if (!result.passed) {
      console.log('\n❌ Migration validation failed. Review issues above.');
      process.exit(1);
    } else if (warningChecks.length > 0) {
      console.log('\n⚠️  Migration completed with warnings. Review above.');
    } else {
      console.log('\n✅ Migration validation completed successfully!');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    result.passed = false;
    return result;
  }
}

async function checkDatabaseConnectivity(result: ValidationResult): Promise<void> {
  try {
    // Test database connection via API
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    
    if (response.ok && data.database === 'connected') {
      result.checks.push({
        name: 'Database Connectivity',
        status: 'pass',
        message: 'Database connection successful'
      });
    } else {
      result.checks.push({
        name: 'Database Connectivity',
        status: 'fail',
        message: 'Database connection failed'
      });
    }
  } catch (error) {
    result.checks.push({
      name: 'Database Connectivity',
      status: 'fail',
      message: `Connection error: ${error}`
    });
  }
}

async function checkSchemaConsistency(result: ValidationResult): Promise<void> {
  try {
    // Run TypeScript check to ensure schema types are valid
    execSync('pnpm typecheck', { stdio: 'pipe' });
    
    result.checks.push({
      name: 'Schema Type Consistency',
      status: 'pass',
      message: 'TypeScript compilation successful'
    });
  } catch (error) {
    result.checks.push({
      name: 'Schema Type Consistency',
      status: 'fail',
      message: 'TypeScript compilation failed - schema types may be inconsistent'
    });
  }
}

async function checkRLSPolicies(result: ValidationResult): Promise<void> {
  // This would use MCP to verify RLS policies are intact
  // For now, add a warning to manually verify
  result.checks.push({
    name: 'RLS Policies',
    status: 'warning',
    message: 'Manual verification required - check RLS policies in Supabase dashboard'
  });
}

async function checkApplicationHealth(result: ValidationResult): Promise<void> {
  try {
    // Test core application functionality
    const testCommands = [
      'pnpm lint',
      'pnpm test'
    ];
    
    for (const cmd of testCommands) {
      try {
        execSync(cmd, { stdio: 'pipe' });
      } catch (error) {
        result.checks.push({
          name: `Application Health (${cmd})`,
          status: 'fail',
          message: `Command failed: ${cmd}`
        });
        return;
      }
    }
    
    result.checks.push({
      name: 'Application Health',
      status: 'pass',
      message: 'Lint and tests passing'
    });
    
  } catch (error) {
    result.checks.push({
      name: 'Application Health',
      status: 'fail',
      message: `Health check failed: ${error}`
    });
  }
}

async function checkTypeGeneration(result: ValidationResult): Promise<void> {
  try {
    // Verify Drizzle can generate types from current schema
    execSync('npx drizzle-kit introspect', { stdio: 'pipe' });
    
    result.checks.push({
      name: 'Type Generation',
      status: 'pass',
      message: 'Drizzle introspection successful'
    });
  } catch (error) {
    result.checks.push({
      name: 'Type Generation',
      status: 'fail',
      message: 'Drizzle introspection failed'
    });
  }
}

if (require.main === module) {
  validateMigration().catch(console.error);
}

export { validateMigration };