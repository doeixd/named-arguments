/**
 * Example of type-safe partial application using the named arguments library
 * 
 * This example demonstrates how the library prevents applying the same parameter twice
 * both at compile time (TypeScript errors) and runtime (warning messages).
 */
import { createNamedArguments } from '../src/named_args.og';

// Simple add function with three parameters
function add(a: number, b: number, c: number): number {
  return a + b + c;
}

// Create named arguments for the add function
const [args, namedAdd] = createNamedArguments<
  typeof add,
  { a: number; b: number; c: number }
>(add);

// Basic usage - all arguments at once
console.log('--- Basic usage ---');
const result = namedAdd(args.a(5), args.b(10), args.c(15));
console.log('Result:', result); // 30

// Partial application with just 'a' parameter
console.log('\n--- Partial application with "a" ---');
const addWithA = namedAdd.partial(args.a(5));

// Show the remaining required arguments
console.log('Remaining args:', addWithA.remainingArgs()); // ['b', 'c']

// Use the partial function with the remaining parameters
const result1 = addWithA(args.b(10), args.c(15));
console.log('Result with addWithA(b(10), c(15)):', result1); // 30

// With the updated TypeScript declarations, the type system should prevent this,
// but we demonstrate the runtime behavior anyway using 'as any'
console.log('\n--- Attempting to reapply parameter "a" (will show warning) ---');
const resultWithWarning = addWithA(args.a(10) as any, args.c(15));
console.log('Result with warning:', resultWithWarning); // 30, but with warning

// Create a partial with 'b' parameter
console.log('\n--- Partial application with "b" ---');
const addWithB = namedAdd.partial(args.b(20));
console.log('Remaining args:', addWithB.remainingArgs()); // ['a', 'c']

// Multi-step partial application
console.log('\n--- Multi-step partial application ---');
// Apply parameter 'a' first
const step1 = namedAdd.partial(args.a(5));
// Then apply parameter 'b'
const step2 = step1.partial(args.b(10));
// Finally apply parameter 'c'
const result2 = step2(args.c(15));
console.log('Result after multi-step application:', result2); // 30

// Try with object parameters
console.log('\n--- Object parameter example ---');
interface UserConfig {
  name: string;
  settings: {
    theme: string;
    notifications: boolean;
  };
}

function configureUser(config: UserConfig): string {
  return `User ${config.name} configured with theme ${config.settings.theme} and notifications ${config.settings.notifications ? 'ON' : 'OFF'}`;
}

const [configArgs, namedConfig] = createNamedArguments<
  typeof configureUser,
  { config: UserConfig }
>(configureUser);

// Full configuration
const configResult = namedConfig(
  configArgs.config({
    name: 'Alice',
    settings: { theme: 'default', notifications: false }
  })
);

console.log('Config result:', configResult);

// Since we've completely satisfied all parameters, there's no need
// for partial application in this case
console.log('Remaining args:', namedConfig.remainingArgs()); // ['config']