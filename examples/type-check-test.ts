/**
 * This file is designed to test whether TypeScript catches the 
 * error of reapplying the same parameter twice.
 */
import { createNamedArguments } from '../src/named_args';

// Simple add function with three parameters
function add(a: number, b: number, c: number): number {
  return a + b + c;
}

// Create named arguments for the add function
const [args, namedAdd] = createNamedArguments<
  typeof add,
  { a: number; b: number; c: number }
>(add);

// Partial application with just 'a' parameter
const addWithA = namedAdd.partial(args.a(5));

// This should cause a TypeScript error:
// Attempt to reapply parameter 'a' which has already been applied
const resultWithError = addWithA(args.a(10), args.c(15));