/**
 * Simpler Options Objects Example - Compatible with Current TypeScript Limitations
 * 
 * This example demonstrates type-safe partial application with options objects,
 * working within the current limitations of the library.
 */
import { createNamedArguments } from '../src/named_args';

// Define a simpler options object (avoiding nested properties for direct access)
interface RequestOptions {
  // Flattened properties instead of nested objects
  contentType: string;
  accept: string;
  authorization?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  cache?: boolean;
}

// Function using the options object
function makeRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  options: RequestOptions
): string {
  return `${method} ${url} with ${JSON.stringify(options)}`;
}

// Create named arguments
const [args, namedRequest] = createNamedArguments<
  typeof makeRequest,
  {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    options: RequestOptions;
  }
>(makeRequest);

// Example 1: Basic usage
console.log('Example 1: Basic usage');
const result1 = namedRequest(
  args.url('https://api.example.com/users'),
  args.method('GET'),
  args.options({
    contentType: 'application/json',
    accept: 'application/json',
    timeout: 5000,
    cache: true
  })
);
console.log(result1);

// Example 2: Type-safe partial application
console.log('\nExample 2: Type-safe partial application');

// Create a partially applied function for JSON API requests
const jsonApiClient = namedRequest.partial(
  args.options({
    contentType: 'application/json',
    accept: 'application/json',
    timeout: 5000
  })
);

// The TypeScript type system knows we still need url and method
console.log('Remaining required args:', jsonApiClient.remainingArgs());

// Create GET requests
const getJsonClient = jsonApiClient.partial(
  args.method('GET')
);

// Now we only need to provide the URL
console.log('Remaining required args:', getJsonClient.remainingArgs());

// Make a GET request
const getUsersResult = getJsonClient(
  args.url('https://api.example.com/users')
);
console.log(getUsersResult);

// Example 3: Progressive configuration
console.log('\nExample 3: Progressive configuration');

// Start with a POST client
const postClient = namedRequest.partial(
  args.method('POST')
);

// Add authentication
const authPostClient = postClient.partial(
  args.options({
    contentType: 'application/json',
    accept: 'application/json',
    authorization: 'Bearer token123'
  })
);


// Add retries using reApply
const retryAuthPostClient = authPostClient.reApply("options", (prev) => ({
  ...prev,
  retryCount: 3,
  retryDelay: 1000
}));

// Make the final request
const createUserResult = retryAuthPostClient(
  args.url('https://api.example.com/users')
);
console.log(createUserResult);

// Example 4: Type safety prevents applying the same parameter twice
console.log('\nExample 4: Type safety prevents parameter duplication');

// This would cause a TypeScript error because method has already been applied:
// Uncomment to see the error:
// const badClient = postClient.partial(args.method('PUT'));

// This works because we can update the options object using reApply:
const updatedClient = jsonApiClient.reApply(args.options, (prev) => ({
  ...prev,
  authorization: "Bearer token456",
  retryCount: 5
}));

// Complete the call
const updateResult = updatedClient(
  args.url('https://api.example.com/update'),
  args.method('PUT')
);
console.log(updateResult);

// Example 5: Multiple types of options objects
console.log('\nExample 5: Multiple option objects');

// Define a function with multiple option objects
function configureSystem(
  appOptions: {
    name: string;
    version: string;
    debug?: boolean;
  },
  dbOptions: {
    host: string;
    port: number;
    username: string;
    password: string;
  },
  loggingOptions: {
    level: 'debug' | 'info' | 'warn' | 'error';
    destination?: 'console' | 'file';
  }
) {
  return { 
    app: appOptions, 
    db: dbOptions, 
    logging: loggingOptions 
  };
}

// Create named arguments
const [configArgs, namedConfig] = createNamedArguments<
  typeof configureSystem,
  {
    appOptions: {
      name: string;
      version: string;
      debug?: boolean;
    };
    dbOptions: {
      host: string;
      port: number;
      username: string;
      password: string;
    };
    loggingOptions: {
      level: 'debug' | 'info' | 'warn' | 'error';
      destination?: 'console' | 'file';
    };
  }
>(configureSystem);

// Create a partial configuration with app options
const appConfig = namedConfig.partial(
  configArgs.appOptions({
    name: 'MyApp',
    version: '1.0.0',
    debug: true
  })
);

// Add database config
const appDbConfig = appConfig.partial(
  configArgs.dbOptions({
    host: 'localhost',
    port: 5432,
    username: 'admin',
    password: 'secret'
  })
);

// The type system prevents us from setting appOptions again
// Uncomment to see the error:
// const badConfig = appDbConfig.partial(
//   configArgs.appOptions({
//     name: 'OtherApp', 
//     version: '2.0.0'
//   })
// );

// Complete the configuration with logging options
const fullConfig = appDbConfig(
  configArgs.loggingOptions({
    level: 'debug',
    destination: 'console'
  })
);

console.log(fullConfig);