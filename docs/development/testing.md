# Testing Guide

This document provides comprehensive information about the testing infrastructure in Otto AI.

## Overview

Otto AI uses a multi-layered testing approach:

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test interactions between multiple components
3. **E2E Tests**: Test complete user journeys in a browser environment

## Test Structure

```
otto-ai/
├── packages/
│   ├── core/
│   │   ├── __tests__/          # Core package unit tests
│   │   │   ├── script-storage.test.ts
│   │   │   ├── script-executor.test.ts
│   │   │   ├── intent-classifier.test.ts
│   │   │   ├── entity-extractor.test.ts
│   │   │   ├── intent-router.test.ts
│   │   │   └── mcp-client.test.ts
│   │   └── vitest.config.ts
│   │
│   └── web/
│       ├── src/
│       │   ├── services/
│       │   │   └── __tests__/  # Web package service tests
│       │   │       ├── encryption.test.ts
│       │   │       └── csvExport.test.ts
│       │   └── test/
│       │       └── setup.ts    # Test setup and mocks
│       └── vitest.config.ts
│
├── e2e/                        # E2E tests
│   └── example.spec.ts
├── playwright.config.ts        # Playwright configuration
└── .github/workflows/
    └── test.yml                # CI/CD test workflow
```

## Running Tests

### Unit Tests

**Core Package:**
```bash
cd packages/core
npm test                    # Run tests
npm run test:coverage       # Run with coverage
```

**Web Package:**
```bash
cd packages/web
npm test                    # Run tests
npm run test:coverage       # Run with coverage
npm run test:ui             # Interactive UI mode
```

**All Packages:**
```bash
# From root directory
npm test                    # Run all tests
npm run test:coverage       # Run all with coverage
```

### E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npx playwright test --headed
```

## Test Coverage

### Current Coverage Goals

- **Target**: 80%+ code coverage
- **Critical Paths**: 100% coverage
- **All Services**: 80%+ coverage

### Viewing Coverage Reports

After running `npm run test:coverage`, coverage reports are generated in:
- `packages/core/coverage/` - HTML report
- `packages/web/coverage/` - HTML report

Open `coverage/index.html` in a browser to view the detailed report.

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptStorage } from '../src/scripts/storage';

describe('ScriptStorage', () => {
  let storage: ScriptStorage;

  beforeEach(() => {
    storage = new ScriptStorage(':memory:');
  });

  it('should create a script', () => {
    const script = storage.create({
      name: 'Test Script',
      // ... other fields
    });

    expect(script.id).toBeDefined();
    expect(script.name).toBe('Test Script');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { IntentRouter } from '../src/intent/router';
import { ScriptStorage } from '../src/scripts/storage';

describe('IntentRouter Integration', () => {
  it('should route to script execution', async () => {
    const storage = new ScriptStorage(':memory:');
    const router = new IntentRouter(storage);
    
    // Setup test data
    storage.create({ /* ... */ });
    
    // Test routing
    const response = await router.route('calculate my bmi', context);
    
    expect(response.executionResult).toBeDefined();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can create and execute script', async ({ page }) => {
  await page.goto('/');
  
  // Interact with UI
  await page.fill('input[type="text"]', 'calculate my bmi');
  await page.click('button:has-text("Send")');
  
  // Verify result
  await expect(page.locator('.response')).toContainText('BMI');
});
```

## Test Utilities

### Mocking

The test setup file (`packages/web/src/test/setup.ts`) provides:
- `localStorage` mock
- `sessionStorage` mock
- `crypto.subtle` mock for encryption tests

### Test Data

Use factories or fixtures for consistent test data:

```typescript
function createTestScript(overrides = {}) {
  return {
    id: 'test-id',
    name: 'Test Script',
    description: 'Test',
    tags: ['test'],
    triggerPhrases: ['test'],
    parameters: [],
    executionType: 'local',
    code: 'return 42;',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

## CI/CD

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

The CI pipeline:
1. Installs dependencies
2. Builds core package
3. Runs unit tests for core
4. Runs unit tests for web
5. Generates coverage reports
6. Runs linter

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Names**: Use descriptive test names
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock External Dependencies**: Don't make real API calls in tests
5. **Test Edge Cases**: Include error cases and boundary conditions
6. **Keep Tests Fast**: Unit tests should run in < 2 minutes total
7. **Maintain Coverage**: Aim for 80%+ but focus on critical paths

## Debugging Tests

### Vitest

```bash
# Run specific test file
npm test -- script-storage.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with verbose output
npm test -- --reporter=verbose
```

### Playwright

```bash
# Run in headed mode
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug

# Run specific test
npx playwright test example.spec.ts
```

## Troubleshooting

### Tests Failing Locally

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules packages/*/node_modules
   npm install
   ```

2. Clear test cache:
   ```bash
   npm test -- --clearCache
   ```

3. Check for TypeScript errors:
   ```bash
   npm run build
   ```

### E2E Tests Failing

1. Ensure dev server is running:
   ```bash
   npm run dev
   ```

2. Check Playwright browser installation:
   ```bash
   npx playwright install
   ```

3. Run with headed mode to see what's happening:
   ```bash
   npx playwright test --headed
   ```

## Future Improvements

- [ ] Add visual regression testing
- [ ] Add performance benchmarks
- [ ] Add accessibility testing
- [ ] Add API contract testing
- [ ] Increase E2E test coverage

---

*Last Updated: 2025-01-30*

