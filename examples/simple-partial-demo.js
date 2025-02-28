/**
 * Simplified demonstration of type-safe partial application
 * 
 * This example shows the core concept of how the library prevents
 * applying the same parameter multiple times.
 */

// Simple implementation of the named arguments pattern
const BRAND_SYMBOL = Symbol('namedArg');

// Function to create a branded argument
function createNamedArg(name) {
  return (value) => ({ [BRAND_SYMBOL]: { name, value } });
}

// Check if something is a branded argument
function isBrandedArg(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    BRAND_SYMBOL in value &&
    typeof value[BRAND_SYMBOL] === 'object' &&
    'name' in value[BRAND_SYMBOL] &&
    'value' in value[BRAND_SYMBOL]
  );
}

// Create a branded function
function createBrandedFunction(func, paramNames, storedArgs = {}, appliedParams = []) {
  const brandedFunc = function(...brandedArgs) {
    const args = { ...storedArgs };
    const newAppliedParams = [...appliedParams];
    
    // Process each branded argument
    for (const arg of brandedArgs) {
      if (!isBrandedArg(arg)) continue;
      
      const { name, value } = arg[BRAND_SYMBOL];
      
      // Skip this arg if the parameter has already been applied
      if (appliedParams.includes(name)) {
        console.warn(`Parameter ${name} has already been applied, ignoring`);
        continue;
      }
      
      // Add the argument
      args[name] = value;
      if (!newAppliedParams.includes(name)) {
        newAppliedParams.push(name);
      }
    }
    
    // If not all params provided, return a partial function
    if (newAppliedParams.length < paramNames.length) {
      return createBrandedFunction(func, paramNames, args, newAppliedParams);
    }
    
    // Call the function with all arguments
    const orderedArgs = paramNames.map(name => args[name]);
    return func.apply(null, orderedArgs);
  };
  
  // Add partial method
  brandedFunc.partial = function(...args) {
    if (args.length === 0) return this;
    return this(...args);
  };
  
  // Add method to get remaining args
  brandedFunc.remainingArgs = function() {
    return paramNames.filter(name => !appliedParams.includes(name));
  };
  
  // Add tracking for applied parameters
  brandedFunc._appliedNames = appliedParams;
  
  return brandedFunc;
}

// Sample function that we'll use
function calculate(a, b, c) {
  return a * b + c;
}

// Function parameter names
const calcParams = ['a', 'b', 'c'];

// Create named arguments for the function
const args = {
  a: createNamedArg('a'),
  b: createNamedArg('b'),
  c: createNamedArg('c')
};

// Create the branded function
const namedCalculate = createBrandedFunction(calculate, calcParams);

// Example 1: Basic usage
console.log('--- Basic Usage ---');
const result = namedCalculate(args.a(5), args.b(10), args.c(2));
console.log('Basic result:', result); // 52

// Example 2: Partial application
console.log('\n--- Partial Application ---');
const calculateWithA = namedCalculate.partial(args.a(5));
console.log('Remaining args:', calculateWithA.remainingArgs());

const calculateWithAB = calculateWithA.partial(args.b(10));
console.log('Remaining args:', calculateWithAB.remainingArgs());

const partialResult = calculateWithAB(args.c(2));
console.log('Result after partial application:', partialResult); // 52

// Example 3: Attempt to reapply a parameter
console.log('\n--- Parameter Already Applied ---');
console.log('Attempting to reapply parameter "a" (expect warning):');
const withDuplicateA = calculateWithA.partial(args.a(10)); // Should warn
console.log('Remaining args after duplicate attempt:', withDuplicateA.remainingArgs());

// Example 4: Multi-step partial application
console.log('\n--- Multi-step Partial Application ---');
const withA = namedCalculate.partial(args.a(2));
const withAB = withA.partial(args.b(3));
const finalResult = withAB(args.c(4));
console.log('Multi-step result:', finalResult); // 10