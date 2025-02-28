/**
 * Simple test for callable objects
 */
import { createNamedArguments } from '../src/named_args';

// Define a simple function with an object parameter
function simpleFunction(
  name: string, 
  options: {
    id: number;
    mode: string;
  }
) {
  console.log(`Name: ${name}, ID: ${options.id}, Mode: ${options.mode}`);
  return { name, options };
}

// Create named arguments
const [args, namedFunc] = createNamedArguments<
  typeof simpleFunction,
  {
    name: string;
    options: {
      id: number;
      mode: string;
    };
  }
>(simpleFunction);

// Test calling with the object parameter
console.log('Test: Basic call with object parameter');
const result = namedFunc(
  args.name('Test'),
  args.options({
    id: 123,
    mode: 'test'
  })
);

console.log('Result:', result);