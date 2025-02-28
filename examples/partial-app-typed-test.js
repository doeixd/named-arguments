/**
 * Example of type-safe partial application using the named arguments library
 * 
 * This demonstrates how the type system prevents reapplying parameters
 * that have already been applied through partial application.
 * 
 * Plain JavaScript version for testing.
 */
// Using plain JavaScript require with ts-node/register
const { createNamedArguments } = require('../src/named_args.og');

// Define a simple function with three parameters
function calculate(a, b, c) {
  return a * b + c;
}

// Create named arguments for the calculate function
const [args, namedCalculate] = createNamedArguments(calculate);

// Example 1: Basic usage
const result = namedCalculate(args.a(5), args.b(10), args.c(2));
console.log('Basic result:', result); // 52

// Example 2: Partial application with type safety
// Create a partial function with just 'a' parameter
const calculateWithA = namedCalculate.partial(args.a(5));

// But we can legally use b and c
const calculateWithAB = calculateWithA.partial(args.b(10));
console.log('Remaining args for calculateWithAB:', calculateWithAB.remainingArgs()); // ['c']

// Finally complete the call
const partialResult = calculateWithAB(args.c(2));
console.log('Partial application result:', partialResult); // 52

// Example 3: Multi-step partial application
// Create a function with only 'a'
const withA = namedCalculate.partial(args.a(2));
// Add 'b' 
const withAB = withA.partial(args.b(3));
// Add 'c'
const finalResult = withAB(args.c(4));
console.log('Multi-step result:', finalResult); // 10

// Example 4: Type safety at runtime
// This would normally not compile, but we can test the runtime warning
try {
  console.log('\nAttempting to reapply parameter "a" (should show warning):');
  const invalid = withA.partial(args.a(10));
  // Should show a warning but not error
} catch (e) {
  console.error('Error:', e);
}

// Example 5: Function that modifies multiple values
function multiplyAddDivide(a, b, c, d) {
  return (a * b + c) / d;
}

const [multiArgs, namedMulti] = createNamedArguments(multiplyAddDivide);

// Partial application in different orders
const multiWithA = namedMulti.partial(multiArgs.a(10));
const multiWithAC = multiWithA.partial(multiArgs.c(5));

// But can apply 'b' and 'd'
const multiWithACB = multiWithAC.partial(multiArgs.b(2));
const result2 = multiWithACB(multiArgs.d(5));
console.log('Complex partial application result:', result2); // 5