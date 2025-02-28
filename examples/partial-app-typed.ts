/**
 * Example of type-safe partial application using the named arguments library
 * 
 * This demonstrates how the type system prevents reapplying parameters
 * that have already been applied through partial application.
 */
// Using CommonJS require for compatibility with ts-node
// const { createNamedArguments } = require('../src/named_args');
import { createNamedArguments } from "../src/named_args";

// Define a simple function with three parameters
function calculate(a: number, b: number, c: number): number {
  return a * b + c;
}

// Create named arguments for the calculate function
const [args, namedCalculate] = createNamedArguments<
  typeof calculate,
  { a: number; b: number; c: number }
>(calculate);

// Example 1: Basic usage
const result = namedCalculate(args.a(5), args.b(10), args.c(2));
console.log('Basic result:', result); // 52

// Example 2: Partial application with type safety
// Create a partial function with just 'a' parameter
const calculateWithA = namedCalculate.partial(args.a(5));

// TypeScript will error if we try to use args.a again
// Uncomment to see the type error:
// const calculateWithAB = calculateWithA.partial(args.a(10)); // Error: args.a is not allowed here

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

// Example 4: Attempt invalid partial application
// This will not compile if uncommented:
// const invalid = withA.partial(args.a(10)); // Error: Parameter 'a' already applied

// Example 5: Function that modifies multiple values
function multiplyAddDivide(a: number, b: number, c: number, d: number): number {
  return (a * b + c) / d;
}

const [multiArgs, namedMulti] = createNamedArguments<
  typeof multiplyAddDivide,
  { a: number; b: number; c: number; d: number }
>(multiplyAddDivide);

// Partial application in different orders
const multiWithA = namedMulti.partial(multiArgs.a(10));
const multiWithAC = multiWithA.partial(multiArgs.c(5));
// Can't reapply 'a' or 'c'
// const badMulti = multiWithAC.partial(multiArgs.a(20)); // Error: Parameter 'a' already applied
// const badMulti2 = multiWithAC.partial(multiArgs.c(20)); // Error: Parameter 'c' already applied
// But can apply 'b' and 'd'
const multiWithACB = multiWithAC.partial(multiArgs.b(2));
const result2 = multiWithACB(multiArgs.d(5));
console.log('Complex partial application result:', result2); // 5