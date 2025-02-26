/**
 * Named Arguments for TypeScript
 * @module namedArguments
 * 
 * This module provides utility functions to create and use named arguments in TypeScript.
 * It allows for more flexible and readable function calls, especially for functions with many parameters.
 * 
 * @example
 * Basic usage:
 * 
 * ```typescript
 * import { createNamedArguments } from './path/to/your/module';
 * 
 * function greet(name: string, age: number, city: string) {
 *   console.log(`Hello, ${name}! You are ${age} years old and live in ${city}.`);
 * }
 * 
 * const [args, namedGreet] = createNamedArguments(greet);
 * 
 * namedGreet(
 *   args.name("Alice"),
 *   args.age(30),
 *   args.city("New York")
 * ); // Outputs: Hello, Alice! You are 30 years old and live in New York.
 * 
 * // Order doesn't matter
 * namedGreet(
 *   args.city("London"),
 *   args.name("Bob"),
 *   args.age(25)
 * ); // Outputs: Hello, Bob! You are 25 years old and live in London.
 * ```
 * 
 * @example
 * Using createConfigurableFunction for partial application:
 * 
 * ```typescript
 * import { createNamedArguments, createConfigurableFunction } from './path/to/your/module';
 * 
 * function divide(a: number, b: number) {
 *   return a / b;
 * }
 * 
 * const [args, namedDivide] = createNamedArguments(divide);
 * const configurableDivide = createConfigurableFunction([args, namedDivide]);
 * 
 * const divideByTwo = configurableDivide(args => {
 *   args.b(2);
 * });
 * 
 * console.log(divideByTwo(10)); // Outputs: 5
 * console.log(divideByTwo(20)); // Outputs: 10
 * ```
 * 
 * @example
 * Working with optional and rest parameters:
 * 
 * ```typescript
 * import { createNamedArguments } from './path/to/your/module';
 * 
 * function printInfo(name: string, age?: number, ...hobbies: string[]) {
 *   console.log(`Name: ${name}`);
 *   if (age !== undefined) console.log(`Age: ${age}`);
 *   if (hobbies.length > 0) console.log(`Hobbies: ${hobbies.join(', ')}`);
 * }
 * 
 * const [args, namedPrintInfo] = createNamedArguments(printInfo);
 * 
 * namedPrintInfo(
 *   args.name("Charlie"),
 *   args.hobbies("reading", "cycling", "cooking")
 * );
 * // Outputs:
 * // Name: Charlie
 * // Hobbies: reading, cycling, cooking
 * ```
 */

export {
  isBrandedArg,
  createConfigurableFunction,
  BrandedArg,
  ArgTypes,
  BrandedFunction,
  // Re-export the helper functions and types as well
  parseFunctionArguments,
  splitArguments,
  parseArgument,
  safeEval,
  ArgumentInfo,
  isBrandedFunction
} from './named_arguments';

// If you want to provide a default export, you can do so like this:
import * as namedArguments from './named_arguments';
export default namedArguments;