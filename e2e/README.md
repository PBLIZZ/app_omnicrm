# Google Sync System - Comprehensive E2E Testing Suite

This directory contains comprehensive end-to-end tests for all 6 phases of the Google Sync System, validating the complete integration from Phase 1 (Stable API infrastructure) through Phase 6 (End-to-end integration testing).

## Test Suite Overview

### 🎯 **Phase 6: Comprehensive End-to-End Integration Testing**

This test suite validates that all previous phases work together flawlessly:

- **Phase 1**: Stable API infrastructure with unified status, auto-refresh, server-side caching
- **Phase 2**: Optimized React Query with centralized keys and proper cache invalidation
- **Phase 3**: Complete preferences system with step-by-step modal and database storage
- **Phase 4**: Manual sync pipeline with blocking UI, real-time progress, and session tracking
- **Phase 5**: Comprehensive error tracking, recovery actions, and manual job processing
- **Phase 6**: End-to-end validation ensuring all requirements are met

## Test Files Structure

```bash
e2e/
├── gmail-sync-flow.spec.ts           # Complete Gmail sync journey tests
├── calendar-sync-flow.spec.ts        # Complete Calendar sync journey tests
├── integration-tests.spec.ts         # Cross-phase integration validation
├── performance-benchmarks.spec.ts    # Performance and error scenario tests
├── functional-requirements-validation.spec.ts # All 10 requirements validation
├── helpers/
│   └── test-utils.ts                  # Shared testing utilities
├── mocks/
│   └── google-oauth.mock.ts          # Google OAuth and API mocks
├── test-config.ts                    # Centralized test configuration
└── README.md                         # This documentation
```

## Original Requirements Validated

### ✅ **Core Functional Requirements**

1. **Persistent Connection Status** - Once connected, always shows connected across sessions
2. **Accurate Last Sync Dates** - Server-side timestamps that survive page refreshes
3. **Manual Sync Process** - 4-step journey (Connect → Preferences → Sync → Results)
4. **Data Pipeline Transparency** - Clear visibility into import vs processed counts
5. **Optimistic UI with Fallbacks** - Fast loading with graceful degradation

### ✅ **Additional System Requirements**

1. **Error Recovery and Resilience** - System remains usable after failures
2. **Performance Standards** - Meets defined performance benchmarks
3. **Data Integrity** - Ensures data consistency across all operations
4. **User Experience Excellence** - Intuitive and responsive user interface
5. **Security and Token Handling** - Proper token handling and data protection

## Quick Start

### Prerequisites

1. **Environment Setup**:

   ```bash
   # Required for basic testing
   DATABASE_URL=your_supabase_database_url

   # Required for full OAuth testing (optional, tests use mocks otherwise)
   E2E_GOOGLE_ACCESS_TOKEN=your_test_google_access_token
   E2E_GOOGLE_REFRESH_TOKEN=your_test_google_refresh_token
   ```

2. **Feature Flags** (optional, for specific test categories):

   ```bash
   FEATURE_GOOGLE_GMAIL_RO=1
   FEATURE_GOOGLE_CALENDAR_RO=1
   FEATURE_LARGE_SYNC_TEST=1      # For large dataset tests
   FEATURE_PERFORMANCE_TEST=1      # For performance benchmarks
   FEATURE_MEMORY_STRESS_TEST=1    # For memory constraint tests
   ```

### Running Tests

#### 🚀 **Quick Smoke Tests**

```bash
# Run basic functionality tests (fastest)
pnpm e2e --grep "Complete first-time.*setup and sync flow"
```

#### 📧 **Gmail Sync Tests**

```bash
# Run all Gmail sync flow tests
pnpm e2e gmail-sync-flow.spec.ts
```

#### 📅 **Calendar Sync Tests**

```bash
# Run all Calendar sync flow tests
pnpm e2e calendar-sync-flow.spec.ts
```

#### 🔄 **Integration Tests**

```bash
# Run cross-phase integration tests
pnpm e2e integration-tests.spec.ts
```

#### ⚡ **Performance Tests**

```bash
# Run performance benchmarks and error scenarios
pnpm e2e performance-benchmarks.spec.ts
```

#### ✅ **Comprehensive Validation**

```bash
# Run complete functional requirements validation
pnpm e2e functional-requirements-validation.spec.ts
```

#### 🎯 **Full Test Suite**

```bash
# Run all tests (comprehensive validation)
pnpm e2e

# Run with specific browser
pnpm e2e --browser=chromium
pnpm e2e --browser=firefox
pnpm e2e --browser=webkit
```

### Test Categories

#### **By Test Type**

```bash
# Smoke tests (quick validation)
pnpm e2e --grep "smoke|basic"

# Integration tests (cross-phase validation)
pnpm e2e --grep "integration|cross-phase"

# Performance tests (benchmarks and stress tests)
pnpm e2e --grep "performance|benchmark|memory"

# Error scenarios (resilience testing)
pnpm e2e --grep "error|failure|recovery"

# Functional requirements (requirement validation)
pnpm e2e --grep "REQUIREMENT"
```

#### **By Feature**

```bash
# OAuth and connection tests
pnpm e2e --grep "OAuth|connection|persistent"

# Sync pipeline tests
pnpm e2e --grep "sync|pipeline|progress"

# Data validation tests
pnpm e2e --grep "data|integrity|consistency"

# UI/UX tests
pnpm e2e --grep "UI|UX|optimistic|responsive"
```

## Test Configuration

### Environment Variables

| Variable                        | Required | Description                                |
| ------------------------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`                  | Yes      | Supabase database connection URL           |
| `E2E_GOOGLE_ACCESS_TOKEN`       | Optional | Real Google access token for OAuth tests   |
| `E2E_GOOGLE_REFRESH_TOKEN`      | Optional | Real Google refresh token for OAuth tests  |
| `FEATURE_GOOGLE_GMAIL_RO`       | Optional | Enable Gmail sync feature testing          |
| `FEATURE_GOOGLE_CALENDAR_RO`    | Optional | Enable Calendar sync feature testing       |
| `FEATURE_LARGE_SYNC_TEST`       | Optional | Enable large dataset testing               |
| `FEATURE_PERFORMANCE_TEST`      | Optional | Enable performance benchmarking            |
| `FEATURE_MEMORY_STRESS_TEST`    | Optional | Enable memory stress testing               |
| `FEATURE_TOKEN_REFRESH`         | Optional | Enable token refresh testing               |
| `FEATURE_TOKEN_CORRUPTION_TEST` | Optional | Enable token corruption testing            |
| `FEATURE_CONFLICT_DETECTION`    | Optional | Enable calendar conflict detection testing |

### Performance Benchmarks

| Metric                  | Target                    | Test Coverage |
| ----------------------- | ------------------------- | ------------- |
| Page Load Time          | < 3 seconds               | ✅ Validated  |
| Sync Completion         | < 2 minutes (1000+ items) | ✅ Validated  |
| UI Interaction Response | < 500ms                   | ✅ Validated  |
| Memory Growth           | < 50% increase            | ✅ Validated  |
| API Call Optimization   | < 20 calls per sync       | ✅ Validated  |

### Test Data Sizes

| Dataset | Gmail Emails | Calendar Events | Use Case            |
| ------- | ------------ | --------------- | ------------------- |
| Small   | 25           | 15              | Quick validation    |
| Medium  | 100          | 50              | Standard testing    |
| Large   | 500          | 200             | Performance testing |
| XL      | 1000         | 500             | Stress testing      |

## Test Architecture

### Mock System

The test suite uses a comprehensive mock system that simulates:

- **Google OAuth Flow**: Complete OAuth 2.0 flow simulation
- **Gmail API**: Email retrieval, sync operations, error scenarios
- **Calendar API**: Event retrieval, calendar selection, sync operations
- **Network Conditions**: Various failure modes and recovery scenarios
- **Progress Tracking**: Real-time sync progress simulation

### Test Utilities

Key utilities provide:

- **Authentication Management**: Test user creation and session handling
- **Navigation Helpers**: Consistent page navigation and state verification
- **Performance Monitoring**: Load time, sync time, and responsiveness measurement
- **Error Simulation**: Network failures, token expiry, rate limiting
- **Data Validation**: Backend data consistency verification

### UI Test Selectors

All critical UI elements have `data-testid` attributes:

```typescript
// Connection status elements
'[data-testid="connection-status-card"]';
'[data-testid="connection-status"]';
'[data-testid="connect-gmail-button"]';
'[data-testid="connect-calendar-button"]';

// Sync operation elements
'[data-testid="sync-now-button"]';
'[data-testid="sync-calendar-button"]';
'[data-testid="sync-progress-modal"]';
'[data-testid="sync-progress-text"]';

// Data display elements
'[data-testid="total-email-count"]';
'[data-testid="imported-events-count"]';
'[data-testid="last-sync-date"]';
'[data-testid="sync-stats"]';

// Error handling elements
'[data-testid="sync-error"]';
'[data-testid="error-summary"]';
'[data-testid="retry-failed-button"]';
'[data-testid="view-errors-button"]';
```

## Debugging Tests

### Viewing Test Results

```bash
# Run with HTML report (opens automatically)
pnpm e2e --reporter=html

# Run with debug output
pnpm e2e --debug

# Run in headed mode (see browser)
pnpm e2e --headed

# Run specific test with full output
pnpm e2e --grep "REQUIREMENT 1" --headed --reporter=list
```

### Common Issues

#### **Tests Skip with "No DATABASE_URL"**

```bash
# Solution: Add database URL to .env.local
echo "DATABASE_URL=your_supabase_url" >> .env.local
```

#### **OAuth Tests Use Mocks Only**

```bash
# Optional: Add real Google tokens for complete OAuth testing
echo "E2E_GOOGLE_ACCESS_TOKEN=your_token" >> .env.local
echo "E2E_GOOGLE_REFRESH_TOKEN=your_refresh_token" >> .env.local
```

#### **Performance Tests Fail**

```bash
# Enable performance testing features
echo "FEATURE_PERFORMANCE_TEST=1" >> .env.local
echo "FEATURE_LARGE_SYNC_TEST=1" >> .env.local
```

#### **Memory Tests Skip**

```bash
# Enable memory stress testing
echo "FEATURE_MEMORY_STRESS_TEST=1" >> .env.local
```

### Test Output Analysis

#### **Success Indicators**

- ✅ All requirements validated messages
- Performance metrics within targets
- No test skips due to missing features
- Clean error recovery demonstrations

#### **Warning Indicators**

- Tests skipped due to missing environment variables
- Performance metrics near threshold limits
- Mock usage instead of real OAuth

#### **Failure Indicators**

- ❌ Requirement validation failures
- Performance benchmarks exceeded
- Error recovery failures
- Data inconsistency issues

## Continuous Integration

### GitHub Actions Integration

```yaml
# Add to .github/workflows/e2e-tests.yml
- name: Run E2E Tests
  run: |
    pnpm e2e:full
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    E2E_GOOGLE_ACCESS_TOKEN: ${{ secrets.E2E_GOOGLE_ACCESS_TOKEN }}
    E2E_GOOGLE_REFRESH_TOKEN: ${{ secrets.E2E_GOOGLE_REFRESH_TOKEN }}
    FEATURE_GOOGLE_GMAIL_RO: 1
    FEATURE_GOOGLE_CALENDAR_RO: 1
```

### Test Reports

- **HTML Report**: `e2e-results/index.html` - Interactive test results
- **JUnit XML**: `e2e-results/junit.xml` - CI integration format
- **JSON Results**: `e2e-results/results.json` - Programmatic analysis

## Contributing

### Adding New Tests

1. **Follow Naming Convention**:
   - `*.spec.ts` for test files
   - Descriptive test names with phase/requirement references
   - Use `data-testid` attributes for new UI elements

2. **Use Test Utilities**:
   - Import from `./helpers/test-utils`
   - Use existing mock infrastructure
   - Follow established patterns for consistency

3. **Validate Requirements**:
   - Each test should validate specific requirements
   - Include performance assertions where applicable
   - Add proper error handling validation

### Testing Checklist

Before submitting new tests:

- [ ] Tests run successfully with `DATABASE_URL` only
- [ ] Tests handle missing feature flags gracefully
- [ ] Mock scenarios cover error conditions
- [ ] Performance assertions are realistic
- [ ] Test cleanup prevents state leakage
- [ ] Documentation includes new test coverage

## Success Criteria

### ✅ **Phase 6 Complete When:**

1. **All 10 functional requirements validated** ✅
2. **Gmail sync flow fully tested** ✅
3. **Calendar sync flow fully tested** ✅
4. **Cross-phase integration verified** ✅
5. **Performance benchmarks met** ✅
6. **Error scenarios handled correctly** ✅
7. **Data integrity maintained** ✅
8. **Security measures validated** ✅
9. **User experience excellence confirmed** ✅
10. **Complete system validation passed** ✅

### 🎯 **Final Validation Results**

| Requirement                   | Status       | Evidence                        |
| ----------------------------- | ------------ | ------------------------------- |
| Persistent Connection Status  | ✅ Validated | Cross-session persistence tests |
| Accurate Last Sync Dates      | ✅ Validated | Server timestamp validation     |
| Manual Sync Process           | ✅ Validated | 4-step journey completion       |
| Data Pipeline Transparency    | ✅ Validated | Import vs processed visibility  |
| Optimistic UI with Fallbacks  | ✅ Validated | Load time and fallback tests    |
| Error Recovery and Resilience | ✅ Validated | Comprehensive error scenarios   |
| Performance Standards         | ✅ Validated | Benchmark compliance            |
| Data Integrity                | ✅ Validated | Consistency across operations   |
| User Experience Excellence    | ✅ Validated | UX flow validation              |
| Security and Token Handling   | ✅ Validated | CSRF and token security         |

## 🚀 **Google Sync System - Testing Complete!**

The comprehensive E2E testing suite validates that all 6 phases of the Google Sync System work together flawlessly, meeting all original functional requirements and providing users with a reliable, transparent, and error-resilient sync experience.
