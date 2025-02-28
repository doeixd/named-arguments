/**
 * Flattened Options Example - Working with Type-Safe Partial Application
 * 
 * This example demonstrates type-safety by working with flattened parameter properties
 * rather than trying to pass objects directly, which is currently a limitation
 * of the library when using named arguments syntax.
 */
import { createNamedArguments } from '../src/named_args';

// Function using multiple parameters instead of objects
function makeRequest(
  // URL parameters
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  
  // Request options as individual parameters
  contentType: string,
  accept: string,
  authorization?: string,
  timeout?: number,
  retryCount?: number,
  retryDelay?: number,
  cache?: boolean,
  
  // Logging options as individual parameters
  logLevel?: 'debug' | 'info' | 'warn' | 'error',
  logFormat?: 'json' | 'text',
  logDestination?: 'console' | 'file'
): string {
  // Construct options objects internally if needed
  const requestOptions = {
    contentType,
    accept,
    authorization,
    timeout,
    retryCount,
    retryDelay,
    cache
  };
  
  const loggingOptions = logLevel ? {
    level: logLevel,
    format: logFormat,
    destination: logDestination
  } : undefined;
  
  return `${method} ${url} with ${JSON.stringify(requestOptions)} and logging ${JSON.stringify(loggingOptions)}`;
}

// Create named arguments
const [args, namedRequest] = createNamedArguments<
  typeof makeRequest,
  {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    contentType: string;
    accept: string;
    authorization?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    cache?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    logFormat?: 'json' | 'text';
    logDestination?: 'console' | 'file';
  }
>(makeRequest);

// Example 1: Basic usage with all parameters
console.log('Example 1: Basic usage');
const result1 = namedRequest(
  args.url('https://api.example.com/users'),
  args.method('GET'),
  args.contentType('application/json'),
  args.accept('application/json'),
  args.timeout(5000),
  args.cache(true),
  args.logLevel('info'),
  args.logFormat('json')
);
console.log(result1);

// Example 2: Type-safe partial application
console.log('\nExample 2: Type-safe partial application');

// Create a partially applied function for JSON API requests
const jsonApiClient = namedRequest.partial(
  args.contentType('application/json'),
  args.accept('application/json'),
  args.timeout(5000),
  args.cache(true)
);

// The TypeScript type system knows which parameters are still required
console.log('Remaining required args:', jsonApiClient.remainingArgs());

// Create a GET client
const getJsonClient = jsonApiClient.partial(
  args.method('GET'),
  args.logLevel('info')
);

// Now we only need to provide the URL
console.log('Remaining required args:', getJsonClient.remainingArgs());

// Make a GET request to a specific endpoint
const getUsersResult = getJsonClient(
  args.url('https://api.example.com/users')
);
console.log(getUsersResult);

// Example 3: Progressive configuration with authentication
console.log('\nExample 3: Progressive configuration with authentication');

// Start with a POST client for authenticated requests
const authPostClient = namedRequest.partial(
  args.method('POST'),
  args.contentType('application/json'),
  args.accept('application/json'),
  args.authorization('Bearer token123')
);

// Add retry configuration
const retryAuthPostClient = authPostClient.partial(
  args.retryCount(3),
  args.retryDelay(1000)
);

// TypeScript prevents applying the same parameter twice
// This would cause a compile error:
// const badClient = retryAuthPostClient.partial(args.method('PUT'));

// Complete the request with remaining parameters
const createUserResult = retryAuthPostClient(
  args.url('https://api.example.com/users'),
  args.logLevel('debug'),
  args.logFormat('json'),
  args.logDestination('console')
);
console.log(createUserResult);

// Example 4: Working with multiple clients
console.log('\nExample 4: Working with multiple clients');

// Create a base client configuration
const baseClient = namedRequest.partial(
  args.contentType('application/json'),
  args.accept('application/json'),
  args.timeout(5000)
);

// Create specialized clients for different HTTP methods
const getClient = baseClient.partial(args.method('GET'));
const postClient = baseClient.partial(args.method('POST'));
const putClient = baseClient.partial(args.method('PUT'));
const deleteClient = baseClient.partial(args.method('DELETE'));

// Use the specialized clients
const getResult = getClient(args.url('https://api.example.com/users'));
const postResult = postClient(
  args.url('https://api.example.com/users'),
  args.authorization('Bearer token123')
);
const putResult = putClient(
  args.url('https://api.example.com/users/123'),
  args.authorization('Bearer token123'),
  args.retryCount(3)
);
const deleteResult = deleteClient(
  args.url('https://api.example.com/users/123'),
  args.authorization('Bearer token123')
);

console.log('GET result:', getResult);
console.log('POST result:', postResult);
console.log('PUT result:', putResult);
console.log('DELETE result:', deleteResult);

// Example 5: Mixing options
console.log('\nExample 5: Mixing options');

// Create a client with logging options
const loggingClient = baseClient.partial(
  args.logLevel('debug'),
  args.logFormat('json')
);

// Create specific endpoint clients with different settings
const usersClient = loggingClient.partial(
  args.method('GET'),
  args.url('https://api.example.com/users')
);

const productsClient = loggingClient.partial(
  args.method('GET'),
  args.url('https://api.example.com/products'),
  args.cache(false)  // Override the base setting
);

// Execute the requests
const usersResponse = usersClient();
const productsResponse = productsClient();

console.log('Users Response:', usersResponse);
console.log('Products Response:', productsResponse);