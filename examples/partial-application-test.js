/**
 * Example of type-safe partial application using the named arguments library
 * 
 * This demonstrates the runtime behavior of the library when it comes to
 * preventing application of the same parameter multiple times.
 */

// Import the named_arguments.ts file using CommonJS
const { createNamedArguments } = require('../src/named_arguments');

// Define a simple function with three parameters
function calculate(a, b, c) {
  return a * b + c;
}

// Create named arguments for the calculate function
const [args, namedCalculate] = createNamedArguments(calculate);

// Example 1: Basic usage
const result = namedCalculate(args.a(5), args.b(10), args.c(2));
console.log('Basic result:', result); // 52

// Example 2: Partial application
// Create a partial function with just 'a' parameter
const calculateWithA = namedCalculate.partial(args.a(5));

// Show the remaining arguments
console.log('Remaining args for calculateWithA:', calculateWithA.remainingArgs());

// Add the 'b' parameter
const calculateWithAB = calculateWithA.partial(args.b(10));
console.log('Remaining args for calculateWithAB:', calculateWithAB.remainingArgs());

// Finally complete the call with 'c'
const partialResult = calculateWithAB(args.c(2));
console.log('Partial application result:', partialResult); // 52

// Example 3: Attempt to reapply a parameter
// This should show a warning but still work
console.log('\nAttempting to reapply parameter "a" (should show warning):');
const withDuplicateA = calculateWithA.partial(args.a(10));

// Example 4: Multi-step partial application
console.log('\nMulti-step partial application:');
const withA = namedCalculate.partial(args.a(2));
const withAB = withA.partial(args.b(3));
const finalResult = withAB(args.c(4));
console.log('Multi-step result:', finalResult); // 10

// Example 5: Function with more parameters
console.log('\nFunction with more parameters:');
function multiplyAddDivide(a, b, c, d) {
  return (a * b + c) / d;
}

const [multiArgs, namedMulti] = createNamedArguments(multiplyAddDivide);

// Apply parameters in different orders
const multiWithA = namedMulti.partial(multiArgs.a(10));
const multiWithAC = multiWithA.partial(multiArgs.c(5));
console.log('Remaining args for multiWithAC:', multiWithAC.remainingArgs());

// Try reapplying 'a' - should show warning
console.log('\nAttempting to reapply parameter "a" in complex function:');
const badMulti = multiWithAC.partial(multiArgs.a(20));

// Continue with valid params
const multiWithACB = multiWithAC.partial(multiArgs.b(2));
const result2 = multiWithACB(multiArgs.d(5));
console.log('Complex partial application result:', result2); // 5