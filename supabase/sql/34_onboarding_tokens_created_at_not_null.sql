-- Migration: Make onboarding_tokens.created_at NOT NULL
-- Description: The created_at column has a DEFAULT NOW() but was incorrectly nullable.
--              This migration makes it NOT NULL to match the schema intent and fix TypeScript type safety.
-- Date: 2025-10-05

-- Step 1: Ensure all existing rows have a created_at value (should already be the case due to DEFAULT)
UPDATE onboarding_tokens
SET created_at = NOW()
WHERE created_at IS NULL;

-- Step 2: Add NOT NULL constraint
ALTER TABLE onboarding_tokens
ALTER COLUMN created_at SET NOT NULL;

-- Verification comment: This ensures TypeScript infers created_at as Date instead of Date | null
