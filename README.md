# 🏷️ Named Arguments 2.0

A TypeScript library that brings named arguments and robust, type-safe partial application to JavaScript/TypeScript functions.

The library now features enhanced type safety with compile-time checking against parameter duplication and precise return type inference based on parameter requirements.
A TypeScript library that brings named arguments and elegant partial application to JavaScript/TypeScript functions.

- **Type-Safe Partial Application**: Prevents reapplying the same parameter multiple times
- **Precise Return Types**: TypeScript distinguishes between partial and complete application
- **Parameter Tracking**: Maintains type safety across multiple partial applications
- **Smart Builder Pattern**: Track which parameters have been applied during building
- **Object Parameter Updates**: Safely update previously applied object parameters with reApply
## ✨ Features

- **Named Arguments**: Call functions with arguments in any order, making your code more readable and less error-prone
- **Partial Application**: Easily create functions with some arguments pre-applied
- **Configurable Functions**: Define reusable function configurations
- **Type Safety**: Full TypeScript support with type inference

## 📦 Installation

```bash
npm install @doeixd/named-args
```

## 🧩 Core Concepts

### Argument Branding

Named arguments are "branded" with metadata that allows the library to track which parameter they represent. This branding is what enables calling functions with arguments in any order.

```typescript
// Under the hood, each named argument is branded with its parameter name
const emailArg = args.email('john@example.com');
// Represents: { __brand: 'email', value: 'john@example.com' }
```

### Function Transformation

The library transforms regular functions into ones that can accept named arguments through a process that:
1. Analyzes the function's parameter structure
2. Creates branded argument accessors for each parameter
3. Returns a new function that can map named arguments back to positional arguments

### Partial Application

Unlike traditional currying which requires parameters in a specific order, this library enables:
- Applying any subset of arguments in any order
- Creating multiple layers of partial application
- Maintaining full type safety throughout the process

### Configurability Pattern

The configurability pattern extends partial application by separating:
- What is being configured (which parameters)
- How they're being configured (the values)
- When they're being applied (the execution)

This creates a powerful API design pattern that promotes reusability and composition.

## 🔄 Named Arguments

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

## 🧪 Partial Application

### Precise Return Types

The library provides precise return type inference based on parameter requirements:

```typescript
function greet(name: string, greeting?: string): string {
  return `${greeting || "Hello"}, ${name}!`;
}

const [args, namedGreet] = createNamedArguments<
  typeof greet,
  { name: string; greeting?: string }
>(
  greet,
  [
    { name: "name", required: true },
    { name: "greeting", required: false }
  ]
);

// TypeScript knows this returns a string (not a function)
// because all required parameters are provided
const greeting = namedGreet(args.name("World")); // Type: string

// TypeScript knows this returns a partially applied function
// because no required parameters are provided yet
const partialGreet = namedGreet.partial(); // Type: BrandedFunction<...>
```

This makes it easier to work with partially applied functions, as you no longer need to manually check whether the result is a value or a function.

### Type-Safe Partial Application

The library provides enhanced type-safety for partial application:

```typescript
import { createNamedArguments } from "@doeixd/named-args";

function add(a: number, b: number, c: number): number {
  return a + b + c;
}

// Create named arguments with type information
const [args, namedAdd] = createNamedArguments<
  typeof add,
  { a: number; b: number; c: number }
>(add);

// Create a partial application with "a"
const addWithA = namedAdd.partial(args.a(5));

// TypeScript prevents you from applying "a" again
// This would cause a compile-time error:
// const error = addWithA(args.a(10)); // Error: Parameter "a" already applied

// You can apply other parameters
const addWithAB = addWithA.partial(args.b(10));

// Complete the application
const result = addWithAB(args.c(15)); // 30
```

Unlike other partial application libraries, this one maintains full type-safety during each step, making it impossible to accidentally provide the same parameter multiple times.


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

### Updating Object Parameters with reApply

The library now provides the `reApply` method, which allows you to safely update previously applied object parameters without reapplying the entire parameter:

```typescript
// Start with a base client configuration
const baseClient = namedRequest.partial(
  args.method('POST'),
  args.options({
    headers: {
      contentType: 'application/json',
      accept: 'application/json'
    }
  }),
  args.logOptions({
    level: 'info',
    format: 'json'
  })
);

// Add authentication by updating only the headers property
const authClient = baseClient.reApply('options', (prev) => ({
  ...prev,
  headers: {
    ...prev.headers,
    authorization: 'Bearer token123'
  }
}));

// Add retry logic to the same options object
const retryClient = authClient.reApply('options', (prev) => ({
  ...prev,
  retries: {
    count: 3,
    delay: 1000
  },
  cache: false
}));

// Update logging options separately
const debugClient = retryClient.reApply('logOptions', (prev) => ({
  ...prev,
  level: 'debug',
  destination: 'console'
}));

// Make the final request with all accumulated options
const result = debugClient(args.url('https://api.example.com/data'));
```

The `reApply` method:
1. Takes the name of a previously applied parameter
2. Accepts an updater function that receives the current value and returns a new value
3. Maintains type safety, only allowing updates to parameters that have been applied
4. Returns a new branded function with the updated parameter value

## 🏗️ Builder Pattern

The library provides a builder pattern that maintains type-safety:

```typescript
import { createNamedArguments, createBuilder } from "@doeixd/named-args";

function configureApp(port: number, host: string, database: DbConfig, logging?: boolean) {
  // Create app configuration
  return { port, host, database, logging };
}

const [args, namedConfig] = createNamedArguments(configureApp);

// Create a builder
const appBuilder = createBuilder(namedConfig);

// Use the builder pattern to construct the configuration
// The builder tracks which parameters have been applied and prevents duplicates
const devConfig = appBuilder
  .with(args.port(3000))
  .with(args.host("localhost"))
  .with(args.database({ url: "localhost:27017", name: "devdb" }))
  .execute();

// Attempting to set the same parameter twice would
// result in both compile-time errors and runtime warnings
```

The builder pattern is particularly useful for creating complex objects with many parameters, while maintaining full type-safety.

## 🛠️ Advanced Use Cases
### Type-Safe Function Composition

The enhanced type system enables safer function composition patterns:

```typescript
// Create a pipeline of transformations with type-safe partial application
const processData = pipe(
  fetchData.partial(args.endpoint("/api/users")),
  filterData.partial(args.predicate(user => user.active)),
  sortData.partial(args.key("lastName")),
  paginateData.partial(args.pageSize(10))
);

// Each step maintains type safety and prevents parameter duplication
const results = processData(args.page(2));
```

### Dependency Injection Pattern

Create flexible service configurations with partial application:

```typescript
// Define a service that requires multiple dependencies
function createUserService(db: Database, logger: Logger, cache: Cache) {
  return {
    findUser: (id: string) => { /* ... */ },
    createUser: (data: UserData) => { /* ... */ }
  };
}

const [args, namedService] = createNamedArguments(createUserService);

// Create partially configured services for different environments
const testService = namedService.partial(
  args.db(testDb),
  args.logger(mockLogger)
);

const prodService = namedService.partial(
  args.db(prodDb),
  args.logger(prodLogger)
);

// Later, complete the configuration
const localTestService = testService(args.cache(localCache));
const remoteTestService = testService(args.cache(redisCache));
```

### Middleware Pattern

Create type-safe middleware chains:

```typescript
// Define middleware and handler functions
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

// Create named versions
const [args, applyMiddleware] = createNamedArguments<
  { handler: RequestHandler, auth?: boolean, logging?: boolean, cache?: boolean },
  typeof createMiddleware
>(createMiddleware);

// Create different middleware stacks with type checking
const publicEndpoint = applyMiddleware(
  args.handler(getPublicData),
  args.logging(true),
  args.cache(true)
);

const privateEndpoint = applyMiddleware(
  args.handler(getPrivateData),
  args.auth(true),
  args.logging(true)
);

// TypeScript prevents you from applying the same middleware twice
```


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

## 💡 Why This Matters

These patterns provide several key benefits:

1. **Composability**: Functions can be specialized incrementally
2. **Reusability**: Partially applied functions create reusable building blocks
3. **Separation of Concerns**: Configure different aspects of a function independently
4. **Type Safety**: Maintain full TypeScript type checking at every stage
5. **Readability**: Self-documenting code that clearly shows which arguments are being used

This library takes the functional programming concept of partial application and makes it more practical and flexible for real-world TypeScript applications, enabling elegant API designs that would be cumbersome with traditional approaches.


## ⚙️ Configurable Functions

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

## 🚀 Advanced Features

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

## ⚠️ Gotchas

### Type Inference Limitations

When creating named arguments, explicitly providing type parameters improves inference:

```typescript
// May have incomplete inference without type parameters
const [args, namedFn] = createNamedArguments(myFunction);

// Better to be explicit for complex functions
const [args, namedFn] = createNamedArguments<
  {param1: string, param2: number},
  typeof myFunction
>(myFunction);
```

### Handling Object Parameters

When working with functions that take object parameters, flatten the structure in your type definition:

```typescript
// Function with object parameter
function processOptions({ delay, retries }: { delay: number, retries: number }) {
  // ...
}

// Flatten the structure in type definition
const [args, namedProcess] = createNamedArguments<
  {delay: number, retries: number},
  typeof processOptions
>(processOptions);

// Now you can use them directly
namedProcess(args.delay(1000), args.retries(3));
```

### Function Overloads

The library may struggle with complex function overloads. Specify a single overload signature when creating named arguments:

```typescript
// For overloaded functions, specify which overload to use
const [args, namedFetch] = createNamedArguments<
  {url: string, options?: RequestInit},
  (url: string, options?: RequestInit) => Promise<Response>
>(fetch);
```

### Performance Considerations

Named arguments add a small overhead compared to direct function calls:

- Each argument is wrapped in a branded object
- The function performs argument matching at runtime
- Consider using direct calls in performance-critical paths

## 🔄 Comparison with Alternatives

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



### `reApply<T extends object>(name, updater)`

Updates a previously applied object parameter with a new value derived from the previous value.

**Type Parameters:**
- `T`: Type of the object parameter to update

**Parameters:**
- `name`: The name of a previously applied parameter
- `updater`: A function that takes the previous value and returns an updated value

**Returns:**
- A new branded function with the updated parameter

**Example:**
```typescript
// Update options in a previously configured function
const updatedFunc = configuredFunc.reApply('options', (prev) => ({
  ...prev,
  timeout: 5000,
  retries: 3
}));
```

This method provides a type-safe way to modify complex object parameters without having to respecify all properties, making incremental customization of partially applied functions more maintainable.
## 📚 API Reference
### `createBuilder<F>(brandedFunc)`

Creates a builder for constructing function calls with type-safe parameter tracking.

**Type Parameters:**
- `F`: Type of the original function

**Parameters:**
- `brandedFunc`: A branded function created with `createNamedArguments`

**Returns:**
- A builder instance with methods for adding arguments and executing the function

**Example:**
```typescript
const builder = createBuilder(namedFunction);
const result = builder
  .with(args.param1("value1"))
  .with(args.param2("value2"))
  .execute();
```


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
### Type Utilities for Partial Application

The library provides several type utilities to support type-safe partial application:

- `ExtractArgName<T>`: Extracts the parameter name from a branded argument
- `ExtractBaseParamName<N>`: Extracts the base parameter name from a potentially nested property
- `IsNameApplied<Name, AppliedParams>`: Checks if a parameter name has already been applied
- `FilterBrandedArgs<Args, AppliedParams>`: Filters out already applied arguments from a list
- `AreAllRequiredParamsProvided<ParamInfo, AppliedParams>`: Checks if all required parameters are provided
- `PartialApplicationReturnType<F, ParamInfo, CurrentParams, NewParams>`: Determines the return type based on parameter completeness

These utilities work together to provide compile-time checking against parameter duplication and precise return type inference.


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

### `BrandedFunction<F, AppliedParams>`

A function that accepts branded arguments and returns either the result or a partially applied function.

**Type Parameters:**
- `F`: Original function type
- `AppliedParams`: String literal type tracking which parameters have been applied

**Methods:**
- `partial<Args>(...args)`: Creates a partially applied function with the given arguments
- `remainingArgs()`: Returns an array of required parameter names that haven't been applied yet
- `reApply<T>(name, updater)`: Updates a previously applied object parameter with a new value

## 📝 License

MIT