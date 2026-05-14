# API Route Testing Guide

## Overview

This guide explains how to write tests for Next.js API Routes in this project. All API Routes should follow the standardized response format and be thoroughly tested.

## Test Framework

- **Jest**: Used for unit testing API Routes
- **Test Environment**: Node.js (for server-side code)
- **Location**: Test files should be placed next to the route file: `route.test.ts`

## Test Structure

### Basic Test Template

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { GET } from './route';
import { ErrorCode } from '@/lib/api/response';

// Helper function to create a Request object for testing
function createTestRequest(url: string): Request {
  return new Request(url, {
    method: 'GET',
  });
}

describe('GET /api/example', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up test environment
    process.env = {
      ...process.env,
      API_KEY: 'test-key',
    };
    // Mock global fetch
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Your tests here
});
```

## Test Categories

### 1. Parameter Validation Tests

Test all required and optional parameters:

```typescript
describe('Parameter Validation', () => {
  it('should return error when required parameter is missing', async () => {
    const req = createTestRequest('http://localhost/api/example');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe(ErrorCode.MISSING_PARAMETER);
  });

  it('should return error when parameter is invalid', async () => {
    const req = createTestRequest('http://localhost/api/example?page=invalid');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe(ErrorCode.INVALID_PARAMETER);
  });
});
```

### 2. Environment Variable Tests

Test API key and configuration validation:

```typescript
describe('API Key Validation', () => {
  it('should return error when API key is not configured', async () => {
    delete process.env.API_KEY;

    const req = createTestRequest('http://localhost/api/example?page=1');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });
});
```

### 3. Third-Party API Integration Tests

Mock external API calls:

```typescript
describe('Third-Party API Integration', () => {
  it('should successfully fetch and return data', async () => {
    const mockData = { data: [] };

    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const req = createTestRequest('http://localhost/api/example?page=1');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe(ErrorCode.SUCCESS);
    expect(data.data).toEqual(mockData);
  });

  it('should handle third-party API errors', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Error message',
    } as Response);

    const req = createTestRequest('http://localhost/api/example?page=1');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
  });
});
```

### 4. Error Handling Tests

Test different error scenarios:

```typescript
describe('Error Handling', () => {
  it('should handle network errors', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    );

    const req = createTestRequest('http://localhost/api/example?page=1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it('should handle JSON parsing errors', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Invalid JSON');
      },
    } as Response);

    const req = createTestRequest('http://localhost/api/example?page=1');
    const response = await GET(req);
    const data = await response.json();

    expect(data.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
  });
});
```

### 5. Response Format Tests

Verify standardized response format:

```typescript
describe('Response Format', () => {
  it('should return standardized response format on success', async () => {
    // Mock successful response
    const req = createTestRequest('http://localhost/api/example?page=1');
    const response = await GET(req);
    const data = await response.json();

    expect(data).toHaveProperty('code');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('data');
    expect(data.code).toBe(ErrorCode.SUCCESS);
  });

  it('should return standardized response format on error', async () => {
    const req = createTestRequest('http://localhost/api/example');
    const response = await GET(req);
    const data = await response.json();

    expect(data).toHaveProperty('code');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('data');
    expect(data.code).not.toBe(0);
  });
});
```

## Mocking Best Practices

### Mocking Fetch

```typescript
// Success response
(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: [] }),
} as Response);

// Error response
(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
  ok: false,
  status: 500,
  statusText: 'Internal Server Error',
  text: async () => 'Error message',
} as Response);

// Network error
(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
  new TypeError('Failed to fetch'),
);
```

### Mocking Environment Variables

```typescript
beforeEach(() => {
  process.env = {
    ...process.env,
    API_KEY: 'test-key',
  };
});

afterEach(() => {
  // Restore original environment
  process.env = originalEnv;
});
```

## Running Tests

```bash
# Run all tests
npm run test:jest

# Run a specific test file
# Note: Choose an existing `route.test.ts` file in this repo.
# Example (update if paths change):
# npm run test:jest -- src/app/api/jv1/get-avatars/route.test.ts

# Run tests in watch mode
npm run test:jest -- --watch
```

## Test Coverage Goals

Aim for:

- **Parameter validation**: 100% coverage
- **Error handling**: All error paths tested
- **Success scenarios**: At least one happy path
- **Response format**: Verify standardized format

## Example: Complete Test File

There is no single canonical "example route test" file guaranteed to exist over time.
Use the template in this guide and model your tests after any existing `route.test.ts`
in `src/app/api/**`.

- Parameter validation tests
- API key validation
- Third-party API integration tests
- Error handling tests
- Response format verification

## Common Patterns

### Testing Query Parameters

```typescript
it('should pass query parameters correctly', async () => {
  const req = createTestRequest(
    'http://localhost/api/example?page=1&page_size=10&filter=active',
  );

  await GET(req);

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('page=1&page_size=10&filter=active'),
    expect.any(Object),
  );
});
```

### Testing Response Status Codes

```typescript
// Success
expect(response.status).toBe(200);
expect(data.code).toBe(ErrorCode.SUCCESS);

// Client error
expect(response.status).toBe(400);
expect(data.code).toBe(ErrorCode.MISSING_PARAMETER);

// Server error
expect(response.status).toBe(500);
expect(data.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
```

## Notes

- Always use `createTestRequest()` helper to create Request objects
- Mock `global.fetch` for all external API calls
- Verify both HTTP status codes and custom error codes
- Test edge cases (empty strings, null values, out of range, etc.)
- Ensure all tests clean up after themselves (use `afterEach`)
