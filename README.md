# Named Arguments

A TypeScript library that brings named arguments and elegant partial application to JavaScript/TypeScript functions.

## Features

- **Named Arguments**: Call functions with arguments in any order, making your code more readable and less error-prone
- **Partial Application**: Easily create functions with some arguments pre-applied
- **Configurable Functions**: Define reusable function configurations
- **Type Safety**: Full TypeScript support with type inference

## Installation

```bash
npm install @doeixd/named-args
```

## Named Arguments

```typescript
import { createNamedArguments } from '@doeixd/named-args';

// A function with several parameters
function createUser(firstName: string, lastName: string, age: number, email: string) {
  return { firstName, lastName, age, email };
}

// Create named arguments for the function
// The type parameter specifies the argument names matching the function parameters
const [args, namedCreateUser] = createNamedArguments<
  {firstName: string, lastName: string, age: number, email: string},
  typeof createUser
>(createUser);

// Use named arguments in any order
const user = namedCreateUser(
  args.email('john.doe@example.com'),
  args.firstName('John'),
  args.age(30),
  args.lastName('Doe')
);

console.log(user);
// { firstName: 'John', lastName: 'Doe', age: 30, email: 'john.doe@example.com' }
```

## Partial Application

```typescript
import { createNamedArguments } from '@doeixd/named-args';

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

// Create named arguments
const [args, namedFormat] = createNamedArguments(formatCurrency);

// Create a partial application for USD in US English
const formatUSD = namedFormat(
  args.currency('USD'),
  args.locale('en-US')
);

// Use the partial application with remaining arguments
const price = formatUSD(args.amount(1234.56));
console.log(price); // "$1,234.56"
```
Unlike traditional currying which requires parameters in a specific order, this approach lets you apply arguments in any order, at any time.

### Multi-Stage Partial Application

You can create multiple layers of specialization, building on previous partial applications:

```typescript
// First stage: Create base API request with common headers
const apiRequest = namedRequest(
  args.headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': 'your-api-key'
  })
);

// Second stage: Create method-specific requests
const getRequest = apiRequest(args.method('GET'));
const postRequest = apiRequest(args.method('POST'));

// Third stage: Domain-specific requests
const userApiGet = getRequest(
  args.url('https://api.example.com/users'),
  args.timeout(5000)
);
```
This allows for a tree of increasingly specialized functions that builds naturally as needed.

## Advanced Use Cases

### Progressive Configuration Builders

The library enables fluent, chainable configuration builders that progressively accumulate settings:

```typescript
const usersQuery = createQueryBuilder('https://api.example.com/users');
const url = usersQuery
  .filter({ status: 'active', role: 'admin' })
  .sort('-created_at')
  .limit(10)
  .offset(20)
  .includes(['profile', 'posts'])
  .build();
```

### Command Pattern with Undo/Redo

Implement the Command pattern with built-in undo/redo capability:

```typescript
const commandSystem = createCommandSystem(document);

// Execute commands
const undoInsert = commandSystem.insertText(10, "Hello world");
const undoDelete = commandSystem.deleteText(5, 3);

// Undo operations by executing the returned inverse commands
commandSystem.executeCommand(undoInsert);
commandSystem.executeCommand(undoDelete);
```

### Strategy Factory Pattern

Create specialized implementations of a strategy based on different parameter combinations:

```typescript
const searchFactory = createSearchFactory(apiClient);

// Create specialized search strategies
const userSearch = searchFactory.createUserSearch(true); // fuzzy search
const productSearch = searchFactory.createProductSearch({ 
  category: 'electronics', 
  inStock: true 
});

// Use the strategies
const users = await userSearch.search("john");
const products = await productSearch.search("laptop");
```

### Test Fixture Builders

Create flexible test fixtures with sensible defaults that can be overridden:

```typescript
const userFixtures = createUserFixtureBuilder();

// Create different types of users with minimal code
const basicUser = userFixtures.basic();
const adminUser = userFixtures.admin();
const userWithProfile = userFixtures.withProfile("I'm a developer", "avatar.png");
const specificUser = userFixtures.custom({
  name: "Jane Smith",
  email: "jane@example.com",
  role: "admin"
});
```

## Why This Matters

These patterns provide several key benefits:

1. **Composability**: Functions can be specialized incrementally
2. **Reusability**: Partially applied functions create reusable building blocks
3. **Separation of Concerns**: Configure different aspects of a function independently
4. **Type Safety**: Maintain full TypeScript type checking at every stage
5. **Readability**: Self-documenting code that clearly shows which arguments are being used

This library takes the functional programming concept of partial application and makes it more practical and flexible for real-world TypeScript applications, enabling elegant API designs that would be cumbersome with traditional approaches.


## Configurable Functions

```typescript
import { createNamedArguments, createConfigurableFunction } from '@doeixd/named-args';

function processArray<T>(
  array: T[],
  filterFn: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number,
  limit?: number
): T[] {
  let result = array.filter(filterFn);
  
  if (sortFn) {
    result = result.sort(sortFn);
  }
  
  if (limit !== undefined && limit >= 0) {
    result = result.slice(0, limit);
  }
  
  return result;
}

// Create named arguments with explicit parameter names that match the function
const [args, namedProcess] = createNamedArguments<
  {array: T[], filterFn: (item: T) => boolean, sortFn?: (a: T, b: T) => number, limit?: number},
  typeof processArray
>(processArray);

// Create a configurable function
const configureArrayProcessor = createConfigurableFunction([args, namedProcess]);

// Configure a processor for top N positive numbers
// Specify which parameters we're configuring using the generic parameter
const topPositiveNumbers = configureArrayProcessor<'filterFn' | 'sortFn'>(args => {
  // Filter for positive numbers
  args.filterFn(num => num > 0);
  
  // Sort in descending order
  args.sortFn((a, b) => b - a);
});

// The resulting function accepts the remaining parameters
const numbers = [-5, 10, 3, -2, 8, 1, -1, 6];
const top3Positive = topPositiveNumbers(numbers, 3);

console.log(top3Positive); // [10, 8, 6]

// You can also use named arguments for complete type safety
const top5Positive = topPositiveNumbers(args.array(numbers), args.limit(5));
```

## Advanced Features

### Rest Parameters

The library supports rest parameters:

```typescript
function sum(first: number, ...rest: number[]) {
  return [first, ...rest].reduce((a, b) => a + b, 0);
}

const [args, namedSum] = createNamedArguments(sum);

console.log(namedSum(args.first(1), args.rest(2, 3, 4))); // 10
```

### Default Values

Default parameter values are respected:

```typescript
function greet(name: string, greeting = "Hello") {
  return `${greeting}, ${name}!`;
}

const [args, namedGreet] = createNamedArguments(greet);

console.log(namedGreet(args.name("World"))); // "Hello, World!"
console.log(namedGreet(args.name("Friend"), args.greeting("Hi"))); // "Hi, Friend!"
```

## Comparison with Alternatives

### vs Object Parameters

Using objects as parameters is a common pattern but has limitations:

```typescript
// Traditional object parameter approach
function createUser({ firstName, lastName, age, email }) {
  return { firstName, lastName, age, email };
}

// Our approach
function createUser(firstName, lastName, age, email) {
  return { firstName, lastName, age, email };
}

const [args, namedCreateUser] = createNamedArguments(createUser);
```

Benefits of our approach:
- Works with any existing function without changing its signature
- Enables partial application and configuration patterns
- No need to destructure objects in the function body
- Better type inference for optional parameters
- More flexible and composable


## API Reference

### `createNamedArguments<A, F>(func)`

Transforms a regular function into one that accepts named arguments, with support for flattened object parameters.

**Type Parameters:**
- `A`: Record type describing the argument structure, including flattened object properties
- `F`: Type of the original function

**Parameters:**
- `func`: The function to transform

**Returns:**
- A tuple containing:
  - Named argument accessors (with properties matching the type `A`)
  - A branded function that accepts named arguments

**Example:**
```typescript
const [args, namedGreet] = createNamedArguments
  { name: string, age: number },  // Argument structure
  typeof greet                     // Original function type
>(greet);
```

### `createConfigurableFunction<A, F>([args, brandedFunc])`

Creates a configurable function that can be pre-configured with specific arguments.

**Type Parameters:**
- `A`: Record type describing the argument structure
- `F`: Type of the original function

**Parameters:**
- A tuple containing named argument accessors and a branded function (from `createNamedArguments`)

**Returns:**
- A function that takes a generic type parameter specifying which arguments will be configured, along with a setup function, and returns a configured version of the original function

**Example:**
```typescript
const configurableGreet = createConfigurableFunction([args, namedGreet]);

// Specify which arguments to configure via the generic type parameter
const greetJohn = configurableGreet<'name'>(args => {
  args.name('John');
});

// Now call with just the remaining arguments
greetJohn(args.age(30));  // "Hello, John! You are 30 years old."
```

### `isBrandedArg(value)`

Type guard to check if a value is a branded argument.

**Parameters:**
- `value`: The value to check

**Returns:**
- Boolean indicating whether the value is a branded argument

### `isBrandedFunction<F>(value)`

Type guard to check if a value is a branded function.

**Parameters:**
- `value`: The value to check

**Returns:**
- Boolean indicating whether the value is a branded function

## Types

### `NamedArg<T>`

A function that creates a branded argument with a specific type.

**Type Parameters:**
- `T`: The type of the argument value

**Returns:**
- A branded argument containing the provided value

### `NamedArgs<T>`

A record of named argument accessors.

**Type Parameters:**
- `T`: Record of argument types

### `BrandedFunction<F>`

A function that accepts branded arguments and returns either the result or a partially applied function.

**Type Parameters:**
- `F`: Original function type

## License

MIT