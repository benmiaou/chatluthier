# ChatLuthier Testing Guide

## Overview

This project uses a multi-layered testing approach:

1. **Jest Unit & Service Tests** — Test individual functions and components
2. **Integration Tests** — Test full workflows with real servers/databases
3. **End-to-End (E2E)** — Test complete user flows

## Running Tests

### Run all tests (Jest + integration)

```bash
npm test
```

### Run Jest tests only (with coverage)

```bash
npm run test:jest -- --coverage
```

### Run specific Jest project

```bash
npm run test:jest:unit     # Backend unit tests only
npm run test:jest:frontend # Frontend component tests only
```

### Run specific test file

```bash
npm run test:jest -- tests/jest/unit/authController.test.js
```

### Watch mode (re-run on file changes)

```bash
npm run test:jest -- --watch
```

### Integration tests (requires running server)

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run integration tests
npm run test:auth          # Authentication flow
npm run test:jwt           # JWT token handling
npm run test:cookies       # Cookie transmission
```

## Test Structure

```
tests/
├── jest/
│   ├── __mocks__/          # Mock files (CSS, images)
│   ├── utils/
│   │   └── testHelpers.js  # Shared factories and assertions
│   ├── setup.js            # Jest setup (jsdom config, globals)
│   ├── unit/               # Backend unit tests (Node environment)
│   │   ├── authController.test.js
│   │   ├── soundController.test.js
│   │   ├── requestController.test.js
│   │   ├── socketServer.test.js
│   │   └── ...
│   └── frontend/           # Frontend component tests (jsdom)
│       ├── BackgroundMusic.test.tsx
│       ├── AmbianceSounds.test.tsx
│       ├── AuthButtons.test.tsx
│       └── ...
├── test_*.js               # Integration tests (require running server)
├── run_all_tests.js        # Test runner orchestrator
└── README.md              # This file
```

## Test Helpers (testHelpers.js)

Reusable utilities for writing tests quickly:

### Mock Data Factories

```javascript
import {
  createMockUser,
  createMockSound,
  createMockToken,
  createMockRequest,
  createMockResponse,
} from '../utils/testHelpers';

// Create test data
const user = createMockUser({ pseudo: 'TestAdmin', isAdmin: true });
const sound = createMockSound({ display_name: 'Forest Ambiance' });
const token = createMockToken(user);
const req = createMockRequest({ body: { userId: user.userId } });
const res = createMockResponse();
```

### Assertion Helpers

```javascript
import {
  expectResponse,
  expectErrorResponse,
  expectValidToken,
  decodeToken,
} from '../utils/testHelpers';

// Assert responses
expectResponse(res, 200, { success: true });
expectErrorResponse(res, 401, 'Unauthorized');
expectValidToken(token);
const payload = decodeToken(token);
```

## Writing Unit Tests

### Backend (Node/CommonJS)

```javascript
// tests/jest/unit/myFeature.test.js
const { createMockRequest, createMockResponse } = require('../utils/testHelpers');

jest.mock('../../../srv/database/db');
jest.mock('../../../srv/utils/logger');

const controller = require('../../../srv/controllers/myController');
const db = require('../../../srv/database/db');

describe('myController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful operation', async () => {
    db.query = jest.fn().mockResolvedValue([{ id: 1, name: 'Test' }]);

    const req = createMockRequest({ body: { name: 'Test' } });
    const res = createMockResponse();

    await controller.doSomething(req, res);

    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    db.query = jest.fn().mockRejectedValue(new Error('DB error'));

    const req = createMockRequest();
    const res = createMockResponse();

    await controller.doSomething(req, res);

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    expect(res.body).toHaveProperty('error');
  });
});
```

### Frontend (React/TypeScript)

```typescript
// tests/jest/frontend/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '../../../src/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('should update state on input', () => {
    render(<MyComponent />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'new value' } });
    expect(input).toHaveValue('new value');
  });
});
```

## Coverage Targets

The project aims for:

- **Backend**: ≥70% coverage
- **Frontend**: ≥60% coverage

Current thresholds (enforced):

- **Backend**: 50% (global)
- **Frontend**: 40% (global)

View coverage report:

```bash
npm run test:jest -- --coverage
open coverage/index.html
```

## Mocking Patterns

### Mocking Modules

```javascript
jest.mock('../../../srv/database/db');
const db = require('../../../srv/database/db');

db.query = jest.fn().mockResolvedValue([{ id: 1 }]);
```

### Mocking External Services

```javascript
jest.mock('../../../srv/config/secret', () => {
  return () => ({
    accessTokenSecret: 'test-secret',
    refreshTokenSecret: 'test-refresh-secret',
  });
});
```

### Mocking Async Operations

```javascript
const mockAsync = jest
  .fn()
  .mockResolvedValueOnce({ success: true }) // First call
  .mockResolvedValueOnce({ success: false }); // Second call

// or for errors
jest.fn().mockRejectedValue(new Error('Failed'));
```

## Common Test Scenarios

### Testing Authentication

```javascript
const user = createMockUser({ isAdmin: true });
const token = createMockToken(user, accessTokenSecret);

const req = createMockRequest({
  cookies: { accessToken: token },
});
const res = createMockResponse();

authController.checkSession(req, res);
expect(res.body.isSignedIn).toBe(true);
```

### Testing Database Operations

```javascript
db.query = jest
  .fn()
  .mockResolvedValueOnce([{ id: 1, name: 'Item 1' }])
  .mockResolvedValueOnce([{ id: 2, name: 'Item 2' }]);

const result1 = await controller.getItems();
const result2 = await controller.getItems();

expect(result1[0].name).toBe('Item 1');
expect(result2[0].name).toBe('Item 2');
```

### Testing Error Handling

```javascript
db.query = jest.fn().mockRejectedValue(new Error('DB connection failed'));

const req = createMockRequest();
const res = createMockResponse();

await controller.doSomething(req, res);

expect(res.statusCode).toBeGreaterThanOrEqual(500);
expect(res.body.error).toContain('DB connection failed');
```

## Integration Testing

For testing full workflows with running servers:

```javascript
// tests/test_workflow.js
const http = require('node:http');

async function runTest() {
  try {
    // Test 1: Create resource
    const createRes = await fetch('http://localhost:3000/api/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    expect(createRes.status).toBe(201);

    // Test 2: Fetch resource
    const getRes = await fetch('http://localhost:3000/api/resource/1');
    expect(getRes.status).toBe(200);

    console.log('✅ Workflow test passed');
  } catch (error) {
    console.error('❌ Workflow test failed:', error);
    process.exit(1);
  }
}

runTest();
```

## Debugging Tests

### Run with verbose output

```bash
npm run test:jest -- --verbose
```

### Run specific test

```bash
npm run test:jest -- --testNamePattern="should verify valid token"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--testPathPattern=authController"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Then set breakpoints and press F5.

## Best Practices

1. **Test behavior, not implementation** — Test what the code does, not how it does it
2. **Use descriptive test names** — `should return 401 when token is invalid` not `test1`
3. **One assertion per concept** — Group related assertions, but keep tests focused
4. **Mock external dependencies** — Don't test database or external APIs directly
5. **Clean up after tests** — Use `beforeEach` to reset mocks and state
6. **Keep tests fast** — Unit tests should run in milliseconds
7. **Use factories for data** — Reusable mock data reduces duplication

## Continuous Integration

When added to GitHub Actions:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:jest -- --coverage
      - run: npm test # Run integration tests
```

## Troubleshooting

### "Cannot find module" errors

- Ensure mock paths are correct: `jest.mock('../../../srv/path/module')`
- Check that file actually exists

### Tests timeout

- Increase timeout: `jest.setTimeout(10000)`
- Check for infinite loops or missing `await`

### Coverage not reporting

- Ensure `collectCoverageFrom` is set in jest.config.cjs
- Run with `--coverage` flag

### Import.meta issues in tests

- Use Babel for transforming TypeScript/JSX
- Babel is already configured for frontend tests

---

## Next Steps

- [ ] Add snapshot tests for UI components
- [ ] Add E2E tests with Playwright
- [ ] Setup GitHub Actions CI with test reporting
- [ ] Add performance benchmarks
- [ ] Increase coverage to 80%+
