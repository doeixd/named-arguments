/**
 * Type-Safe Options Objects with Partial Application
 * 
 * This example focuses specifically on the type system behavior
 * with options objects and partial application. Each example includes
 * detailed comments explaining how the type system is enforcing safety.
 */
import { createNamedArguments } from '../src/named_args';

// ==========================================================
// Example 1: Options objects with required and optional properties
// ==========================================================

// Define an options object with both required and optional properties
interface UserOptions {
  username: string;         // Required
  displayName?: string;     // Optional
  email: string;            // Required
  preferences?: {           // Optional object with nested properties
    theme: string;          // Required if preferences is provided
    notifications: boolean; // Required if preferences is provided
    language?: string;      // Optional even if preferences is provided
  };
}

// Function that uses the options object
function createUser(
  id: string,
  options: UserOptions,
  metadata?: { createdBy: string }
): { id: string } & UserOptions {
  // Just return the inputs for this example
  return { 
    id, 
    ...options 
  };
}

// Create named arguments with explicit type info and parameter metadata
const [userArgs, namedCreateUser] = createNamedArguments<
  typeof createUser,
  { 
    id: string;
    options: UserOptions;
    metadata?: { createdBy: string };
  }
>(
  createUser,
  [
    { name: 'id', required: true },
    { name: 'options', required: true },
    { name: 'metadata', required: false }
  ]
);

// Simple usage with all parameters
const user1 = namedCreateUser(
  userArgs.id('user123'),
  userArgs.options({
    username: 'johndoe',
    email: 'john@example.com',
    displayName: 'John Doe',
    preferences: {
      theme: 'dark',
      notifications: true,
      language: 'en'
    }
  })
);

console.log('User 1:', user1);

// ==========================================================
// Example 2: Partial application with required and optional properties
// ==========================================================

// Create a partial function that provides some of the required properties
const createJohnUser = namedCreateUser.partial(
  userArgs.options({
    username: 'johndoe',
    email: 'john@example.com'
    // Note: We're not providing displayName or preferences, which are optional
  })
);

// TypeScript knows we still need to provide 'id' but not 'options'
// TypeScript's return type will be: ReturnType<typeof createUser>
// This is because we've provided all required parameters (options, which has required properties)
// even though we haven't provided all optional properties
console.log('Remaining required args:', createJohnUser.remainingArgs()); // ['id']

// Complete the function call with the remaining required parameter
const user2 = createJohnUser(userArgs.id('user456'));
console.log('User 2:', user2);


// We can also provide additional optional properties when completing the call
// TypeScript knows we only need 'id' but can optionally provide metadata or extend options
const user3 = createJohnUser(
  userArgs.id('user789'),
  // Extend the options with optional properties
  userArgs.options({
    displayName: 'Johnny',
    preferences: {
      theme: 'light',
      notifications: false
    }
  }),
  // Add optional metadata
  userArgs.metadata({
    createdBy: 'admin'
  })
);
console.log('User 3:', user3);

// ==========================================================
// Example 3: Complex partial application with nested properties
// ==========================================================

// Let's create a partial function that provides some nested optional properties
const createLightThemeUser = namedCreateUser.partial(
  userArgs.options({
    // We don't provide required properties yet (username, email)
    // But we do provide optional nested properties
    preferences: {
      theme: 'light',
      notifications: true
    }
  })
);

// TypeScript correctly knows we still need to provide id and the required properties in options
console.log('Remaining required args:', createLightThemeUser.remainingArgs()); // ['id', 'options']

// Now we provide the remaining required properties
// TypeScript's return type will be the function's return type because all required properties are now provided
const user4 = createLightThemeUser(
  userArgs.id('user101'),
  userArgs.options({
    username: 'alice',
    email: 'alice@example.com',
    // We don't repeat the preferences that were already provided
    // TypeScript is smart enough to know those are already set
  })
);
console.log('User 4:', user4);

// ==========================================================
// Example 4: Merging partial options objects
// ==========================================================

// We can create a partial function with default settings
const defaultUserCreator = namedCreateUser.partial(
  userArgs.options({
    // Only provide the defaults, none of the required fields
    displayName: 'New User',
    preferences: {
      theme: 'system',
      notifications: false,
      language: 'en'
    }
  })
);

// Still need id and the required fields in options
console.log('Remaining required args:', defaultUserCreator.remainingArgs()); // ['id', 'options']

// Now create a specific user by providing the required fields
// The library merges the options objects, preserving the defaults
// while allowing overrides for specific properties
const user5 = defaultUserCreator(
  userArgs.id('user202'),
  userArgs.options({
    username: 'bob',
    email: 'bob@example.com',
    // Override just one preference property, keeps others
    preferences: {
      notifications: true
      // theme and language will be preserved from defaults
    }
  })
);
console.log('User 5:', user5);

// ==========================================================
// Example 5: Multiple levels of partial application
// ==========================================================

// First level: Set basic system defaults
const systemDefaultUser = namedCreateUser.partial(
  userArgs.options({
    preferences: {
      theme: 'system',
      notifications: true
    }
  })
);

// Second level: Set company defaults with reApply
const companyUser = systemDefaultUser.reApply("options", (prev) => ({
  ...prev,
  email: "employee@company.com",
  preferences: {
    ...prev.preferences,
    language: "en"
  }
}));

// Third level: Department-specific defaults with reApply
const marketingUser = companyUser.reApply("options", (prev) => ({
  ...prev,
  // Email is already set by companyUser
  displayName: "Marketing Team Member"
}));

// Final level: Specific user creation
const user6 = marketingUser(
  userArgs.id('marketing123'),
  userArgs.options({
    // Still need to provide username, which is required
    username: 'marketer',
    // Override displayName for this specific user
    displayName: 'Sarah from Marketing'
  })
);
console.log('User 6:', user6);

// ==========================================================
// Example 6: Type errors with partial application
// ==========================================================

// The following would cause a TypeScript error because we're trying to set the same property twice
// Uncomment to see the TypeScript error:

/*
const invalidUser = companyUser.partial(
  userArgs.options({
    // This would cause an error because email was already set in companyUser
    email: 'new@example.com'
  })
);
*/

// ==========================================================
// Example 7: Flattening options with nested properties
// ==========================================================

// Define a complex config with nested properties
interface AppConfig {
  server: {
    host: string;
    port: number;
    ssl: boolean;
  };
  database: {
    url: string;
    username: string;
    password: string;
    pool?: {
      max: number;
      min: number;
    };
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format?: 'json' | 'text';
  };
}

// Function that uses this config
function createApp(
  name: string,
  version: string,
  config: AppConfig
) {
  return { name, version, config };
}

// Create named arguments with flattening
const [appArgs, namedCreateApp] = createNamedArguments<
  typeof createApp,
  {
    name: string;
    version: string;
    config: AppConfig;
  }
>(
  createApp,
  [
    { name: 'name', required: true },
    { name: 'version', required: true },
    { name: 'config', required: true }
  ],
  {
    // Flatten nested config properties for easier access
    flattenAs: {
      config: {
        'server.host': 'host',
        'server.port': 'port',
        'server.ssl': 'ssl',
        'database.url': 'dbUrl',
        'database.username': 'dbUser',
        'database.password': 'dbPass',
        'database.pool.max': 'dbMaxPool',
        'database.pool.min': 'dbMinPool',
        'logging.level': 'logLevel',
        'logging.format': 'logFormat'
      }
    }
  }
);

// Create a base configuration with partial application using flattened properties
const baseApp = namedCreateApp.partial(
  appArgs.host('localhost'),
  appArgs.port(3000),
  appArgs.ssl(false),
  appArgs.dbUrl('postgres://localhost:5432/mydb'),
  appArgs.logLevel('info')
);

// TypeScript knows we still need to provide name, version, and 
// the remaining required properties in config (dbUser, dbPass)
console.log('Remaining required args:', baseApp.remainingArgs());

// Complete the application configuration
const myApp = baseApp(
  appArgs.name('MyApp'),
  appArgs.version('1.0.0'),
  appArgs.dbUser('admin'),
  appArgs.dbPass('secret'),
  // We can still provide optional flattened properties
  appArgs.dbMaxPool(10),
  appArgs.dbMinPool(2),
  appArgs.logFormat('json')
);
console.log('My App:', JSON.stringify(myApp, null, 2));

// ==========================================================
// Example 8: Overriding previously defined options
// ==========================================================

// Create a development environment configuration
const devApp = namedCreateApp.partial(
  appArgs.name('DevApp'),
  appArgs.version('dev'),
  appArgs.host('localhost'),
  appArgs.port(3000),
  appArgs.ssl(false),
  appArgs.dbUrl('postgres://localhost:5432/devdb'),
  appArgs.dbUser('dev'),
  appArgs.dbPass('dev')
);

// Create a specialized component-specific configuration
// that overrides some settings via the config object directly
const componentApp = devApp(
  // Override specific properties by providing them directly in config
  // This works because the full config object hasn't been provided yet,
  // only flattened properties
  appArgs.config({
    server: {
      // Will override host, port, ssl that were set as flattened properties
      host: '0.0.0.0',
      port: 4000,
      ssl: true
    },
    database: {
      url: 'postgres://localhost:5432/componentdb',
      username: 'component',
      password: 'component_pass',
      pool: {
        max: 5,
        min: 1
      }
    },
    logging: {
      level: 'debug',
      format: 'json'
    }
  })
);

console.log('Component App:', JSON.stringify(componentApp, null, 2));