/**
 * Example demonstrating the reApply method
 * 
 * NOTE: This file depends on having the reApply method implemented
 * in named_args.ts as described in reapply-implementation.md
 */
import { createNamedArguments } from '../src/named_args';

// Define interface with nested properties
interface RequestOptions {
  headers: {
    contentType: string;
    accept: string;
    authorization?: string;
  };
  timeout?: number;
  retries?: {
    count: number;
    delay: number;
  };
  cache?: boolean;
}

interface LogOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  destination?: 'console' | 'file';
}

// Function that takes complex options
function makeRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  options: RequestOptions,
  logOptions: LogOptions
): string {
  console.log(`${method} ${url}`);
  console.log('Options:', JSON.stringify(options, null, 2));
  console.log('Log options:', JSON.stringify(logOptions, null, 2));
  return `${method} ${url}`;
}

// Create named arguments
const [args, namedRequest] = createNamedArguments<
  typeof makeRequest,
  {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    options: RequestOptions;
    logOptions: LogOptions;
  }
>(makeRequest);

console.log('Example 1: Basic request configuration');

// Start with basic request configuration
const baseClient = namedRequest.partial(
  args.method('POST'),
  args.options({
    headers: {
      contentType: 'application/json',
      accept: 'application/json'
    }
  }),
  args.logOptions({
    level: 'info',
    format: 'json'
  })
);

console.log('Example 2: Add authentication with reApply');

// Add authentication using reApply
const authClient = baseClient.reApply(args.options, (prev) => ({
  ...prev,
  headers: {
    ...prev.headers,
    authorization: 'Bearer token123'
  }
}));

console.log('Example 3: Add retry logic with reApply');

// Add retry logic using reApply
const retryClient = authClient.reApply(args.options, (prev) => ({
  ...prev,
  retries: {
    count: 3,
    delay: 1000
  },
  cache: false
}));

// Update logging options
const debugClient = retryClient.reApply(args.logOptions, (prev) => ({
  ...prev,
  level: 'debug' as const,
  destination: 'console' as const
}));

console.log('Example 4: Final request with all options');

// Make the final request
const result = debugClient(
  args.url('https://api.example.com/data')
);

console.log('Result:', result);