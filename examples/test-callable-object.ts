/**
 * Test for callable objects in named arguments
 */
import { createNamedArguments } from '../src/named_args.og';

// Define interfaces for our function parameters
interface Config {
  id: number;
  options: {
    enabled: boolean;
    mode: string;
  };
}

// Define a function that takes an options object
function testFunction(
  name: string,
  config: Config
) {
  console.log(`Name: ${name}`);
  console.log(`Config:`, config);
  return { name, config };
}

// Create named arguments with explicit type
const [args, namedTest] = createNamedArguments<
  typeof testFunction,
  {
    name: string;
    config: Config;
  }
>(testFunction);

// Test direct call with config object
console.log('\nTest 1: Using object properties:');
try {
  const result1 = namedTest(
    args.name('test1'),
    args.config({
      id: 1,
      options: {
        enabled: true,
        mode: 'standard'
      }
    })
  );
  console.log('Success! Result:', result1);
} catch (error) {
  console.error('Error:', error);
}

// Test partial application
console.log('\nTest 2: Partial application:');
try {
  const partial = namedTest.partial(
    args.config({
      id: 3,
      options: {
        enabled: true,
        mode: 'debug'
      }
    })
  );
  const result2 = partial(args.name('test2'));
  console.log('Success! Result:', result2);
} catch (error) {
  console.error('Error:', error);
}