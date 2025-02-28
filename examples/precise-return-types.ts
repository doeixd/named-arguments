/**
 * This example demonstrates the enhanced return type precision 
 * for partial application with named arguments.
 * 
 * The key improvement is that the return type is now more precise:
 * - If all required parameters are provided, it returns the function's return type
 * - If not all required parameters are provided, it returns a partially applied function
 */
import { createNamedArguments } from '../src/named_args';

// Function with all required parameters
function add(a: number, b: number, c: number): number {
  return a + b + c;
}

// Create named arguments with explicit parameter info and type args
const [addArgs, namedAdd] = createNamedArguments<
  typeof add,
  { a: number; b: number; c: number }
>(
  add,
  [
    { name: 'a', required: true },
    { name: 'b', required: true },
    { name: 'c', required: true }
  ]
);

// Example 1: Partial application (only 'a')
const addWithA = namedAdd.partial(addArgs.a(5));
// Type: BrandedFunction<typeof add, ['a']>
// This is a partially applied function because we haven't provided all required args

// Example 2: Complete application (all parameters)
const result = namedAdd(addArgs.a(5), addArgs.b(10), addArgs.c(15));
// Type: number - because all required parameters are provided

// Example 3: Another partial application (a + b)
const addWithAB = namedAdd.partial(addArgs.a(5), addArgs.b(10));
// Type: BrandedFunction<typeof add, ['a', 'b']>

// Example 4: Complete the partial application
const result2 = addWithAB(addArgs.c(15));
// Type: number - all required parameters are now provided

// Function with optional parameters
function greet(name: string, greeting?: string, punctuation?: string): string {
  return `${greeting || 'Hello'}, ${name}${punctuation || '!'}`;
}

// Create named arguments with explicit parameter info and type args
const [greetArgs, namedGreet] = createNamedArguments<
  typeof greet,
  { name: string; greeting?: string; punctuation?: string }
>(
  greet,
  [
    { name: 'name', required: true },
    { name: 'greeting', required: false, defaultValue: 'Hello' },
    { name: 'punctuation', required: false, defaultValue: '!' }
  ]
);

// Example 5: With only the required parameter
const result3 = namedGreet(greetArgs.name('World'));
// Type: string - because all required parameters ('name') are provided
console.log(result3); // "Hello, World!"

// Example 6: Partial application with the required parameter
const greetWorld = namedGreet.partial(greetArgs.name('World'));
// Type: BrandedFunction<typeof greet, ['name']>
// Actually returns a value, not a partial function, because 'name' is the only required parameter

// Test the examples
console.log('Example 1 (addWithA is a function):', typeof addWithA === 'function');

console.log('Example 2 (result is a number):', result);

console.log('Example 3 (addWithAB is a function):', typeof addWithAB === 'function');

console.log('Example 4 (result2 is a number):', result2);

console.log('Example 5 (result3 is a string):', result3);

console.log('Example 6 (greetWorld with optional params):', 
  greetWorld(greetArgs.greeting('Hi'), greetArgs.punctuation('?')));

// TypeScript can now accurately determine the return type based on parameter requirements:
// 1. If all required parameters are provided, the return type is the function's return type
// 2. If not all required parameters are provided, the return type is a partially applied function