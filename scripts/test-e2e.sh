#!/bin/bash

# E2E Test Runner Script
# This script runs e2e tests with proper environment configuration

set -e

# Default E2E_USER_ID if not set
export E2E_USER_ID="${E2E_USER_ID:-3550f627-dbd7-4c5f-a13f-e59295c14676}"

# Load environment from .env.local and run playwright tests
echo "Running E2E tests with user ID: $E2E_USER_ID"
echo "Loading environment from .env.local"

# Run with dotenv-cli to ensure environment variables are loaded
pnpm dotenv -e .env.local -- playwright test "$@"