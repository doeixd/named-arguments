/**
 * Options Objects and Flattening Example
 * 
 * This example demonstrates:
 * 1. Working with complex options objects
 * 2. Flattening nested properties for easier access
 * 3. Type-safe partial application with optional properties
 * 4. Combining flattened and regular properties
 */
import { createNamedArguments } from '../src/named_args';

// Define some complex types for our example
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
  filename?: string; // Only required if destination is 'file'
}

// Function that uses complex option objects
function makeRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  requestOptions: RequestOptions,
  logOptions?: LogOptions
): string {
  // We're just returning a string representation for this example
  const headersStr = JSON.stringify(requestOptions.headers);
  const timeoutStr = requestOptions.timeout ? `timeout=${requestOptions.timeout}ms` : 'no timeout';
  const retriesStr = requestOptions.retries 
    ? `retries=${requestOptions.retries.count}, delay=${requestOptions.retries.delay}ms` 
    : 'no retries';
  const cacheStr = `cache=${requestOptions.cache ? 'enabled' : 'disabled'}`;
  
  const logStr = logOptions 
    ? `logging=${logOptions.level}, format=${logOptions.format || 'default'}, to=${logOptions.destination || 'console'}`
    : 'no logging';
  
  return `${method} ${url} with ${headersStr}, ${timeoutStr}, ${retriesStr}, ${cacheStr}, ${logStr}`;
}

// Create named arguments with flattening
const [args, namedRequest] = createNamedArguments<
  typeof makeRequest,
  {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    requestOptions: RequestOptions;
    logOptions?: LogOptions;
  }
>(
  makeRequest,
  [
    { name: 'url', required: true },
    { name: 'method', required: true },
    { name: 'requestOptions', required: true },
    { name: 'logOptions', required: false }
  ],
  {
    // Flatten some commonly used properties for easier access
    flattenAs: {
      requestOptions: {
        // Flattening nested headers
        'headers.contentType': 'contentType',
        'headers.accept': 'accept',
        'headers.authorization': 'authorization',
        
        // Flattening direct properties
        'timeout': 'timeout',
        'cache': 'useCache',
        
        // Flattening nested retry settings
        'retries.count': 'retryCount',
        'retries.delay': 'retryDelay',
      },
      logOptions: {
        'level': 'logLevel',
        'format': 'logFormat',
        'destination': 'logDestination',
        'filename': 'logFilename',
      }
    }
  }
);

// Example 1: Basic usage with full options
console.log('Example 1: Full call with complex objects');
const result1 = namedRequest(
  args.url('https://api.example.com/users'),
  args.method('GET'),
  args.requestOptions({
    headers: {
      contentType: 'application/json',
      accept: 'application/json',
    },
    timeout: 5000,
    cache: true
  })
);
console.log(result1);

// Example 2: Using flattened properties
console.log('\nExample 2: Using flattened properties');
const result2 = namedRequest(
  args.url('https://api.example.com/posts'),
  args.method('POST'),
  // Using individual flattened properties instead of the full object
  args.contentType('application/json'),
  args.accept('application/json'),
  args.authorization('Bearer token123'),
  args.timeout(3000),
  args.useCache(false),
  args.retryCount(3),
  args.retryDelay(1000),
  // Also using flattened logging options
  args.logLevel('info'),
  args.logFormat('json')
);
console.log(result2);

// Example 3: Mixing object properties and flattened properties
console.log('\nExample 3: Mixing object and flattened properties');
const result3 = namedRequest(
  args.url('https://api.example.com/data'),
  args.method('PUT'),
  // Use the main object for some properties
  args.requestOptions({
    headers: {
      contentType: 'application/xml',
      accept: 'application/xml',
    }
  }),
  // And flattened properties for others
  args.timeout(10000),
  args.useCache(true),
  // Using the log options object
  args.logOptions({
    level: 'warn',
    format: 'text',
    destination: 'file',
    filename: 'api.log'
  })
);
console.log(result3);

// Example 4: Type-safe partial application with options objects
console.log('\nExample 4: Partial application with options objects');

// Create a base API client for JSON requests
const jsonApiClient = namedRequest.partial(
  args.contentType('application/json'),
  args.accept('application/json'),
  args.useCache(true),
  args.timeout(5000),
  args.logLevel('info'),
  args.logFormat('json')
);

// The type system tracks which parameters have been applied
// The remaining required parameters are:
console.log('Remaining required args:', jsonApiClient.remainingArgs());

// Create a GET request client
const getJsonClient = jsonApiClient.partial(
  args.method('GET')
);

// This would cause a TypeScript error because contentType has already been applied
// Uncomment to see the error:
// const invalidClient = getJsonClient.partial(args.contentType('text/plain'));

// Make a specific API call
const getUserResult = getJsonClient(
  args.url('https://api.example.com/users/123')
);
console.log(getUserResult);

// Example 5: Optional properties in partial application
console.log('\nExample 5: Optional properties in partial application');

// Create a client with authorization
const authClient = jsonApiClient.partial(
  args.authorization('Bearer token456'),
  args.method('POST')
);

// The type system knows which optional properties have been set,
// and won't let you set them again
// Uncomment to see the error:
// const invalidAuthClient = authClient.partial(args.authorization('Bearer newToken'));

// Make an authenticated request
const createUserResult = authClient(
  args.url('https://api.example.com/users'),
  // We can still override other optional properties
  args.logLevel('debug') // This works because logLevel wasn't applied in authClient
);
console.log(createUserResult);

// Example 6: Advanced custom request with retry logic
console.log('\nExample 6: Advanced retry logic with optional properties');

// Create a base request setup for retrying operations
const retryClient = namedRequest.partial(
  args.retryCount(5),
  args.retryDelay(2000),
  args.method('PUT'),
  args.contentType('application/json'),
  args.accept('application/json')
);

// Create a specific endpoint client
const updateUserClient = retryClient.partial(
  args.url('https://api.example.com/users/update')
);

// This wouldn't compile since retryCount has already been applied
// Uncomment to see the error:
// updateUserClient.partial(args.retryCount(10));

// The full request, showing we can still set properties that haven't been applied yet
const updateResult = updateUserClient(
  args.authorization('Bearer admin123'),
  args.logLevel('debug'),
  args.logDestination('file'),
  args.logFilename('user-updates.log')
);
console.log(updateResult);

// Example 7: With complete automatic type inference
function createApiClient<T>(baseUrl: string, options: {
  defaultHeaders?: Record<string, string>;
  responseType?: 'json' | 'text' | 'blob';
  withCredentials?: boolean;
}) {
  return { baseUrl, options };
}

// Type inference from function signature
const [clientArgs, namedCreateClient] = createNamedArguments(createApiClient);

// Create a partially applied client creator
const jsonClientCreator = namedCreateClient.partial(
  clientArgs.options({
    responseType: 'json',
    withCredentials: true
  })
);

// Complete the client creation
const userApiClient = jsonClientCreator(
  clientArgs.baseUrl('https://api.example.com/users')
);

console.log('\nExample 7: Type-inferred client');
console.log(userApiClient);