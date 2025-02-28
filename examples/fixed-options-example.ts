/**
 * Type-Safe Options Objects Example (Fixed Version)
 * 
 * This example demonstrates:
 * 1. Proper use of flattened properties
 * 2. Type-safe partial application with options objects
 * 3. Working with nested properties
 */
import { createNamedArguments } from '../src/named_args.og';

// Define an interface with nested properties
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
  filename?: string;
}

// Function using complex options
function makeRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  requestOptions: RequestOptions,
  logOptions: LogOptions
): string {
  // Simulated implementation that uses the parameters to avoid TS6133 errors
  console.log(`Request options:`, JSON.stringify(requestOptions, null, 2));
  console.log(`Log options:`, JSON.stringify(logOptions, null, 2));
  return `${method} ${url}`;
}

// Create named arguments with explicit type definitions
const [args, namedRequest] = createNamedArguments<
  typeof makeRequest,
  {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    requestOptions: RequestOptions;
    logOptions: LogOptions;
  }
>(makeRequest);

// Example 1: Basic usage with objects
console.log('Example 1: Basic usage');
const result1 = namedRequest(
  args.url('https://api.example.com'),
  args.method('GET'),
  args.requestOptions({
    headers: {
      contentType: 'application/json',
      accept: 'application/json'
    },
    timeout: 5000,
    cache: true
  }),
  args.logOptions({
    level: 'info',
    format: 'json'
  })
);
console.log(result1);

// Example 2: Type-safe partial application
console.log('\nExample 2: Partial application');

// Create a partially applied function for JSON API requests
const jsonApiClient = namedRequest.partial(
  args.requestOptions({
    headers: {
      contentType: 'application/json',
      accept: 'application/json'
    },
    timeout: 5000
  }),
  args.logOptions({
    level: 'info',
    format: 'json'
  })
);

// Check remaining arguments
console.log('Remaining required args:', jsonApiClient.remainingArgs());

// Create a JSON API client for GET requests
const getJsonClient = jsonApiClient.partial(
  args.method('GET')
);

// Complete the API call - only need to provide the url now
const result2 = getJsonClient(
  args.url('https://api.example.com/users')
);
console.log(result2);

/* 
 * NOTE: For examples below, you would need to implement the reApply method
 * as shown in examples/add-reapply.md
 *
 * The comments below show how the code would work with reApply
 */

// Example 3: Incrementally building complex options (conceptual)
console.log('\nExample 3: Incremental building (conceptual)');

// Start with basic request configuration
const baseRequestClient = namedRequest.partial(
  args.method('POST'),
  args.logOptions({
    level: 'debug',
    format: 'json'
  })
);

// Conceptual - would require the reApply method
console.log('Note: Further examples would require implementing the reApply method');
console.log('Example URL that would work with reApply:', 'https://api.example.com/data');

/*
// Initial config with headers
const initialClient = baseRequestClient.partial(
  args.requestOptions({
    headers: {
      contentType: 'application/json',
      accept: 'application/json',
      authorization: 'Bearer token123'
    }
  })
);

// Add retry logic in a third step - conceptual with reApply
const retryClient = initialClient.reApply('requestOptions', (prev) => ({
  ...prev,
  retries: {
    count: 3,
    delay: 1000
  },
  cache: false
}));

// Make the final request, only needing to specify the URL
const result3 = retryClient(
  args.url('https://api.example.com/data')
);
console.log(result3);
*/

// Example 4: Merging configuration objects (conceptual)
console.log('\nExample 4: Merging configurations (conceptual)');

/*
// Create a client with different request options in stages
const client1 = namedRequest.partial(
  args.method('PUT'),
  args.requestOptions({
    headers: {
      contentType: 'application/json',
      accept: 'application/json'
    }
  }),
  args.logOptions({
    level: 'info'
  })
);

// Add more options - these would need to use reApply
const client2 = client1.reApply('requestOptions', (prev) => ({
  ...prev,
  timeout: 10000,
  cache: true
}));

// Add even more options
const client3 = client2.reApply('requestOptions', (prev) => ({
  ...prev,
  retries: {
    count: 5,
    delay: 2000
  }
})).reApply('logOptions', (prev) => ({
  ...prev,
  destination: 'console'
}));

// Complete the request
const result4 = client3(
  args.url('https://api.example.com/update')
);
console.log(result4);
*/

// Example 5: Using multiple options objects with the same structure
console.log('\nExample 5: Multiple options objects');

// This is a more complex function with multiple options objects of similar structure
function configureDatabases(
  mainDb: {
    url: string;
    username: string;
    password: string;
    pool?: { min: number; max: number };
  },
  replicaDb: {
    url: string;
    username: string;
    password: string;
    pool?: { min: number; max: number };
    readOnly?: boolean;
  }
) {
  return { mainDb, replicaDb };
}

// Create named arguments for this function
const [dbArgs, namedConfig] = createNamedArguments<
  typeof configureDatabases,
  {
    mainDb: {
      url: string;
      username: string;
      password: string;
      pool?: { min: number; max: number };
    };
    replicaDb: {
      url: string;
      username: string;
      password: string;
      pool?: { min: number; max: number };
      readOnly?: boolean;
    };
  }
>(configureDatabases);

// Configure the main database
const mainDbConfig = namedConfig.partial(
  dbArgs.mainDb({
    url: 'postgres://localhost:5432/main',
    username: 'admin',
    password: 'secret',
    pool: {
      min: 5,
      max: 20
    }
  })
);

// Add replica database configuration
const fullDbConfig = mainDbConfig.partial(
  dbArgs.replicaDb({
    url: 'postgres://replica.example.com:5432/replica',
    username: 'reader',
    password: 'readonly',
    readOnly: true
  })
);

// Use the configuration
const result5 = fullDbConfig();
console.log(result5);