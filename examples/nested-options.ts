/**
 * Deeply Nested Options Objects with Type-Safe Partial Application
 * 
 * This example demonstrates:
 * 1. Working with deeply nested options objects
 * 2. Progressive configuration of complex options
 * 3. Type-safe access to optional nested properties
 * 4. Pattern for building complex configurations incrementally
 */
import { createNamedArguments, createConfigurableFunction } from '../src/named_args';

// Define a complex, deeply nested configuration type
interface DatabaseConfig {
  connection: {
    host: string;
    port: number;
    credentials?: {
      username: string;
      password: string;
      ssl?: {
        enabled: boolean;
        cert?: string;
        key?: string;
      };
    };
    pool?: {
      min: number;
      max: number;
      idle?: number;
      acquire?: number;
    };
  };
  settings: {
    debug?: boolean;
    logging?: {
      level: 'none' | 'error' | 'warn' | 'info' | 'debug';
      destination?: 'console' | 'file';
      format?: 'text' | 'json';
      options?: {
        colors?: boolean;
        timestamp?: boolean;
        pretty?: boolean;
      };
    };
    cache?: {
      enabled: boolean;
      ttl?: number;
      strategy?: 'lru' | 'fifo' | 'lfu';
      size?: number;
    };
  };
  features?: {
    transactions?: boolean;
    migrations?: {
      enabled: boolean;
      tableName?: string;
      directory?: string;
    };
    seeds?: {
      enabled: boolean;
      directory?: string;
    };
  };
}

// Sample function to create a database instance with this complex config
function createDatabase(name: string, config: DatabaseConfig, options?: { 
  initialize?: boolean;
  timeout?: number; 
}) {
  // In a real implementation, this would create and return a database connection
  return { 
    name, 
    config,
    options,
    connect: () => console.log(`Connected to ${name} database at ${config.connection.host}:${config.connection.port}`)
  };
}

// Create named arguments with explicit type definitions
const [args, namedCreateDb] = createNamedArguments<
  typeof createDatabase,
  {
    name: string;
    config: DatabaseConfig;
    options?: { 
      initialize?: boolean;
      timeout?: number; 
    };
  }
>(
  createDatabase,
  [
    { name: 'name', required: true },
    { name: 'config', required: true },
    { name: 'options', required: false },
  ],
  {
    // Flatten some commonly accessed options for convenience
    flattenAs: {
      'config': {
        'connection.host': 'dbHost',
        'connection.port': 'dbPort',
        'connection.credentials.username': 'dbUsername',
        'connection.credentials.password': 'dbPassword',
        'connection.credentials.ssl.enabled': 'useSsl',
        'settings.debug': 'debug',
        'settings.logging.level': 'logLevel',
      },
      'options': {
        'initialize': 'autoInit',
        'timeout': 'connectionTimeout',
      }
    }
  }
);

// Example 1: Basic usage with full object
console.log('Example 1: Complete configuration');
const db1 = namedCreateDb(
  args.name('users'),
  args.config({
    connection: {
      host: 'localhost',
      port: 5432,
      credentials: {
        username: 'admin',
        password: 'secret',
        ssl: {
          enabled: true
        }
      },
      pool: {
        min: 2,
        max: 10
      }
    },
    settings: {
      debug: true,
      logging: {
        level: 'debug',
        destination: 'console',
        format: 'text',
        options: {
          colors: true,
          timestamp: true
        }
      }
    }
  })
);
console.log('Database 1:', JSON.stringify(db1, null, 2));

// Example 2: Using flattened properties
console.log('\nExample 2: Using flattened properties');
const db2 = namedCreateDb(
  args.name('products'),
  args.dbHost('db.example.com'),
  args.dbPort(5432),
  args.dbUsername('app_user'),
  args.dbPassword('app_pass'),
  args.useSsl(true),
  args.debug(false),
  args.logLevel('error'),
  args.autoInit(true)
);
console.log('Database 2:', JSON.stringify(db2, null, 2));

// Example 3: Progressive configuration with partial application
console.log('\nExample 3: Progressive configuration');

// First level: Configure base connection details
const baseDbConfig = namedCreateDb.partial(
  args.dbHost('db.example.com'),
  args.dbPort(5432),
  args.logLevel('info')
);

console.log('Remaining required args after base config:', baseDbConfig.remainingArgs());

// Second level: Configure credentials
const authDbConfig = baseDbConfig.partial(
  args.dbUsername('service_user'),
  args.dbPassword('service_pass'),
  args.useSsl(true)
);

// This would be a type error because dbHost was already applied
// Uncomment to see the error:
// const invalidConfig = authDbConfig.partial(args.dbHost('new-host.example.com'));

// Final level: Specific database instance
const logsDb = authDbConfig(
  args.name('logs'),
  args.debug(true),
  args.autoInit(true),
  args.connectionTimeout(30000)
);

console.log('Database 3:', JSON.stringify(logsDb, null, 2));

// Example 4: Using createConfigurableFunction for more flexibility
console.log('\nExample 4: Configurable function approach');

// Create a configurable database factory
const configurableDb = createConfigurableFunction([args, namedCreateDb]);

// Create development database configuration function
const createDevDb = configurableDb(dbArgs => {
  // Configure development settings
  dbArgs.config({
    connection: {
      host: 'localhost',
      port: 5432,
      pool: {
        min: 1,
        max: 5
      }
    },
    settings: {
      debug: true,
      logging: {
        level: 'debug',
        destination: 'console',
        format: 'text',
        options: {
          colors: true,
          timestamp: true
        }
      }
    },
    features: {
      transactions: true,
      migrations: {
        enabled: true,
        tableName: 'migrations'
      }
    }
  });
  
  // Set default options
  dbArgs.options({
    initialize: true,
    timeout: 10000
  });
});

// Create a development database with just the name
const devUsersDb = createDevDb(
  args.name('dev_users'),
  // Override some specific settings
  args.dbUsername('dev_user'),
  args.dbPassword('dev_password')
);

console.log('Development Database:', JSON.stringify(devUsersDb, null, 2));

// Example 5: Complex progressive configuration for different environments
console.log('\nExample 5: Environment-specific configurations');

// Base database configuration shared across environments
const baseDatabaseConfig = namedCreateDb.partial(
  args.config({
    connection: {
      pool: {
        min: 2,
        max: 20,
        idle: 10000
      }
    },
    features: {
      transactions: true,
      migrations: {
        enabled: true,
        tableName: 'schema_migrations',
        directory: './migrations'
      }
    }
  })
);

// Development environment
const developmentDb = baseDatabaseConfig.partial(
  args.dbHost('localhost'),
  args.dbPort(5432),
  args.dbUsername('dev'),
  args.dbPassword('dev_password'),
  args.debug(true),
  args.logLevel('debug')
);

// Testing environment
const testingDb = baseDatabaseConfig.partial(
  args.dbHost('test-db.local'),
  args.dbPort(5432),
  args.dbUsername('test'),
  args.dbPassword('test_password'),
  args.debug(true),
  args.logLevel('info')
);

// Production environment
const productionDb = baseDatabaseConfig.partial(
  args.dbHost('prod-db.example.com'),
  args.dbPort(5432),
  args.dbUsername('prod_user'),
  args.dbPassword('prod_password'),
  args.useSsl(true),
  args.debug(false),
  args.logLevel('error')
);

// Create specific database instances
const devAccountsDb = developmentDb(args.name('dev_accounts'));
const testAccountsDb = testingDb(args.name('test_accounts'));
const prodAccountsDb = productionDb(args.name('prod_accounts'));

console.log('Environment-specific databases created successfully');

// Example 6: Working with optional nested properties progressively
console.log('\nExample 6: Progressive optional property configuration');

// Create a base configuration that doesn't set all required fields
const incompleteConfig = namedCreateDb.partial(
  args.name('analytics'),
  args.config({
    connection: {
      host: 'analytics-db.example.com',
      port: 5432
      // Notice we haven't set credentials yet, which is required
    },
    settings: {
      // Set some optional properties but not all
      cache: {
        enabled: true,
        ttl: 3600,
        strategy: 'lru'
      }
    }
  })
);

// TypeScript correctly identifies missing required parameters
console.log('Remaining required args:', incompleteConfig.remainingArgs());

// Complete the configuration incrementally
const analyticsDb = incompleteConfig(
  // Add the missing required credentials
  args.config({
    connection: {
      credentials: {
        username: 'analytics_user',
        password: 'analytics_pass'
      }
    }
  }),
  // Add some additional optional configuration
  args.config({
    features: {
      seeds: {
        enabled: true,
        directory: './seeds/analytics'
      }
    }
  })
);

console.log('Analytics Database:', JSON.stringify(analyticsDb, null, 2));