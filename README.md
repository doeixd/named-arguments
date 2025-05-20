# 🏷️ Named Arguments

[![NPM Version][npm-image]][npm-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

This library brings **type-safe named arguments and flexible partial application** to your functions, improving code readability, maintainability, and developer experience.

## ✨ Why Use This Library?

-   **Clarity & Readability:** Call functions with arguments by name (`args.userId(...)`) instead of relying on order. Code becomes self-documenting.
-   **Type Safety:** Catch errors at compile time for missing required arguments, incorrect types, or accidentally reapplying the same argument during partial application.
-   **Refactor with Confidence:** Changing the order of parameters in your original function doesn't break existing calls using named arguments.
-   **Flexible Partial Application:** Apply arguments in any order, incrementally building specialized functions without the constraints of traditional currying.
-   **Simplified Configuration:** Handle functions with many parameters (especially optional ones) more elegantly than large option objects.
-   **Enhanced Composability:** Utilities for building, configuring, and mapping arguments enable powerful patterns.

## 📦 Installation

```bash
npm install @doeixd/named-args
# or
yarn add @doeixd/named-args
# or
pnpm add @doeixd/named-args
# or
bun install @doeixd/named-args
```

## 🚀 Quick Example
```ts
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


## 📑 Table of Contents

-   [Installation](#-installation)
-   [Quick Example](#-quick-example)
-   [Core Concepts](#-core-concepts)
    -   [Argument Branding](#argument-branding)
    -   [Function Transformation](#function-transformation)
-   [Core Usage (`createNamedArguments`)](#core-usage-createnamedarguments)
    -   [Partial Application](#-partial-application)
    -   [Updating Object Parameters (`reApply`)](#updating-object-parameters-reapply)
-   [Handling Nested Objects](#handling-nested-objects)
    -   [First-Level Access (Built-in)](#first-level-access-built-in)
    -   [Deep Access (`createNestedArgs`)](#deep-access-createnestedargs)
    -   [Property-Level Access (`createObjectPropertyArgs`)](#property-level-access-createobjectpropertyargs)
-   [Advanced Patterns](#advanced-patterns)
    -   [Builder Pattern (`createBuilder`)](#-builder-pattern)
    -   [Configurable Functions (`createConfigurableFunction`)](#-configurable-functions)
    -   [Mapped Arguments (`createMappedNamedArguments`)](#mapped-arguments-createmappednamedarguments)
-   [Advanced Features](#-advanced-features)
    -   [Rest Parameters](#rest-parameters)
    -   [Default Values](#default-values)
    -   [Parameter Metadata](#parameter-metadata)
-   [Use Cases & Examples](#use-cases--examples)
-   [Comparison with Options Objects](#comparison-with-options-objects)
-   [Gotchas & Troubleshooting](#gotchas--troubleshooting)
-   [API Reference](#-api-reference)
-   [Compatibility](#compatibility)
-   [Contributing](#contributing)
-   [License](#-license)

## 🧩 Core Concepts

### Argument Branding

Each argument created via the `args` object (e.g., `args.name('Alice')`) is internally "branded" using a `Symbol`. This brand associates the provided value (`'Alice'`) with the intended parameter name (`'name'`). This allows the wrapped function to correctly place arguments regardless of their call order.

### Function Transformation

`createNamedArguments` takes your original function `F` and returns:
1.  `args`: An object with typed methods (`NamedArg` or `CallableObject`) for creating branded arguments (e.g., `args.name: (v: string) => BrandedArg<string, 'name'>`). The structure of `args` mirrors the type `A` you provide.
2.  `func`: A `BrandedFunction<F>` wrapper around your original function. This wrapper accepts the branded arguments, reconstructs the correct positional argument list based on brands and parameter info, and then calls your original function `F`. It also provides methods like `.partial` and `.reApply`.

## Core Usage (`createNamedArguments`)

This is the primary way to enable named arguments for your functions.

```typescript
import { createNamedArguments } from '@doeixd/named-args';

function format(value: number, prefix = '$', precision = 2): string {
    return `${prefix}${value.toFixed(precision)}`;
}
// Define the argument structure type
type FormatArgs = { value: number; prefix?: string; precision?: number };

// Create args and the named function wrapper
const [args, namedFormat] = createNamedArguments<typeof format, FormatArgs>(
  format,
  // Optional but recommended: ParameterInfo for accurate required/optional/default handling
  [
    { name: 'value', required: true },
    { name: 'prefix', required: false, defaultValue: '$' },
    { name: 'precision', required: false, defaultValue: 2 }
  ]
);

// Call the wrapper function with branded arguments
const formatted = namedFormat(args.value(123.456), args.precision(1)); // "$123.5"
const defaultFormatted = namedFormat(args.value(99)); // "$99.00" (uses defaults)
```

### 🧪 Partial Application

The `BrandedFunction` returned by `createNamedArguments` supports type-safe partial application.

#### Precise Return Types

Based on whether all *required* parameters (as defined by `ParameterInfo`) have been supplied, TypeScript correctly infers if the call returns the final function result or another `BrandedFunction` waiting for more arguments.

```typescript
// Returns string: 'value' is required and provided.
const result1: string = namedFormat(args.value(10));

// Returns function: Required 'value' is missing.
const partial1: BrandedFunction<typeof format, ['prefix']> = namedFormat.partial(
    args.prefix('USD ')
);

// Complete later
const result2: string = partial1(args.value(50)); // "USD 50.00"
```

#### Type-Safe Application

The type system prevents applying the same **base parameter** multiple times across separate `.partial()` calls or direct partial calls.

```typescript
function add(a: number, b: number, c: number): number { return a + b + c; }
type AddArgs = { a: number; b: number; c: number };
const [args, namedAdd] = createNamedArguments<typeof add, AddArgs>(add);

const addWithA = namedAdd.partial(args.a(5));

// Compile-time Errors below! Parameter "a" was already applied.
// const error1 = addWithA(args.a(10));
// const error2 = addWithA.partial(args.a(10));

const addWithAB = addWithA.partial(args.b(10)); // OK
const result = addWithAB(args.c(15)); // OK -> 30
```
*(See [Partial Application with Objects](#partial-application-with-objects) in Gotchas for limitations when partially applying properties of the same object parameter.)*

#### Multi-Stage Partial Application

Build specialized functions incrementally:

```typescript
// Assume makeRequest function and RequestArgs type exist
const [reqArgs, namedRequest] = createNamedArguments<typeof makeRequest, RequestArgs>(makeRequest);

// Stage 1: Base API config
const apiRequest = namedRequest.partial(reqArgs.headers({ /* ... */ }));
// Stage 2: Method-specific
const getRequest = apiRequest.partial(reqArgs.method('GET'));
// Stage 3: Domain-specific
const userApiGet = getRequest.partial(reqArgs.url('...'), reqArgs.timeout(5000));
// Stage 4: Final call
const userData = userApiGet(reqArgs.query({ active: true })); // Execute
```

### Updating Object Parameters (`reApply`)

Safely update parts of an *already applied* object parameter without re-specifying the whole object, using an updater function.

```typescript
// Assume setup function and SetupArgs type exist
const [args, namedConfigure] = createNamedArguments<typeof setup, SetupArgs>(setup);

const baseConfig = namedConfigure.partial(
  args.port(80),
  args.options({ poolSize: 10, retry: { attempts: 3, delay: 100 } })
);

// Use reApply to update options based on the previous value
const updatedConfig = baseConfig.reApply(
  args.options, // Specify which parameter's arg creator to use
  (prevOpts) => ({ // Updater function receives previous value
    ...prevOpts,
    retry: { ...prevOpts.retry, attempts: 5 } // Return the updated object
  })
);

updatedConfig(args.host('server.com')).execute(); // Uses options with attempts: 5
```

## Handling Nested Objects

The library provides ways to work with object parameters containing nested properties.

### First-Level Access (Built-in)

By default, `createNamedArguments` generates `CallableObject` accessors for object parameters. These allow both setting the entire object *and* accessing its first-level properties directly.

```typescript
function setOptions(opts: { timeout: number; retries?: number }) { /* ... */ }
type OptionArgs = { opts: { timeout: number; retries?: number } };

const [args, namedSetOptions] = createNamedArguments<typeof setOptions, OptionArgs>(setOptions);

// Set the whole object:
namedSetOptions(args.opts({ timeout: 5000, retries: 3 }));

// Set first-level properties individually (brands as "opts.timeout", "opts.retries"):
namedSetOptions(args.opts.timeout(3000), args.opts.retries(1));
```

### Deep Access (`createNestedArgs`)

For accessing properties nested deeper than the first level with type safety, use the `createNestedArgs` utility.

```typescript
import { createNamedArguments, createNestedArgs } from '@doeixd/named-args';

function setupApp(config: { server: { port: number; ssl: { enabled: boolean } } }) { /* ... */ }
type SetupAppArgs = { config: { server: { port: number; ssl: { enabled: boolean } } } };
type ConfigType = SetupAppArgs['config']; // Get the specific type

const [args, namedSetup] = createNamedArguments<typeof setupApp, SetupAppArgs>(setupApp);

// Create nested args proxy for the 'config' parameter
const configArgs = createNestedArgs<ConfigType>('config');

// Use intuitive dot notation
namedSetup(
  configArgs.server.port(8080),          // Brands as "config.server.port"
  configArgs.server.ssl.enabled(true)  // Brands as "config.server.ssl.enabled"
);
```

### Property-Level Access (`createObjectPropertyArgs`)

If you only need individual top-level property accessors without the ability to set the whole object via the same accessor, `createObjectPropertyArgs` is a simpler utility.

```typescript
import { createNamedArguments, createObjectPropertyArgs } from '@doeixd/named-args';

function configureServer(options: { port: number; host: string; }) { /* ... */ }
type ServerOptsArgs = { options: { port: number; host: string; } };
type OptionsType = ServerOptsArgs['options'];

const [args, namedConfig] = createNamedArguments<typeof configureServer, ServerOptsArgs>(configureServer);

// Create individual property accessors for 'options'
const optionArgs = createObjectPropertyArgs<OptionsType>('options');

// Use them (cannot call optionArgs(...) itself)
namedConfig(
  optionArgs.port(9000),   // Brands as "options.port"
  optionArgs.host('local') // Brands as "options.host"
);
```

## Advanced Patterns

### 🏗️ Builder Pattern (`createBuilder`)

Provides a fluent interface (`.with(...).execute()`) for accumulating arguments before execution, with type safety preventing duplicate parameter application within the builder chain.

```typescript
import { createNamedArguments, createBuilder } from "@doeixd/named-args";

function configureApp(port: number, host: string, db: DbConfig, logging?: boolean) { /* ... */ }
type AppArgs = { port: number; host: string; db: DbConfig; logging?: boolean };
interface DbConfig { url: string; name: string };

const [args, namedConfig] = createNamedArguments<typeof configureApp, AppArgs>(configureApp);

const appBuilder = createBuilder(namedConfig);

const devConfig = appBuilder
  .with(args.port(3000))
  .with(args.host("localhost"))
  .with(args.db({ url: "localhost:27017", name: "devdb" }))
  // .with(args.port(3100)) // Compile-time error!
  .execute();

console.log(devConfig);
```

### ⚙️ Configurable Functions (`createConfigurableFunction`)

Creates higher-order functions for pre-configuring named argument functions. Useful for dependency injection or creating specialized function variants.

```typescript
import { createNamedArguments, createConfigurableFunction } from '@doeixd/named-args';

function processArray<T>(arr: T[], filterFn: (i: T) => boolean, sortFn?: (a: T, b: T) => number) { /* ... */ }
type ProcessArgs<TItem> = { arr: TItem[]; filterFn: (i: TItem) => boolean; sortFn?: (a: TItem, b: TItem) => number };

const [args, namedProcess] = createNamedArguments<typeof processArray, ProcessArgs<number>>(processArray);

const configureProcessor = createConfigurableFunction([args, namedProcess]);

// Define a configuration for positive numbers, descending
const topPositiveProcessor = configureProcessor(cfgArgs => {
  cfgArgs.filterFn(num => num > 0);
  cfgArgs.sortFn((a, b) => b - a);
});

// Use the configured processor with the remaining 'arr' argument
const numbers = [-5, 10, 3, -2, 8, 1];
const result = topPositiveProcessor(args.arr(numbers)); // [10, 8, 3, 1]
```

### Mapped Arguments (`createMappedNamedArguments`)

*(Located in `@doeixd/named-args/mapped`)*

This advanced utility creates a custom `args` interface based on an explicit mapping you define. It allows renaming arguments and mapping directly to nested properties. Crucially, its returned wrapper function (`MappedBrandedFunction`) provides **partial application based on the mapped keys**, differing from the core library's base-parameter tracking.

**Use Cases:**
-   Creating a public API for a function with different argument names than the internal implementation.
-   Enabling incremental partial application of properties targeting the same underlying object parameter (e.g., `.partial(args.hostName(...))` followed by `.partial(args.portNumber(...))`).

**Requires:**
-   Explicitly providing the base argument structure type `A`.
-   Defining the mapping configuration object using `as const`.

```typescript
import { createMappedNamedArguments } from '@doeixd/named-args/mapped'; // Adjust import

function complexTarget(id: string, config: { host: string; port: number; user?: { email: string } }) { /* ... */ }
type ComplexTargetArgs = { id: string; config: { host: string; port: number; user?: { email: string } } };

// Define the explicit mapping using 'as const'
const argMapSpec = {
  serverId: 'id',                 // Rename 'id' -> 'serverId'
  hostname: 'config.host',        // Map 'hostname' -> 'config.host'
  portNumber: 'config.port',      // Map 'portNumber' -> 'config.port'
  notifyEmail: 'config.user.email' // Map 'notifyEmail' -> 'config.user.email'
} as const; // <-- Use 'as const'

// Create mapped args and the custom function wrapper
const [args, mappedFunc] = createMappedNamedArguments<
  typeof complexTarget, // F
  ComplexTargetArgs,    // A (still required)
  typeof argMapSpec     // Spec (inferred from const object)
>(argMapSpec, complexTarget);

// Partial application based on mapped keys works incrementally
const partial1 = mappedFunc.partial(args.hostname('server.com'));
const partial2 = partial1.partial(args.portNumber(443)); // OK: portNumber and hostname are distinct mapped keys
// const partial3 = partial2.partial(args.hostname('new.com')); // COMPILE ERROR: hostname already applied

const result = partial2(args.serverId('srv-1'), args.notifyEmail('a@b.c')).execute();
```


## 🚀 Advanced Features

### Rest Parameters

Rest parameters (`...name: type[]`) are supported via the corresponding `args` accessor.

```typescript
function sum(label: string, ...numbers: number[]) { /* ... */ }
type SumArgs = { label: string; numbers: number[] };
const [args, namedSum] = createNamedArguments<typeof sum, SumArgs>(sum);

// Pass individual values or an array
namedSum(args.label('Nums:'), args.numbers(1, 5, 9));
namedSum(args.label('Nums:'), args.numbers([1, 5, 9]));
```

### Default Values

JavaScript/TypeScript default parameter values (`param = defaultValue`) are respected by the runtime if an argument isn't provided via `args`.

```typescript
function greet(name: string, greeting = "Hello") { /* ... */ }
type GreetArgs = { name: string; greeting?: string };
const [args, namedGreet] = createNamedArguments<typeof greet, GreetArgs>(greet);

namedGreet(args.name("Galaxy")); // Output uses "Hello"
```

### Parameter Metadata

Provide an explicit `ParameterInfo[]` array to `createNamedArguments` or `createMappedNamedArguments` for precise control over `required` status and `defaultValue` handling, improving type safety and runtime checks. Inference via `toString()` is less reliable.

```typescript
const [args, func] = createNamedArguments(myFunc, [
  { name: 'id', required: true },
  { name: 'timeout', required: false, defaultValue: 5000 }
]);
```

## Use Cases & Examples



-   **Type-Safe Function Composition:** Chain partially applied functions safely.
-   **Dependency Injection:** Pre-configure services with dependencies.
-   **Example: Building a Chart API:** Make complex configurations type-safe and readable.

```typescript
// Chart API Example (Simplified)
import { createNamedArguments } from '@doeixd/named-args';

// Define types (replace with actual library types)
type ChartElement = HTMLElement; type ChartData = any[];
interface AxisOptions { /* ... */ } interface ChartOptions { /* ... */ }
function renderChart(element: ChartElement, data: ChartData[], options: ChartOptions) { /* ... */ }
type ChartArgs = { element: ChartElement; data: ChartData[]; options: ChartOptions };

const [args, namedRenderChart] = createNamedArguments<typeof renderChart, ChartArgs>(renderChart);

// Type-safe call using named args
const myChart = namedRenderChart(
  args.element(document.getElementById('chart')!),
  args.data(myData),
  args.options({ type: 'line', xAxis: { /*...*/ } })
);
// Use first-level accessor
const myChart2 = namedRenderChart(
  args.element(document.getElementById('chart2')!),
  args.data(myData),
  args.options.type('bar') // Set type directly
);
```

## Comparison with Options Objects

| Feature               | Named Arguments (`createNamedArguments`) | Options Object Pattern (`fn(opts)`)       |
| :-------------------- | :--------------------------------------- | :---------------------------------------- |
| **Readability**       | High (Self-documenting calls)            | Medium (Depends on option names)          |
| **Parameter Order**   | Independent                              | Single object, internal order matters     |
| **Type Safety**       | High (Compile-time checks for args/types) | Medium (Relies on options type definition) |
| **Optional Args**     | Clearly handled                          | Managed within the options object type    |
| **Refactoring**       | Safer (Order doesn't matter)             | Safer (Internal changes less impact)      |
| **Partial Application** | Built-in, Type-Safe                     | Manual implementation required            |
| **Discoverability**   | High (IDE Autocomplete on `args`)        | Medium (Depends on options type export)   |
| **Runtime Overhead**  | Small                                    | Minimal                                   |
| **Boilerplate**       | Some (Type `A`, `create...` call)        | Some (Interface/Type for options)         |

Named arguments excel when functions have multiple parameters (especially optional ones) or when partial application and composability are desired. Options objects are simpler for functions with a single configuration bundle.

## 💡 Why This Matters

-   Reduces errors caused by incorrect argument order or type mismatches.
-   Improves code clarity and makes function calls easier to understand.
-   Enhances refactoring safety.
-   Enables powerful functional patterns like partial application and composition in a type-safe manner.

## ⚠️ Gotchas & Troubleshooting

-   **Type Inference Limitations:** Always prefer providing explicit `<F, A>` generics to `createNamedArguments` and `<F, A, Spec>` to `createMappedNamedArguments` for best results. Relying on inference can sometimes lead to less precise types, especially with complex functions. Define the `A` type explicitly.
-   **Function Overloads:** The library works best with single-signature functions. For overloaded functions, pass the *specific overload signature* you want to wrap as the `F` generic type parameter.
-   **Performance Considerations:** There's a small runtime overhead per argument and per function call compared to direct positional arguments. This is usually negligible but avoid in performance hotspots if necessary.
-   **Partial Application with Objects (Core Library):** Remember the core `BrandedFunction` tracks applied arguments by *base parameter name*. Partially applying `args.config.host(...)` prevents applying `args.config.port(...)` in a *subsequent* partial call to the *same resulting function*.
    -   **Workarounds:** Apply related properties in one `.partial()` call, use `reApply`, use the full object setter `args.config({...})` (which typically overwrites), or use `createMappedNamedArguments` for different semantics.
-   **`as const` for Mapped/Flattening Configs:** When using `createMappedNamedArguments` or optional flattening utilities, always define the configuration object with `as const` and **do not** add an explicit interface type annotation to the variable itself (e.g., `const config = { ... } as const;` not `const config: MyConfigInterface = { ... } as const;`). This preserves required literal types.
-   **`Cannot find name 'Spec'` / `Type 'X' is not assignable...`:** If you encounter complex type errors, double-check:
    -   Correct `import` paths.
    -   Correct use of `as const` for config objects.
    -   Accurate `A` type provided.
    -   Restarting your TypeScript server / IDE.
    -   You are using a compatible TypeScript version.

## Compatibility

-   Requires **TypeScript 4.1+** (for Template Literal Types used internally). Higher versions (4.5+) are recommended for better inference with complex types.
-   Works with standard JavaScript runtimes (Node, browsers) after TypeScript compilation.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request on the [GitHub repository][github-url].

Okay, here's a detailed API reference including the function signature and a usage example for each key exported function.

---

## 📚 API Reference

This reference details the primary functions, interfaces, and types exported by the `@doeixd/named-args` library and its associated modules.

---

### **Core Library (`@doeixd/named-args`)**

These are the fundamental exports for creating and using named arguments.

---

#### `createNamedArguments<F, A>(func, parameters?)`

Transforms a standard function into one accepting named arguments via a generated `args` object and returns a specialized wrapper function (`BrandedFunction`).

*   **Signature:**
    ```typescript
    function createNamedArguments<
      F extends (...args: any[]) => any,
      A extends Record<string, any> = ParamsToObject<Parameters<F>> // Provide A explicitly!
    >(
      func: F,
      parameters?: Readonly<ParameterInfo[]>
    ): [NamedArgs<A>, BrandedFunction<F>]
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments } from '@doeixd/named-args';

    function processUser(id: string, name: string, active: boolean = true) {
      return { id, name, active };
    }
    type ProcessUserArgs = { id: string; name: string; active?: boolean };

    const [args, namedProcessUser] = createNamedArguments<
      typeof processUser,
      ProcessUserArgs
    >(
      processUser,
      // Optional metadata for better type safety
      [ { name: 'id', required: true }, { name: 'name', required: true }, { name: 'active', required: false, defaultValue: true }]
    );

    const result = namedProcessUser(args.name('Alice'), args.id('u1'));
    console.log(result); // { id: 'u1', name: 'Alice', active: true }

    const partial = namedProcessUser.partial(args.id('u2'));
    const result2 = partial(args.name('Bob'), args.active(false));
    console.log(result2); // { id: 'u2', name: 'Bob', active: false }
    ```

---

#### `createBuilder<F>(brandedFunc)`

Creates a `Builder` instance for fluently constructing calls to a `BrandedFunction`, preventing duplicate argument application within the chain.

*   **Signature:**
    ```typescript
    function createBuilder<F extends (...args: any[]) => any>(
      brandedFunc: BrandedFunction<F>
    ): Builder<F> // Builder has .with(...args) and .execute() methods
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, createBuilder } from '@doeixd/named-args';

    function createItem(sku: string, quantity: number, location: string) { /* ... */ }
    type ItemArgs = { sku: string; quantity: number; location: string };

    const [args, namedCreateItem] = createNamedArguments<typeof createItem, ItemArgs>(createItem);
    const itemBuilder = createBuilder(namedCreateItem);

    const item = itemBuilder
      .with(args.sku('XYZ-123'))
      .with(args.quantity(100))
      .with(args.location('Warehouse A'))
      // .with(args.sku('ABC-456')) // Would log warning at runtime, potentially error if strict
      .execute();

    // item now holds the result of createItem(...)
    ```

---

#### `createConfigurableFunction<A, F>([args, brandedFunc])`

Creates a higher-order function factory used to preset arguments for a `BrandedFunction`, useful for creating specialized variants.

*   **Signature:**
    ```typescript
    function createConfigurableFunction<
      A extends Record<string, any>,
      F extends (...args: any[]) => any
    >(
      [args, brandedFunc]: [NamedArgs<A>, BrandedFunction<F>]
    ): (setupFn: (wrappedArgs: NamedArgs<A>) => void) => (...remainingArgs: BrandedArg[]) => CoreReturnType<F>
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, createConfigurableFunction } from '@doeixd/named-args';

    function sendNotification(to: string, subject: string, body: string, urgent: boolean = false) { /* ... */ }
    type NotifyArgs = { to: string; subject: string; body: string; urgent?: boolean };

    const [args, namedNotify] = createNamedArguments<typeof sendNotification, NotifyArgs>(sendNotification);
    const configureNotifier = createConfigurableFunction([args, namedNotify]);

    // Create a pre-configured function for urgent notifications
    const urgentNotifier = configureNotifier(cfgArgs => {
      cfgArgs.urgent(true);
      cfgArgs.subject("URGENT NOTIFICATION");
    });

    // Use the configured function, providing only remaining args
    urgentNotifier(args.to('admin@example.com'), args.body('Server down!'));
    ```

---

#### `createNestedArgs<T>(basePath)`

Creates a proxy object for type-safe access to deeply nested properties of an object parameter.

*   **Signature:**
    ```typescript
    function createNestedArgs<T extends Record<string, any>>(
      basePath: string
    ): NestedArgs<T>
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, createNestedArgs } from '@doeixd/named-args';

    interface AppConfig { server: { port: number; ssl: { enabled: boolean } }; db: { url: string }; }
    function setupApp(config: AppConfig) { /* ... */ }
    type SetupAppArgs = { config: AppConfig };

    const [args, namedSetup] = createNamedArguments<typeof setupApp, SetupAppArgs>(setupApp);
    const configArgs = createNestedArgs<AppConfig>('config'); // Proxy for 'config' parameter

    namedSetup(
      configArgs.server.port(8080),          // Creates BrandedArg with name: "config.server.port"
      configArgs.server.ssl.enabled(true),  // Creates BrandedArg with name: "config.server.ssl.enabled"
      configArgs.db.url("...")             // Creates BrandedArg with name: "config.db.url"
    );
    ```

---

#### `createObjectPropertyArgs<T>(paramName)`

Creates individual argument accessors for the *first-level* properties of an object parameter.

*   **Signature:**
    ```typescript
    function createObjectPropertyArgs<T extends Record<string, any>>(
      paramName: string
    ): Record<keyof T, NamedArg<any, `${string & typeof paramName}.${string & keyof T}`>> // Simplified return type representation
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, createObjectPropertyArgs } from '@doeixd/named-args';

    interface ServerOptions { port: number; host: string; }
    function configureServer(options: ServerOptions) { /* ... */ }
    type ServerOptsArgs = { options: ServerOptions };

    const [args, namedConfig] = createNamedArguments<typeof configureServer, ServerOptsArgs>(configureServer);
    const optionArgs = createObjectPropertyArgs<ServerOptions>('options');

    namedConfig(
      optionArgs.port(9000),   // Creates BrandedArg with name: "options.port"
      optionArgs.host('local') // Creates BrandedArg with name: "options.host"
    );
    ```

---

#### `isBrandedArg(value)`

Type guard to determine if an unknown value is a `BrandedArg`.

*   **Signature:**
    ```typescript
    function isBrandedArg<T = unknown, N extends string = string>(
      value: unknown
    ): value is BrandedArg<T, N>
    ```
*   **Example:**
    ```typescript
    import { isBrandedArg } from '@doeixd/named-args';
    if (isBrandedArg(someValue)) {
        console.log('Is branded arg:', someValue[BRAND_SYMBOL].name, someValue[BRAND_SYMBOL].value);
    }
    ```

---

#### `isBrandedFunction(value)`

Type guard to determine if an unknown value is a `BrandedFunction`.

*   **Signature:**
    ```typescript
    function isBrandedFunction<F extends (...args: any[]) => any>(
      value: unknown
    ): value is BrandedFunction<F>
    ```
*   **Example:**
    ```typescript
    import { isBrandedFunction } from '@doeixd/named-args';
    if (isBrandedFunction(myFunc)) {
        console.log('Is branded function for:', myFunc._originalFunction.name);
        console.log('Remaining required:', myFunc.remainingArgs());
    }
    ```

---

### **Mapped Arguments Module (`@doeixd/named-args/mapped`)**

Provides an alternative factory for creating named arguments based on an explicit mapping, offering different partial application semantics.

---

#### `createMappedNamedArguments<F, A, Spec>(argMapSpec, func, parameters?)`

Creates a custom `args` object and wrapper function based on an explicit specification map. Allows renaming and mapping to nested paths, with partial application based on the *mapped keys*.

*   **Signature:**
    ```typescript
    function createMappedNamedArguments<
      F extends (...args: any[]) => any,
      A extends Record<string, any>, // MUST provide accurate type A
      Spec extends ArgMapSpecification // Inferred from const object
    >(
      argMapSpec: Spec, // MUST define with 'as const'
      func: F,
      parameters?: Readonly<ParameterInfo[]>
    ): [MappedNamedArgs<A, Spec>, MappedBrandedFunction<F, A, Spec, []>]
    ```
*   **Example:**
    ```typescript
    import { createMappedNamedArguments } from '@doeixd/named-args/mapped';

    function complexTarget(id: string, config: { host: string; port: number }) { /* ... */ }
    type ComplexTargetArgs = { id: string; config: { host: string; port: number } };

    // Define mapping with 'as const'
    const spec = {
      serverId: 'id',
      hostname: 'config.host',
      portNum: 'config.port'
    } as const;

    // Create mapped args and function
    const [args, mappedFunc] = createMappedNamedArguments<
      typeof complexTarget,
      ComplexTargetArgs, // Explicit A
      typeof spec
    >(spec, complexTarget);

    // Call using mapped names
    const partial = mappedFunc.partial(args.hostname('srv1')); // Applied 'hostname' key
    const final = partial(args.portNum(8080), args.serverId('id1')); // OK to apply 'portNum' (targets same base 'config')
    const result = final.execute();

    console.log(result); // { id: 'id1', connection: 'srv1:8080', ... }
    ```

---

### **Composability Utilities Module (`@doeixd/named-args/utils`)**

Provides functions to transform or combine argument creators (`NamedArg` functions).

---

#### `transformArg(argCreator, transformer)`

Applies a transformation to the input value *before* creating the branded argument.

*   **Signature:**
    ```typescript
    function transformArg<T, U, N extends string>(
      argCreator: NamedArg<T, N>, // e.g., args.timestamp expecting Date
      transformer: (value: U) => T // e.g., (v: string) => new Date(v)
    ): NamedArg<U, N> // Returns new arg creator expecting string
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, transformArg } from '@doeixd/named-args';

    function process(ts: Date) {/*...*/}
    type ProcessArgs = { ts: Date };
    const [args, namedProcess] = createNamedArguments<typeof process, ProcessArgs>(process);

    const dateStringArg = transformArg(args.ts, (str: string) => new Date(str));

    namedProcess(dateStringArg("2024-03-14T10:00:00Z")); // Pass string, gets converted
    ```

---

#### `createArgGroup(config)`

Groups related `NamedArg` functions so they can be applied together via a single object.

*   **Signature:**
    ```typescript
    function createArgGroup<T extends Record<string, any>>(
      config: ArgGroupConfig<T> // Object mapping keys to NamedArg or nested groups
    ): (values: Partial<T>) => BrandedArg[] // Function taking values, returning array of BrandedArgs
    ```
    *(See `ArgGroupConfig<T>` type definition for details)*
*   **Example:**
    ```typescript
    import { createNamedArguments, createArgGroup } from '@doeixd/named-args';

    function connect(db: { host: string; port: number; user: string; }) {/*...*/}
    type ConnectArgs = { db: { host: string; port: number; user: string; } };
    const [args, namedConnect] = createNamedArguments<typeof connect, ConnectArgs>(connect);

    const dbGroup = createArgGroup({ // Corresponds to 'db' parameter properties
        host: args.db.host,
        port: args.db.port,
        user: args.db.user,
    });

    namedConnect( ...dbGroup({ host: 'db.local', port: 5432, user: 'app' }) );
    ```

---

#### `pipeline(argCreator)`

Creates a builder object to chain multiple transformation and filter steps for an argument's value.

*   **Signature:**
    ```typescript
    function pipeline<T, U>( // T=initial input, U=final arg type
      argCreator: NamedArg<U, any>
    ): ArgumentPipeline<T, U> // Returns pipeline object with .map, .filter, .apply
    ```
    *(See `ArgumentPipeline<T, U>` interface definition for details)*
*   **Example:**
    ```typescript
    import { createNamedArguments, pipeline } from '@doeixd/named-args';

    function setRate(rate: number) {/*...*/}
    type RateArgs = { rate: number };
    const [args, namedSetRate] = createNamedArguments<typeof setRate, RateArgs>(setRate);

    const ratePipeline = pipeline<string, number>(args.rate) // Input string, output number
      .map(val => parseFloat(val))
      .map(val => Math.max(0, val)) // Ensure non-negative
      .map(val => Math.min(1, val)); // Ensure max 1

    namedSetRate(ratePipeline("-0.5")); // Applies rate = 0
    namedSetRate(ratePipeline("1.2"));  // Applies rate = 1
    namedSetRate(ratePipeline("0.75")); // Applies rate = 0.75
    ```

---

#### `combineArgs(targetArg, combiner, ...sourceArgs)`

Creates a "meta-argument" function that derives the value for `targetArg` by combining values implicitly passed via `sourceArgs`.

*   **Signature:**
    ```typescript
    function combineArgs<T>(
      targetArg: NamedArg<T, any>, // The arg to set
      combiner: (sourceValues: any[]) => T, // Function to combine values
      ...sourceArgs: NamedArg<any, any>[] // Args providing input to combiner
    ): () => BrandedArg<T>[] // Function returning the calculated BrandedArg for target
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, combineArgs } from '@doeixd/named-args';

    function drawRect(w: number, h: number, area: number) {/*...*/}
    type RectArgs = { w: number; h: number; area: number };
    const [args, namedDraw] = createNamedArguments<typeof drawRect, RectArgs>(drawRect);

    const autoArea = combineArgs(
        args.area, // Target
        ([width, height]) => width * height, // Combiner
        args.w, args.h // Sources
    );

    // Call with width and height, area is added automatically by spreading ...autoArea()
    namedDraw(args.w(10), args.h(5), ...autoArea());
    ```

---

#### `withDefault(argCreator, defaultValue)`

Creates a function that, when called with no arguments (`...myDefault()`), produces the `BrandedArg` for `argCreator` using the `defaultValue`.

*   **Signature:**
    ```typescript
    function withDefault<T>(
      argCreator: NamedArg<T, any>,
      defaultValue: T
    ): () => BrandedArg<T>[] // Returns function producing the default BrandedArg in an array
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, withDefault } from '@doeixd/named-args';

    function process(data: string, priority?: number) {/*...*/}
    type ProcessArgs = { data: string; priority?: number };
    const [args, namedProcess] = createNamedArguments<typeof process, ProcessArgs>(process);

    const defaultPriority = withDefault(args.priority, 5); // Default priority is 5

    namedProcess(args.data("A")); // priority is undefined
    namedProcess(args.data("B"), args.priority(10)); // priority is 10
    namedProcess(args.data("C"), ...defaultPriority()); // priority is 5
    ```

---

#### `withValidation(argCreator, validator, errorMessage?)`

Wraps a `NamedArg` creator, adding runtime validation. Throws an error if the `validator` function returns `false` for the provided value.

*   **Signature:**
    ```typescript
    function withValidation<T>(
      argCreator: NamedArg<T, any>,
      validator: (value: T) => boolean,
      errorMessage?: string
    ): NamedArg<T, any> // Returns a new validating NamedArg creator
    ```
*   **Example:**
    ```typescript
    import { createNamedArguments, withValidation } from '@doeixd/named-args';

    function setAge(age: number) {/*...*/}
    type AgeArgs = { age: number };
    const [args, namedSetAge] = createNamedArguments<typeof setAge, AgeArgs>(setAge);

    const validatedAge = withValidation(
      args.age,
      (a) => a >= 0 && a < 130, // Validator
      "Age must be between 0 and 129" // Error message
    );

    namedSetAge(validatedAge(30)); // OK
    // namedSetAge(validatedAge(150)); // Throws Error: "Age must be between 0 and 129"
    ```
---

## 📝 License

MIT

---
[npm-image]: https://img.shields.io/npm/v/@doeixd/named-args.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@doeixd/named-args
[build-image]: https://img.shields.io/github/actions/workflow/status/doeixd/named-args/main.yml?branch=main&style=flat-square
[build-url]: https://github.com/doeixd/named-args/actions?query=workflow%3Amain
[license-image]: https://img.shields.io/npm/l/@doeixd/named-args.svg?style=flat-square
[license-url]: https://github.com/doeixd/named-args/blob/main/LICENSE
[downloads-image]: https://img.shields.io/npm/dm/@doeixd/named-args.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/@doeixd/named-args
[github-url]: https://github.com/doeixd/named-args