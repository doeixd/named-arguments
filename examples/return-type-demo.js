/**
 * This is a runtime demo of the partial application behavior
 * It doesn't demonstrate TypeScript's type checking, but shows
 * the runtime behavior that distinguishes between partial and complete application
 */

// Simple implementation of the named arguments pattern
const BRAND_SYMBOL = Symbol('namedArg');

// Create a branded argument
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
function createBrandedFunction(func, paramNames, paramRequiredness, storedArgs = {}, appliedParams = []) {
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
    
    // Check if all required parameters are provided
    const requiredParams = paramNames.filter((name, i) => paramRequiredness[i]);
    const allRequiredProvided = requiredParams.every(param => 
      newAppliedParams.includes(param)
    );
    
    // If not all required params provided, return a partial function
    if (!allRequiredProvided) {
      console.log(`Partial application: missing some required parameters`);
      return createBrandedFunction(func, paramNames, paramRequiredness, args, newAppliedParams);
    }
    
    // Call the function with all arguments
    const orderedArgs = paramNames.map(name => args[name]);
    console.log(`Complete application: calling function with args:`, orderedArgs);
    return func(...orderedArgs);
  };
  
  // Add partial method
  brandedFunc.partial = function(...args) {
    if (args.length === 0) return this;
    const result = this(...args);
    // Always return a branded function, even if all required args are provided
    return typeof result === 'function' ? result : this;
  };
  
  // Add method to get remaining required arguments
  brandedFunc.remainingArgs = function() {
    return paramNames
      .filter((name, i) => paramRequiredness[i] && !appliedParams.includes(name));
  };
  
  return brandedFunc;
}

// Our example function
function add(a, b, c) {
  return a + b + c;
}

// Parameter configuration
const paramNames = ['a', 'b', 'c'];
const paramRequiredness = [true, true, true]; // all required

// Create named arguments
const args = {
  a: createNamedArg('a'),
  b: createNamedArg('b'),
  c: createNamedArg('c')
};

// Create branded function
const namedAdd = createBrandedFunction(add, paramNames, paramRequiredness);

// Example 1: Partial application (only 'a') - returns a function
console.log('\nExample 1: Partial application with only "a"');
const addWithA = namedAdd.partial(args.a(5));
console.log('Remaining required args:', addWithA.remainingArgs());
console.log('Is addWithA a function?', typeof addWithA === 'function');

// Example 2: Complete application - returns the result
console.log('\nExample 2: Complete application with all parameters');
const result = namedAdd(args.a(5), args.b(10), args.c(15));
console.log('Result:', result);

// Example 3: Multiple step partial application
console.log('\nExample 3: Multi-step partial application');
console.log('Step 1: Apply parameter "a"');
const step1 = namedAdd.partial(args.a(2));
console.log('Remaining args:', step1.remainingArgs());
console.log('Is step1 a function?', typeof step1 === 'function');

console.log('Step 2: Apply parameter "b"');
const step2 = step1.partial(args.b(3));
console.log('Remaining args:', step2.remainingArgs());
console.log('Is step2 a function?', typeof step2 === 'function');

console.log('Step 3: Apply parameter "c"');
const finalResult = step2(args.c(4));
console.log('Final result:', finalResult);

// Example 4: Function with optional parameters
console.log('\nExample 4: Function with optional parameters');
function greet(name, greeting = 'Hello', punctuation = '!') {
  return `${greeting}, ${name}${punctuation}`;
}

// Parameter configuration
const greetParamNames = ['name', 'greeting', 'punctuation'];
const greetRequiredness = [true, false, false]; // only name is required

// Create named arguments
const greetArgs = {
  name: createNamedArg('name'),
  greeting: createNamedArg('greeting'),
  punctuation: createNamedArg('punctuation')
};

// Create branded function
const namedGreet = createBrandedFunction(greet, greetParamNames, greetRequiredness);

// Only providing the required parameter returns the result directly
console.log('Providing just the required "name" parameter:');
const greetResult = namedGreet(greetArgs.name('World'));
console.log('greetResult:', greetResult);

// The partial application with all required parameters still returns a function
console.log('Partial application with just the required "name" parameter:');
const greetWorld = namedGreet.partial(greetArgs.name('World'));
console.log('Is greetWorld a function?', typeof greetWorld === 'function');
console.log('Remaining required args:', greetWorld.remainingArgs());

// Adding optional parameters through the partial function
console.log('Adding optional parameters:');
const customGreet = greetWorld(
  greetArgs.greeting('Hi'),
  greetArgs.punctuation('?')
);
console.log('customGreet result:', customGreet);