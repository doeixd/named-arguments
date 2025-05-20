// File: mapped_named_args.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isBrandedArg, BRAND_SYMBOL, type ParameterInfo } from '../src/named_args'; // Import core helpers/types needed
import {
  createMappedNamedArguments,
  type MappedNamedArgs, // Type for the generated args object
  type MappedBrandedFunction, // Type for the returned function
  // type ArgMapSpecification // Not usually needed directly in tests
} from '../src/mapped'; // Adjust path to your new module

// --- Test Setup ---

// 1. Simple Target Function
function simpleTarget(name: string, age: number, active?: boolean) {
  return `Name: ${name}, Age: ${age}, Active: ${active ?? false}`;
}
// MUST define the accurate type structure A
type SimpleTargetArgs = { name: string; age: number; active?: boolean };

// 2. Complex Target Function
interface UserProfile {
  email: string;
  notifyVia?: 'email' | 'sms';
}
interface TargetConfig {
  host: string;
  port: number;
  user?: UserProfile; // Optional object parameter
}
function complexTarget(id: string, config: TargetConfig) {
  return {
    id,
    connection: `${config.host}:${config.port}`,
    userEmail: config.user?.email,
    notify: config.user?.notifyVia,
  };
}
// MUST define the accurate type structure A
type ComplexTargetArgs = { id: string; config: TargetConfig };

// --- Test Suite ---

describe('createMappedNamedArguments', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // @ts-expect-error
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Basic Creation Tests ---

  it('should create args object with specified keys', () => {
    // Arrange
    const spec = {
      userName: 'name', // Map userName -> name
      userAge: 'age', // Map userAge -> age
    } as const;

    // Act
    const [args] = createMappedNamedArguments<
      typeof simpleTarget,
      SimpleTargetArgs, // Explicit A
      typeof spec
    >(spec, simpleTarget);

    // Assert
    expect(Object.keys(args)).toEqual(['userName', 'userAge']);
    expect(typeof args.userName).toBe('function');
    expect(typeof args.userAge).toBe('function');
    expect(args).not.toHaveProperty('name'); // Original name not present
    expect(args).not.toHaveProperty('age'); // Original name not present
    expect(args).not.toHaveProperty('active'); // Unmapped param not present
  });

  it('should create args with correct brands (TargetPath)', () => {
    // Arrange
    const spec = {
      userId: 'id',
      hostname: 'config.host', // Map hostname -> config.host
      useEmail: 'config.user.email', // Map useEmail -> config.user.email
    } as const;

    // Act
    const [args] = createMappedNamedArguments<
      typeof complexTarget,
      ComplexTargetArgs, // Explicit A
      typeof spec
    >(spec, complexTarget);

    // Assert Brands
    const idArg = args.userId('abc');
    expect(idArg[BRAND_SYMBOL].name).toBe('id'); // Brand is TargetPath

    const hostArg = args.hostname('localhost');
    expect(hostArg[BRAND_SYMBOL].name).toBe('config.host'); // Brand is TargetPath

    const emailArg = args.useEmail('test@example.com');
    expect(emailArg[BRAND_SYMBOL].name).toBe('config.user.email'); // Brand is TargetPath
  });

  it('should create args with correct input types derived from A and TargetPath', () => {
    // Arrange
    const spec = {
      userId: 'id', // TargetPath 'id' -> string in A
      hostname: 'config.host', // TargetPath 'config.host' -> string in A
      portNum: 'config.port', // TargetPath 'config.port' -> number in A
      sendEmail: 'config.user.notifyVia', // TargetPath 'config.user.notifyVia' -> 'email'|'sms'|undefined in A
      isActive: 'active', // TargetPath 'active' -> boolean|undefined in A
      badPath: 'config.nonexistent.path', // Invalid TargetPath
    } as const;

    // Act
    const [args] = createMappedNamedArguments<
      typeof complexTarget, // Use complex function F
      ComplexTargetArgs, // Provide complex A
      typeof spec
    >(spec, complexTarget);

    // Assert (Compile-time checks + runtime value checks)
    const idArg = args.userId('abc'); // Expects string
    expect(idArg[BRAND_SYMBOL].value).toBe('abc');
    // args.userId(123); // Compile-time error expected

    const hostArg = args.hostname('localhost'); // Expects string
    expect(hostArg[BRAND_SYMBOL].value).toBe('localhost');
    // args.hostname(false); // Compile-time error expected

    const portArg = args.portNum(8080); // Expects number
    expect(portArg[BRAND_SYMBOL].value).toBe(8080);
    // args.portNum('8080'); // Compile-time error expected

    const notifyArg = args.sendEmail('sms'); // Expects 'email'|'sms'|undefined
    expect(notifyArg[BRAND_SYMBOL].value).toBe('sms');
    const notifyArgUndef = args.sendEmail(undefined); // undefined is allowed
    expect(notifyArgUndef[BRAND_SYMBOL].value).toBe(undefined);
    // args.sendEmail('mail'); // Compile-time error expected

    // For optional boolean 'active' (not in complexTargetArgs, just testing GetValueByPath)
    // type TempArgs = { active?: boolean };
    // type TestActive = GetValueByPath<TempArgs, 'active'>; // Should be boolean | undefined
    // Assuming 'active' maps to 'active' which doesn't exist in ComplexTargetArgs, GetValueByPath -> unknown
    // const activeArg = args.isActive(true); // Expects unknown
    // expect(activeArg[BRAND_SYMBOL].value).toBe(true);

    const badPathArg = args.badPath(12345); // Expects unknown because path is invalid
    expect(badPathArg[BRAND_SYMBOL].value).toBe(12345);
    expect(badPathArg[BRAND_SYMBOL].name).toBe('config.nonexistent.path');
  });

  it('should return a MappedBrandedFunction', () => {
    const spec = { key: 'name' } as const;
    const [, func] = createMappedNamedArguments<
      typeof simpleTarget,
      SimpleTargetArgs,
      typeof spec
    >(spec, simpleTarget);

    // Check for existence of expected methods/properties
    expect(typeof func).toBe('function');
    expect(typeof func.partial).toBe('function');
    expect(typeof func.execute).toBe('function');
    expect(typeof func.remainingArgs).toBe('function');
    expect(func).toHaveProperty('_originalFunction');
    expect(func).toHaveProperty('_argMapSpec');
    expect(func).toHaveProperty('_appliedMapKeys');
  });

  // --- Execution Tests ---

  it('should execute the function correctly with mapped args', () => {
    // Arrange
    const spec = {
      userId: 'id',
      host: 'config.host',
      port: 'config.port',
      userEmail: 'config.user.email',
      notificationPref: 'config.user.notifyVia', // Optional target
    } as const;
    const [args, func] = createMappedNamedArguments<
      typeof complexTarget,
      ComplexTargetArgs,
      typeof spec
    >(spec, complexTarget);

    // Act
    const result = func(
      args.userId('user-007'),
      args.host('prod.server'),
      args.port(443),
      args.userEmail('bond@mi6.gov'),
      args.notificationPref('email'), // Provide optional value
    ).execute(); // Execute immediately

    // Assert
    expect(result).toEqual({
      id: 'user-007',
      connection: 'prod.server:443',
      userEmail: 'bond@mi6.gov',
      notify: 'email',
    });
  });

  it('should execute correctly when optional mapped args are omitted', () => {
     // Arrange
     const spec = {
       userId: 'id',
       host: 'config.host',
       port: 'config.port',
       userEmail: 'config.user.email', // Target is optional in structure
       // notificationPref is omitted -> config.user.notifyVia remains undefined
     } as const;
     const [args, func] = createMappedNamedArguments<
       typeof complexTarget,
       ComplexTargetArgs,
       typeof spec
     >(spec, complexTarget);

     // Act
     const result = func(
       args.userId('user-008'),
       args.host('dev.server'),
       args.port(8080),
       args.userEmail('dev@local.test'), // Provide email
       // notificationPref is not available on args
     ).execute();

     // Assert
     expect(result).toEqual({
       id: 'user-008',
       connection: 'dev.server:8080',
       userEmail: 'dev@local.test',
       notify: undefined, // Correctly undefined
     });
  });


  // --- Partial Application Tests ---

  it('should allow partial application via direct call and .partial()', () => {
     // Arrange
     const spec = { name: 'name', age: 'age', status: 'active' } as const;
     const [args, func] = createMappedNamedArguments<
       typeof simpleTarget,
       SimpleTargetArgs,
       typeof spec
     >(spec, simpleTarget);

     // Act: Partial via direct call
     const partial1 = func(args.name('Bob'));
     expect(typeof partial1).toBe('function'); // Returns a function
     expect(partial1._appliedMapKeys).toEqual(['name']);

     // Act: Partial via .partial()
     const partial2 = partial1.partial(args.age(42));
     expect(typeof partial2).toBe('function');
     expect(partial2._appliedMapKeys).toEqual(['name', 'age']);

     // Act: Complete
     const result = partial2(args.status(true)).execute(); // No more args expected by type

     // Assert
     expect(result).toBe('Name: Bob, Age: 42, Active: true');
  });

  it('should filter already applied args (Type Safety)', () => {
    // Arrange
    const spec = { name: 'name', age: 'age' } as const;
    const [args, func] = createMappedNamedArguments<
      typeof simpleTarget,
      SimpleTargetArgs,
      typeof spec
    >(spec, simpleTarget);

    // Act
    const partial1 = func(args.name('Carol'));

    // Assert (Compile-time check)
    // partial1(args.name('David')); // COMPILE ERROR: 'name' is already applied
    // partial1.partial(args.name('Eve')); // COMPILE ERROR: 'name' is already applied

    // Act: Apply remaining arg
    const result = partial1(args.age(30)).execute();

    // Assert Result
    expect(result).toBe('Name: Carol, Age: 30, Active: false');
  });

  it('should allow applying args targeting same base parameter incrementally', () => {
     // Arrange
     const spec = {
       host: 'config.host', // Targets config
       port: 'config.port', // Targets config
       email: 'config.user.email', // Targets config.user
     } as const;
     const [args, func] = createMappedNamedArguments<
       typeof complexTarget,
       ComplexTargetArgs,
       typeof spec
     >(spec, complexTarget);

     // Act: Apply host first
     const partial1 = func.partial(args.host('host1.com'));
     expect(partial1._appliedMapKeys).toEqual(['host']);

     // Act: Apply port next (targets same 'config' base as 'host') - THIS SHOULD WORK
     const partial2 = partial1.partial(args.port(1234));
     expect(partial2._appliedMapKeys).toEqual(['host', 'port']);

     // Assert (Compile-time checks)
     // partial2(args.host('host2.com')); // COMPILE ERROR: 'host' applied
     // partial2(args.port(5678)); // COMPILE ERROR: 'port' applied

     // Act: Apply email
     const partial3 = partial2.partial(args.email('a@b.com'));
     expect(partial3._appliedMapKeys).toEqual(['host', 'port', 'email']);

     // Act: Complete with remaining required arg 'id' (not in spec)
     // Need core args for this - This highlights a limitation/use case:
     // Can't complete if required args aren't mapped. Let's add 'id' to spec.

     const specWithId = { ...spec, id: 'id' } as const;
     const [argsWithId, funcWithId] = createMappedNamedArguments<
       typeof complexTarget,
       ComplexTargetArgs,
       typeof specWithId
     >(specWithId, complexTarget);

     const p1 = funcWithId(argsWithId.host('host1.com'));
     const p2 = p1.partial(argsWithId.port(1234));
     const p3 = p2.partial(argsWithId.email('a@b.com'));
     const finalResult = p3(argsWithId.id('final-id')).execute(); // Apply final required arg

     // Assert
     expect(finalResult).toEqual({
        id: 'final-id',
        connection: 'host1.com:1234',
        userEmail: 'a@b.com',
        notify: undefined,
     });

  });

  // --- remainingArgs Tests ---

  it('should report remaining args correctly', () => {
    // Arrange
    const spec = { name: 'name', age: 'age', status: 'active' } as const;
    const [args, func] = createMappedNamedArguments<
      typeof simpleTarget,
      SimpleTargetArgs,
      typeof spec
    >(spec, simpleTarget);

    // Assert initial state
    expect(func.remainingArgs()).toEqual(['name', 'age', 'status']);

    // Act
    const partial1 = func(args.name('Frank'));

    // Assert after first partial application
    expect(partial1.remainingArgs()).toEqual(['age', 'status']);

    // Act
    const partial2 = partial1.partial(args.status(false)); // Apply optional arg

    // Assert after second partial application
    expect(partial2.remainingArgs()).toEqual(['age']);

    // Act
    const partial3 = partial2(args.age(55));

    // Assert final state
    expect(partial3.remainingArgs()).toEqual([]);
  });

  // --- Edge Cases ---

  it('should handle empty spec map', () => {
    const spec = {} as const;
    const [args, func] = createMappedNamedArguments<
      typeof simpleTarget,
      SimpleTargetArgs,
      typeof spec
    >(spec, simpleTarget);

    expect(Object.keys(args).length).toBe(0);
    expect(func.remainingArgs()).toEqual([]); // No mapped args to apply

    // Can only call execute if original function has no required args or defaults
    // simpleTarget requires name and age, so execute would likely fail here
    // expect(() => func.execute()).toThrow(); // Or handle based on core logic
  });

  it('should warn and skip invalid target paths in spec', () => {
    const spec = {
       good: 'name',
       bad: '', // Invalid empty path
       alsoBad: null as any // Invalid null path
    } as const;

    const [args, func] = createMappedNamedArguments<
      typeof simpleTarget,
      SimpleTargetArgs,
      typeof spec
    >(spec, simpleTarget);

    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid target path found for argument "bad"'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid target path found for argument "alsoBad"'));
    expect(args).toHaveProperty('good');
    expect(args).not.toHaveProperty('bad');
    expect(args).not.toHaveProperty('alsoBad');
  });

});