# New Features: Return Type Precision & Parameter Tracking

## Type-Safe Partial Application

The Named Arguments library now provides enhanced type-safety for partial application, ensuring that parameters can only be applied once and providing more precise return type information based on required parameters.

### Key Improvements

1. **Parameter Tracking**: The TypeScript type system now tracks which parameters have already been applied, preventing duplicate parameter application at compile time.

2. **Precise Return Types**: Return types are now more specific:
   - If all required parameters are provided, the return type is the function's return value
   - If not all required parameters are provided, the return type is a partially applied function

3. **Runtime Warnings**: The library provides runtime warnings if you attempt to apply the same parameter twice (in addition to the TypeScript type prevention)

### Examples

#### 1. Preventing Duplicate Parameter Application

```typescript
// Create a function with named arguments
function add(a: number, b: number, c: number): number {
  return a + b + c;
}

const [args, namedAdd] = createNamedArguments<
  typeof add,
  { a: number; b: number; c: number }
>(add);

// Create a partial application with 'a' parameter
const addWithA = namedAdd.partial(args.a(5));

// TypeScript will prevent applying 'a' again
// This would cause a compile-time error:
// const error = addWithA(args.a(10)); // Error: Parameter 'a' already applied

// You can apply different parameters
const result = addWithA(args.b(10), args.c(15)); // 30
```

#### 2. Return Type Precision with Required Parameters

```typescript
// Function with required and optional parameters
function greet(name: string, greeting?: string): string {
  return `${greeting || 'Hello'}, ${name}!`;
}

// Specify which parameters are required
const [args, namedGreet] = createNamedArguments<
  typeof greet,
  { name: string; greeting?: string }
>(
  greet,
  [
    { name: 'name', required: true },
    { name: 'greeting', required: false }
  ]
);

// TypeScript knows this returns a string (not a function)
// because all required parameters are provided
const greeting = namedGreet(args.name('World')); // Type: string

// TypeScript knows this returns a partially applied function
// because no required parameters are provided yet
const partialGreet = namedGreet.partial(); // Type: BrandedFunction<typeof greet, []>
```

### Implementation Details

The improvements are based on:

1. **Enhanced Type Utility Functions**:
   - `ExtractArgName`: Extracts parameter names from branded arguments
   - `ExtractBaseParamName`: Handles nested parameter names
   - `IsNameApplied`: Checks if a parameter is already applied
   - `FilterBrandedArgs`: Filters out already applied arguments 

2. **Return Type Determination**:
   - `AreAllRequiredParamsProvided`: Checks if all required parameters are provided
   - `PartialApplicationReturnType`: Determines the return type based on required parameters

These enhancements provide a more intuitive developer experience with TypeScript, reducing errors and making partial application more powerful and type-safe.

## How To Use

Simply update to the latest version of the library to benefit from these improvements. Your existing code should work without changes, but now with enhanced type safety and more precise return types.

```typescript
// With proper parameter information, TypeScript can determine precise return types
const [args, namedFunc] = createNamedArguments(
  myFunction,
  [
    { name: 'param1', required: true },
    { name: 'param2', required: true },
    { name: 'param3', required: false }
  ]
);

// TypeScript knows this returns a partially applied function
const partial = namedFunc(args.param1('value'));

// TypeScript knows this returns the function's return type
const result = namedFunc(args.param1('value'), args.param2('value2'));
```