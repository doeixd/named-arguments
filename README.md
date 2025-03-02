# 🏷️ Named Arguments 
A TypeScript library that brings named arguments and robust, type-safe partial application to JavaScript/TypeScript functions.
The library features enhanced type safety with compile-time checking against parameter duplication and precise return type inference based on parameter requirements.

- **Type-Safe Partial Application**: Prevents reapplying the same parameter multiple times
- **Precise Return Types**: TypeScript distinguishes between partial and complete application
- **Parameter Tracking**: Maintains type safety across multiple partial applications
- **Smart Builder Pattern**: Track which parameters have been applied during building
- **Object Parameter Updates**: Safely update previously applied object parameters with reApply
- **Nested Property Access**: Access deeply nested properties with dot notation
- **Composability Utilities**: Transform, group, validate, combine, and pipeline arguments


## 📦 Installation

```bash
npm install @doeixd/named-args
```

## 📑 Table of Contents

- [Installation](#-installation)
- [Core Concepts](#-core-concepts)
  - [Argument Branding](#argument-branding)
  - [Function Transformation](#function-transformation)
  - [Partial Application](#partial-application)
  - [Configurability Pattern](#configurability-pattern)
- [Named Arguments](#-named-arguments)
- [Partial Application](#-partial-application-1)
  - [Precise Return Types](#precise-return-types)
  - [Type-Safe Partial Application](#type-safe-partial-application)
  - [Multi-Stage Partial Application](#multi-stage-partial-application)
  - [Updating Object Parameters with reApply](#updating-object-parameters-with-reapply)
- [Builder Pattern](#-builder-pattern)
- [Nested Property Access](#-nested-property-access)
- [Object Property Arguments](#-object-property-arguments)
- [Composability Utilities](#-composability-utilities)
  - [Argument Transformations](#argument-transformations)
  - [Argument Groups](#argument-groups)
  - [Argument Pipelines](#argument-pipelines)
  - [Combined Arguments](#combined-arguments)
  - [Default Values](#default-values)
  - [Argument Validation](#argument-validation)
- [Advanced Use Cases](#-advanced-use-cases)
  - [Type-Safe Function Composition](#type-safe-function-composition)
  - [Dependency Injection Pattern](#dependency-injection-pattern)
- [Configurable Functions](#-configurable-functions)
- [Advanced Features](#-advanced-features)
  - [Rest Parameters](#rest-parameters)
  - [Default Values](#default-values-1)
- [Why This Matters](#-why-this-matters)
- [Gotchas](#-gotchas)
  - [Type Inference Limitations](#type-inference-limitations)
  - [Function Overloads](#function-overloads)
  - [Performance Considerations](#performance-considerations)
- [Example: Building a Chart API](#example-building-a-chart-api)
- [API Reference](#-api-reference)
  - [Core Library](#core-library)
  - [Composability Utilities](#composability-utilities)
- [License](#-license)

## 🧩 Core Concepts

### Argument Branding

Named arguments are "branded" with metadata that allows the library to track which parameter they represent. This branding is what enables calling functions with arguments in any order.

```typescript
// Under the hood, each named argument is branded with its parameter name
const emailArg = args.email('john@example.com');
// Represents: { [BRAND_SYMBOL]: { name: 'email', value: 'john@example.com' } }

// This allows calling functions with arguments in any order
namedCreateUser(
  args.email('john@example.com'),
  args.firstName('John'),
  // TypeScript knows which parameter each argument represents
);
```

### Function Transformation

The library transforms regular functions into ones that can accept named arguments through a process that:
1. Analyzes the function's parameter structure
2. Creates branded argument accessors for each parameter
3. Returns a new function that can map named arguments back to positional arguments

```typescript
// Original function
function sendEmail(to: string, subject: string, body: string) {
  // Implementation
}

// Transform into a function accepting named arguments
const [args, namedSendEmail] = createNamedArguments(sendEmail);

// Now we can call it with named arguments in any order
namedSendEmail(
  args.subject('Meeting reminder'),
  args.to('colleague@example.com'),
  args.body('Don\'t forget our meeting tomorrow.')
);
```

### Partial Application

Unlike traditional currying which requires parameters in a specific order, this library enables:
- Applying any subset of arguments in any order
- Creating multiple layers of partial application
- Maintaining full type safety throughout the process

```typescript
// Create named arguments for a function
function formatNumber(value: number, locale: string, style: string, currency?: string) {
  return new Intl.NumberFormat(locale, { style, currency }).format(value);
}

const [args, namedFormat] = createNamedArguments(formatNumber);

// Create a partial application - note any subset of args can be applied
const formatUSD = namedFormat.partial(
  args.style('currency'),
  args.currency('USD')
);

// Create another layer of specialization
const formatUSPrice = formatUSD.partial(args.locale('en-US'));

// Finally apply the remaining argument
console.log(formatUSPrice(args.value(42.99)));  // "$42.99"
```

### Configurability Pattern

The configurability pattern extends partial application by separating:
- What is being configured (which parameters)
- How they're being configured (the values)
- When they're being applied (the execution)

This creates a powerful API design pattern that promotes reusability and composition.

```typescript
// Create a configurable function
const configureFetch = createConfigurableFunction([args, namedFetch]);

// Define a configuration for JSON API requests
const jsonRequest = configureFetch(args => {
  args.headers({
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  });
});

// Use the configured function with remaining parameters
const response = await jsonRequest(
  args.url('https://api.example.com/users'),
  args.method('GET')
);
```

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
  typeof createUser,
  {firstName: string, lastName: string, age: number, email: string}
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
The library provides the `reApply` method, which allows you to safely update previously applied object parameters without reapplying the entire parameter:
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
const authClient = baseClient.reApply(args.options, (prev) => ({
  ...prev,
  headers: {
    ...prev.headers,
    authorization: 'Bearer token123'
  }
}));
// Add retry logic to the same options object
const retryClient = authClient.reApply(args.options, (prev) => ({
  ...prev,
  retries: {
    count: 3,
    delay: 1000
  },
  cache: false
}));
// Update logging options separately
const debugClient = retryClient.reApply(args.logOptions, (prev) => ({
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

## 🔍 Nested Property Access

The library now provides a specialized primitive for working with deeply nested object properties:

```typescript
import { createNamedArguments, createNestedArgs } from '@doeixd/named-args';

// Function with a complex nested configuration object
function setupApplication(config: {
  server: {
    port: number;
    host: string;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
  database: {
    url: string;
    credentials: {
      username: string;
      password: string;
    };
  };
}) {
  // Implementation
}

// Create named arguments
const [args, namedSetup] = createNamedArguments(setupApplication);

// Create nested arguments for the config parameter
type ConfigType = Parameters<typeof setupApplication>[0];
const config = createNestedArgs<ConfigType>('config');

// Use the nested arguments with convenient dot notation
const app = namedSetup(
  config.server.port(8080),
  config.server.ssl.enabled(true),
  config.database.credentials.username('admin')
);
```

This approach provides several benefits:
- Full TypeScript type safety at any nesting depth
- Intuitive dot notation for accessing nested properties
- Seamless integration with partial application
- No need to manually construct property paths

## 🧩 Object Property Arguments

This provides a simpler alternative to `createNestedArgs` when you only need to access top-level properties of an object parameter:

```typescript
import { createNamedArguments, createObjectPropertyArgs } from '@doeixd/named-args';

// Function with an options object parameter
function configureServer(options: {
  port: number;
  host: string;
  ssl: boolean;
  maxConnections: number;
}) {
  // Implementation
}

// Create named arguments for the function
const [args, namedConfig] = createNamedArguments(configureServer);

// Create property-level named args for the options object
type OptionsType = Parameters<typeof configureServer>[0];
const optionArgs = createObjectPropertyArgs<OptionsType>('options');

// Use the property-level named args
const server = namedConfig(
  optionArgs.port(8080),
  optionArgs.host('localhost'),
  optionArgs.ssl(true),
  optionArgs.maxConnections(100)
);
```

Benefits compared to `createNestedArgs`:
- Simpler implementation with less overhead
- Focused on the common case of accessing top-level properties
- Provides the same type safety for first-level properties
- Works seamlessly with partial application and other library features# Named Arguments

## 🧩 Composability Utilities

The library now includes utilities for transforming and combining arguments in powerful ways:

### Argument Transformations

```typescript
import { transformArg } from '@doeixd/named-args/composability';

// Create a transformer that converts string dates to Date objects
const timestampArg = transformArg(args.timestamp, (isoString: string) => new Date(isoString));

// Now we can pass strings instead of Date objects
const result = namedProcess(
  timestampArg('2023-01-15T12:30:00Z'),
  args.value(42)
);
```

### Argument Groups

```typescript
import { createArgGroup } from '@doeixd/named-args/composability';

// Create an argument group for connection parameters
const connectionGroup = createArgGroup({
  host: args.host,
  port: args.port,
  credentials: createArgGroup({
    username: args.credentials.username,
    password: args.credentials.password
  })
});

// Apply all connection settings with one object
const db = namedConnect(
  ...connectionGroup({
    host: 'localhost',
    port: 5432,
    credentials: {
      username: 'admin',
      password: 'secret123'
    }
  })
);
```

### Argument Pipelines

```typescript
import { pipeline } from '@doeixd/named-args/composability';

// Create a pipeline for processing amounts
const amountPipeline = pipeline(args.amount)
  .map((value: string) => parseFloat(value))
  .map(value => Math.abs(value))
  .map(value => Math.round(value * 100) / 100);

// Process a value through the pipeline
const transaction = namedProcess(
  amountPipeline("42.567"),  // Converts to 42.57
  args.timestamp(new Date()),
  args.description("Office supplies")
);
```

### Combined Arguments

```typescript
import { combineArgs } from '@doeixd/named-args/composability';

// Calculate area automatically from width and height
const autoArea = combineArgs(
  args.area,
  ([width, height]) => width * height,
  args.width,
  args.height
);

// Apply the combined argument
const rectangle = namedCalculate(
  args.width(5),
  args.height(10),
  ...autoArea()  // Automatically sets area = 50
);
```

### Default Values

```typescript
import { withDefault } from '@doeixd/named-args/composability';

// Create a default value for the greeting
const defaultGreeting = withDefault(args.greeting, "Hi");

// Use it when you want the default value
const result = namedGreet(
  args.name("World"),
  ...defaultGreeting()  // Uses "Hi" as the default
);
```

### Argument Validation

```typescript
import { withValidation } from '@doeixd/named-args/composability';

// Create validated arguments
const validatedAmount = withValidation(
  args.amount,
  (value) => value > 0 && value <= 10000,
  "Amount must be between 0 and 10,000"
);

// Will throw an error if validation fails
const transfer = namedTransfer(
  validatedAmount(500),
  args.accountId("ACC1234567890")
);
```

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
  typeof processArray,
  {array: T[], filterFn: (item: T) => boolean, sortFn?: (a: T, b: T) => number, limit?: number}
>(processArray);

// Create a configurable function
const configureArrayProcessor = createConfigurableFunction([args, namedProcess]);

// Configure a processor for top N positive numbers
const topPositiveNumbers = configureArrayProcessor(args => {
  // Filter for positive numbers
  args.filterFn(num => num > 0);
  
  // Sort in descending order
  args.sortFn((a, b) => b - a);
});

// The resulting function accepts the remaining parameters
const numbers = [-5, 10, 3, -2, 8, 1, -1, 6];
const top3Positive = topPositiveNumbers(args.array(numbers), args.limit(3));

console.log(top3Positive); // [10, 8, 6]
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

## 💡 Why This Matters

These patterns provide several key benefits:

1. **Composability**: Functions can be specialized incrementally
2. **Reusability**: Partially applied functions create reusable building blocks
3. **Separation of Concerns**: Configure different aspects of a function independently
4. **Type Safety**: Maintain full TypeScript type checking at every stage
5. **Readability**: Self-documenting code that clearly shows which arguments are being used
6. **Flexibility**: Work with complex nested structures in an intuitive way
7. **Transformability**: Process and validate arguments with pipelines and transformers

This library takes the functional programming concept of partial application and makes it more practical and flexible for real-world TypeScript applications, enabling elegant API designs that would be cumbersome with traditional approaches.

## ⚠️ Gotchas

### Type Inference Limitations

When creating named arguments, explicitly providing type parameters improves inference:

```typescript
// May have incomplete inference without type parameters
const [args, namedFn] = createNamedArguments(myFunction);

// Better to be explicit for complex functions
const [args, namedFn] = createNamedArguments<
  typeof myFunction,
  {param1: string, param2: number}
>(myFunction);
```

### Function Overloads

The library may struggle with complex function overloads. Specify a single overload signature when creating named arguments:

```typescript
// For overloaded functions, specify which overload to use
const [args, namedFetch] = createNamedArguments<
  (url: string, options?: RequestInit) => Promise<Response>,
  {url: string, options?: RequestInit}
>(fetch);
```

### Performance Considerations

Named arguments add a small overhead compared to direct function calls:

- Each argument is wrapped in a branded object
- The function performs argument matching at runtime
- Consider using direct calls in performance-critical paths

## Example: Building a Chart API

### Before:
```typescript
// Traditional approach with a charting library
function createTimeSeriesChart(element, data, options = {}) {
  // Merge user options with defaults
  const config = {
    type: 'line',
    xAxis: { key: 'timestamp', label: 'Time' },
    animation: { enabled: true, duration: 800 },
    tooltip: { enabled: true },
    ...options
  };
  
  return createChart(element, config);
}

// Complex, nested, error-prone configuration
const tempChart = createTimeSeriesChart(
  document.getElementById('chart'),
  temperatureData,
  {
    yAxis: { key: 'value', label: 'Temperature (°F)', min: 0 },
    // Oops, typo in property name won't be caught at compile time
    animaton: { duration: 500 } 
  }
);
```

### After:
```typescript
import { createNamedArguments, createConfigurableFunction } from '@doeixd/named-args';

// Define chart rendering with named parameters
function renderChart(
  element: HTMLElement,
  data: Array<Record<string, any>>,
  type: 'bar' | 'line' | 'pie',
  xAxis?: { key: string; label?: string },
  yAxis?: { key: string; label?: string; min?: number },
  animation?: { enabled?: boolean; duration?: number },
  tooltip?: { enabled?: boolean }
) {
  // Implementation
}

// Create named arguments
const [args, namedRenderChart] = createNamedArguments(renderChart);

// Create specialized chart builders
const configureChart = createConfigurableFunction([args, namedRenderChart]);

const createTimeSeriesChart = configureChart(args => {
  args.type('line');
  args.xAxis({ key: 'timestamp', label: 'Time' });
  args.animation({ enabled: true, duration: 800 });
  args.tooltip({ enabled: true });
});

// Type-safe usage with autocomplete and error checking
const tempChart = createTimeSeriesChart(
  args.element(document.getElementById('chart')),
  args.data(temperatureData),
  args.yAxis({
    key: 'value',
    label: 'Temperature (°F)',
    min: 0
  })
  // Typo would be caught by TypeScript:
  // args.animaton({ duration: 500 }) ❌ Error!
);
```

This pattern makes your chart configuration:
- **Type-safe**: Errors caught at compile time
- **Discoverable**: IDE autocomplete shows available options
- **Reusable**: Create specialized chart builders with sensible defaults
- **Clear**: Arguments are explicitly named and can be applied in any order


## 📚 API Reference

### Core Library

#### `createNamedArguments<F, A>(func, parameters?)`

Transforms a regular function into one that accepts named arguments.

**Type Parameters:**
- `F`: Type of the original function
- `A`: Record type describing the argument structure

**Parameters:**
- `func`: The function to transform
- `parameters?`: Optional parameter metadata

**Returns:**
- A tuple containing:
  - Named argument accessors (with properties matching the type `A`)
  - A branded function that accepts named arguments

#### `createNestedArgs<T>(basePath)`

Creates named arguments for deeply nested object properties with full type safety.

**Type Parameters:**
- `T`: The type of the object whose nested properties will be accessed

**Parameters:**
- `basePath`: The base path for all properties (usually the parameter name)

**Returns:**
- A proxy object that provides type-safe access to all nested properties

#### `createObjectPropertyArgs<T>(paramName)`

Creates named arguments for individual properties of an object parameter.

**Type Parameters:**
- `T`: The object type whose properties will be accessed

**Parameters:**
- `paramName`: The name of the parameter in the function

**Returns:**
- An object with named arguments for each property of the object parameter

#### `createConfigurableFunction<A, F>([args, brandedFunc])`

Creates a configurable function that can be pre-configured with specific arguments.

**Parameters:**
- A tuple containing named argument accessors and a branded function (from `createNamedArguments`)

**Returns:**
- A function that takes a setup function and returns a configured version of the original function

#### `createBuilder<F>(brandedFunc)`

Creates a builder for constructing function calls with type-safe parameter tracking.

**Parameters:**
- `brandedFunc`: A branded function created with `createNamedArguments`

**Returns:**
- A builder instance with methods for adding arguments and executing the function

### Composability Utilities

#### `transformArg<T, U>(argCreator, transformer)`

Creates a transformer for named arguments that applies a transformation function to values.

**Parameters:**
- `argCreator`: The original argument creator function
- `transformer`: Function that transforms the input value to the required type

**Returns:**
- A new argument creator that accepts `U` and applies the transformation

#### `createArgGroup<T>(config)`

Creates a group of related named arguments that can be applied together.

**Parameters:**
- `config`: Configuration mapping of property names to argument creators

**Returns:**
- Function that generates branded arguments from values

#### `combineArgs<T>(targetArg, combiner, ...sourceArgs)`

Creates a combined argument that merges multiple named arguments into one.

**Parameters:**
- `targetArg`: The argument to receive the combined value
- `combiner`: Function that combines the source values
- `sourceArgs`: The source arguments to combine

**Returns:**
- Function that applies the sources and returns the combined argument

#### `withDefault<T>(argCreator, defaultValue)`

Provides a default value for an optional argument.

**Parameters:**
- `argCreator`: The argument creator function
- `defaultValue`: The default value to use when the argument is not provided

**Returns:**
- Function that creates the argument with the default value

#### `pipeline<T, U>(argCreator)`

Creates a pipeline of transformations for a value before applying it as an argument.

**Parameters:**
- `argCreator`: The argument creator function for the final value

**Returns:**
- A pipeline builder object with methods:
  - `map<V>(fn)`: Adds a transformation to the pipeline
  - `filter(predicate, fallback)`: Adds a filter to the pipeline
  - `apply(value)`: Applies the pipeline to a value

#### `withValidation<T>(argCreator, validator, errorMessage?)`

Creates a wrapper function that provides validation for arguments.

**Parameters:**
- `argCreator`: The argument creator function
- `validator`: Function that validates the value
- `errorMessage?`: Optional error message for validation failures

**Returns:**
- A new argument creator with validation

## 📝 License

MIT