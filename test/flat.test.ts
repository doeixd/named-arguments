// File: flattening.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createNamedArguments,
  isBrandedArg,
  BRAND_SYMBOL,
  type BrandedFunction,
  type NamedArgs as CoreNamedArgs,
  type NamedArg, // Import NamedArg type if needed for checks
  type CallableObject, // Import CallableObject type if needed
} from '../src/named_args'; // Adjust path as needed
import {
  withFlattening,
  // Import the interface only if needed for explicit type checks (not recommended on variables)
  // type FlattenArgsConfig,
  type FlattenedNamedArgs,
  // Import helpers only if used directly in tests (usually not needed)
  // type GetValueByPath,
} from '../src/flat'; // Adjust path to your flattening module file

// --- Test Setup ---

// Simple function for basic tests
function simpleConfig(user: { name: string; isAdmin: boolean }, port: number) {
  return `User: ${user.name}, Admin: ${user.isAdmin}, Port: ${port}`;
}
// Define the type A for createNamedArguments explicitly
type SimpleConfigArgs = { user: { name: string; isAdmin: boolean }; port: number };

// More complex function for advanced tests
interface ComplexOptions {
  host: string;
  port: number;
  ssl?: {
    enabled: boolean;
    certPath?: string; // Optional property within optional object
  };
  tags?: string[]; // Optional array property
}
interface LogOptions {
  level: 'debug' | 'info' | 'warn';
  destination?: string; // Optional property
}
// Function with optional parameters
function complexSetup(id: string, options: ComplexOptions, log?: LogOptions) {
  // Simulate some default merging for testing optional objects

  // @ts-expect-error
  const finalLog = log ? { level: 'info', ...log } : undefined; // Example default
  return { id, options, log: finalLog };
}
// Define the type A explicitly
type ComplexSetupArgs = { id: string; options: ComplexOptions; log?: LogOptions };

// --- Test Suite ---

describe('withFlattening Utility', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console.warn before each test to check warnings
    // @ts-expect-error
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.warn after each test
    vi.restoreAllMocks();
  });

  // Test case that previously failed due to type widening
  it('should add basic flattened accessors and preserve original ones', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<
      typeof simpleConfig,
      SimpleConfigArgs // Explicit type A
    >(simpleConfig);

    // Define config using 'as const' ONLY, no explicit interface annotation
    const flattenConfig = {
      flattenAs: {
        user: {
          name: 'userName', // Literal type 'userName'
          isAdmin: 'userIsAdmin', // Literal type 'userIsAdmin'
        },
      },
    } as const; // <-- CRITICAL: Ensures literal type inference

    // Act
    // Explicitly type the result tuple for clarity and to verify FlattenedNamedArgs
    const [args, finalFunc]: [
      FlattenedNamedArgs<SimpleConfigArgs, typeof flattenConfig>, // Pass specific type of const config
      BrandedFunction<typeof simpleConfig>,
    ] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assertions
    // Check original accessors (Type should be CoreNamedArgs + Flattened)
    expect(args.user).toBeDefined();
    expect(args.port).toBeDefined();
    expect(typeof args.user).toBe('function');
    expect(typeof args.port).toBe('function');

    // Check flattened accessors (Should exist now)
    expect(args.userName).toBeDefined();
    expect(args.userIsAdmin).toBeDefined();
    expect(typeof args.userName).toBe('function');
    expect(typeof args.userIsAdmin).toBe('function');

    // Check behavior and types of flattened args
    const nameArg = args.userName('Alice'); // Should expect string
    expect(isBrandedArg(nameArg)).toBe(true);
    expect(nameArg[BRAND_SYMBOL].name).toBe('user.name'); // Brand = source path
    expect(nameArg[BRAND_SYMBOL].value).toBe('Alice');
    // args.userName(123); // Compile-time error expected

    const adminArg = args.userIsAdmin(true); // Should expect boolean
    expect(isBrandedArg(adminArg)).toBe(true);
    expect(adminArg[BRAND_SYMBOL].name).toBe('user.isAdmin');
    expect(adminArg[BRAND_SYMBOL].value).toBe(true);
    // args.userIsAdmin('no'); // Compile-time error expected

    // Check function instance
    expect(finalFunc).toBe(namedFunc);
  });

  it('should handle multi-level nested source paths', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<
      typeof complexSetup,
      ComplexSetupArgs
    >(complexSetup);

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        options: {
          'ssl.enabled': 'sslEnabled',
          'ssl.certPath': 'sslCertPath',
        },
      },
    } as const;

    // Act
    const [args]: [FlattenedNamedArgs<ComplexSetupArgs, typeof flattenConfig>, ...any] =
       withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assert Structure
    expect(args.options).toBeDefined();
    expect(args.options.ssl).toBeDefined(); // Core accessor for first level
    expect(args.sslEnabled).toBeDefined(); // Flattened
    expect(args.sslCertPath).toBeDefined(); // Flattened

    // Assert Behavior
    const enabledArg = args.sslEnabled(false); // Expects boolean
    expect(enabledArg[BRAND_SYMBOL].name).toBe('options.ssl.enabled');
    expect(enabledArg[BRAND_SYMBOL].value).toBe(false);

    const pathArg = args.sslCertPath('/etc/ssl/my.crt'); // Expects string | undefined
    expect(pathArg[BRAND_SYMBOL].name).toBe('options.ssl.certPath');
    expect(pathArg[BRAND_SYMBOL].value).toBe('/etc/ssl/my.crt');
  });

  it('should handle flattening properties from multiple parameters (including optional)', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<
      typeof complexSetup,
      ComplexSetupArgs
    >(complexSetup);

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        options: {
          host: 'optionHost',
          port: 'optionPort',
        },
        log: { // Flattening from optional 'log' parameter
          level: 'logLevel',
          destination: 'logDestination', // Optional property
        },
      },
    } as const;

    // Act
    const [args] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assert Structure
    expect(args.optionHost).toBeDefined();
    expect(args.optionPort).toBeDefined();
    expect(args.logLevel).toBeDefined();
    expect(args.logDestination).toBeDefined();

    // Assert Behavior
    const hostArg = args.optionHost('api.example.com'); // Expects string
    expect(hostArg[BRAND_SYMBOL].name).toBe('options.host');

    const levelArg = args.logLevel('warn'); // Expects 'debug' | 'info' | 'warn'
    expect(levelArg[BRAND_SYMBOL].name).toBe('log.level');
    // args.logLevel('critical'); // Compile-time error

    const destArg = args.logDestination('syslog'); // Expects string | undefined
    expect(destArg[BRAND_SYMBOL].name).toBe('log.destination');
  });

  it('should handle flattening optional properties correctly (accepting undefined)', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<
      typeof complexSetup,
      ComplexSetupArgs
    >(complexSetup);

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        options: {
          'ssl.certPath': 'sslCertPath', // string | undefined
        },
        log: {
          destination: 'logDest', // string | undefined (within optional param)
        },
      },
    } as const;

    // Act
    const [args] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assert Behavior for options.ssl.certPath? -> sslCertPath
    const certArgWithValue = args.sslCertPath('/path/to/cert'); // string is valid
    expect(certArgWithValue[BRAND_SYMBOL].value).toBe('/path/to/cert');

    const certArgUndefined = args.sslCertPath(undefined); // undefined is valid
    expect(isBrandedArg(certArgUndefined)).toBe(true);
    expect(certArgUndefined[BRAND_SYMBOL].name).toBe('options.ssl.certPath');
    expect(certArgUndefined[BRAND_SYMBOL].value).toBe(undefined);
    // args.sslCertPath(123); // Compile-time error

    // Assert Behavior for log?.destination? -> logDest
    const logDestWithValue = args.logDest('/var/log/app.log'); // string is valid
    expect(logDestWithValue[BRAND_SYMBOL].value).toBe('/var/log/app.log');

    const logDestUndefined = args.logDest(undefined); // undefined is valid
    expect(isBrandedArg(logDestUndefined)).toBe(true);
    expect(logDestUndefined[BRAND_SYMBOL].name).toBe('log.destination');
    expect(logDestUndefined[BRAND_SYMBOL].value).toBe(undefined);
  });

  it('should handle name collisions with "warn" policy (default)', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<typeof simpleConfig, SimpleConfigArgs>(simpleConfig);
    const originalPortFn = originalArgs.port; // Keep reference

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        user: { name: 'port' /* Conflict! */ },
      },
      // onCollision: 'warn' is default
    } as const;

    // Act
    const [args] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assert Warning
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Flattened name "port" conflicts'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('The existing accessor will be overwritten'));

    // Assert Overwriting and Functionality
    expect(args.port).not.toBe(originalPortFn); // Should be the new function
    expect(typeof args.port).toBe('function');

    // Assert Type Safety & Behavior of the *overwritten* args.port
    const overwrittenPortArg = args.port('Alice'); // Now expects string (from user.name)!
    expect(isBrandedArg(overwrittenPortArg)).toBe(true);
    expect(overwrittenPortArg[BRAND_SYMBOL].name).toBe('user.name'); // Brands as source
    expect(overwrittenPortArg[BRAND_SYMBOL].value).toBe('Alice');
    // args.port(123); // Compile-time error expected
  });

  it('should handle name collisions with "error" policy', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<typeof simpleConfig, SimpleConfigArgs>(simpleConfig);

    const flattenConfig = { // Use 'as const'
      flattenAs: { user: { name: 'port' /* Conflict! */ } },
      onCollision: 'error',
    } as const;

    // Act & Assert Error
    expect(() => {
      withFlattening([originalArgs, namedFunc], flattenConfig);
    }).toThrow(/Flattened name "port" conflicts/);
    expect(() => {
      withFlattening([originalArgs, namedFunc], flattenConfig);
    }).toThrow(/Aborting due to 'error' collision policy/);

    // Assert No Warning
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should warn and skip invalid flat names in config', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<typeof simpleConfig, SimpleConfigArgs>(simpleConfig);

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        user: {
          name: '', // Invalid: empty string
          isAdmin: null as any, // Invalid: not a string
          isActive: ' userActive ', // Valid (spaces allowed in name)
        },
      },
    } as const;

    // Act
    const [args] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assert Warnings
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // Warns for '' and null
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid or empty flat name provided for source path "name"'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid or empty flat name provided for source path "isAdmin"'));

    // Assert Structure (invalid ones skipped, valid one exists)
    expect(args).not.toHaveProperty('');
    expect(args).not.toHaveProperty('null');
    expect(args).toHaveProperty(' userActive '); // Accessor created
    expect(typeof args[' userActive ']).toBe('function');
  });

  it('should create accessors for invalid source paths (type becomes unknown)', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<typeof simpleConfig, SimpleConfigArgs>(simpleConfig);

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        user: {
          'address.street': 'userStreet', // Source path doesn't exist in SimpleConfigArgs.user
        },
      },
    } as const;

    // Act
    const [args] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assert Structure (Accessor is created at runtime)
    expect(args).toHaveProperty('userStreet');
    expect(typeof args.userStreet).toBe('function');

    // Assert Brand (Runtime behavior reflects the invalid path)
    const badArg = args.userStreet('123 Main St'); // Accepts any value due to 'unknown' type
    expect(isBrandedArg(badArg)).toBe(true);
    expect(badArg[BRAND_SYMBOL].name).toBe('user.address.street'); // Brand uses the specified (invalid) path
    expect(badArg[BRAND_SYMBOL].value).toBe('123 Main St');
    // TypeScript type for args.userStreet is NamedArg<unknown, "user.address.street">
  });

  it('should not mutate the original args object', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<typeof simpleConfig, SimpleConfigArgs>(simpleConfig);
    const originalArgsClone = { ...originalArgs }; // Shallow clone

    const flattenConfig = { // Use 'as const'
      flattenAs: { user: { name: 'userName' } },
    } as const;

    // Act
    const [newArgs] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Assert Immutability
    expect(newArgs).not.toBe(originalArgs); // Different object instance
    expect(newArgs).toHaveProperty('userName'); // New property exists on newArgs

    expect(originalArgs).toEqual(originalArgsClone); // Original object content unchanged
    expect(originalArgs).not.toHaveProperty('userName'); // Original object structure unchanged
  });

  // --- Integration Tests ---

  it('should produce flattened args that integrate correctly with the core branded function execution', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<
      typeof complexSetup,
      ComplexSetupArgs
    >(complexSetup);

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        options: {
          host: 'optionHost',
          port: 'optionPort',
          'ssl.enabled': 'sslEnabled',
          'tags': 'optionTags',
        },
        log: {
          level: 'logLevel',
        },
      },
    } as const;

    const [args, finalFunc] = withFlattening([originalArgs, namedFunc], flattenConfig);

    // Act: Call the final function using a mix of original and flattened args
    const result = finalFunc( // Use finalFunc (same instance as namedFunc)
      args.id('test-123'),          // Original arg
      args.optionHost('localhost'),  // Flattened for options.host
      args.optionPort(8080),       // Flattened for options.port
      args.sslEnabled(true),       // Flattened for options.ssl.enabled
      args.optionTags(['dev', 'test']), // Flattened for options.tags?
      args.logLevel('debug')         // Flattened for log?.level
    );

    // Assert: Verify the structure received by the *original* complexSetup function
    expect(result).toBeDefined();
    expect(result.id).toBe('test-123');
    expect(result.options).toEqual({
      host: 'localhost',
      port: 8080,
      ssl: {
        enabled: true,
      },
      tags: ['dev', 'test'],
    });
    // Check the 'log' object was correctly constructed
    expect(result.log).toEqual({
      level: 'debug', // From flattened arg
      // destination remains undefined
    });
  });

  it('should work correctly with partial application', () => {
    // Arrange
    const [originalArgs, namedFunc] = createNamedArguments<
      typeof complexSetup,
      ComplexSetupArgs
    >(complexSetup);

    const flattenConfig = { // Use 'as const'
      flattenAs: {
        options: { host: 'optionHost', 'ssl.enabled': 'sslEnabled', port: 'optionPort' },
        log: { level: 'logLevel' },
      },
    } as const;
    const [args, finalFunc] = withFlattening([originalArgs, namedFunc], flattenConfig); // Get enhanced args

    // Act: Create a partial application using flattened args via the original function
    const partialClient = finalFunc.partial(
      args.optionHost('prod.example.com'), // options.host
      args.sslEnabled(true),           // options.ssl.enabled
      args.logLevel('info')              // log.level
    );

    // Assert Partial State (Optional Check)
    expect((partialClient as any)._appliedNames).toEqual(
      expect.arrayContaining(['options.host', 'options.ssl.enabled', 'log.level'])
    );
    expect((partialClient as any)._appliedArgs).toEqual({
      options: { host: 'prod.example.com', ssl: { enabled: true } },
      log: { level: 'info' }
    });

    // Act: Complete application using other flattened args
    const finalResult = partialClient(
      args.id('prod-001'),     // Original required arg
      // @ts-expect-error
      args.optionPort(443)     // Flattened required arg (options.port)
      // Intentionally not providing tags
    );

    // Assert Final Result (Object built incrementally)
    expect(finalResult.id).toBe('prod-001');
    expect(finalResult.options).toEqual({
      host: 'prod.example.com', // From partial flatten
      port: 443,              // From final call flatten
      ssl: { enabled: true }   // From partial flatten
      // tags remain undefined
    });
    expect(finalResult.log).toEqual({
      level: 'info', // From partial flatten
    });

    // Act: Complete application overwriting with original args
    const finalResultOverwritten = partialClient( // Use same partial client
       args.id('prod-002'),
       // Provide *entire* options object, overwriting partial host/ssl
      // @ts-expect-error
       args.options({ port: 9999, host: 'new.host.com', tags: ['overwrite'] })
    );

    // Assert Overwritten Result
    expect(finalResultOverwritten.id).toBe('prod-002');
    expect(finalResultOverwritten.options).toEqual({ // Partial options overwritten
      port: 9999,
      host: 'new.host.com',
      tags: ['overwrite']
    });
    expect(finalResultOverwritten.log).toEqual({ // Log from partial persists
      level: 'info',
    });
  });

});