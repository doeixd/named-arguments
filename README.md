# Named Arguments for TypeScript

This library provides a type-safe way to implement named arguments in TypeScript, allowing for more flexible and readable function calls.

## Features

- Create functions with named arguments
- Type-safe argument passing
- Support for default values and rest parameters
- Partial application of arguments
- Configurable functions for advanced use cases

## Installation

```bash
npm install named-arguments-ts
```

## Usage

### Basic Example

```typescript
import { createNamedArguments } from 'named-arguments-ts';

function greet(name: string, age: number, city: string = "Unknown") {
  return `Hello, ${name}! You are ${age} years old and live in ${city}.`;
}

const [args, namedGreet] = createNamedArguments(greet);

const result = namedGreet(
  args.name("Alice"),
  args.age(30),
  args.city("New York")
);

console.log(result);
// Output: Hello, Alice! You are 30 years old and live in New York.
```

### Partial Application

```typescript
const partialGreet = namedGreet(args.name("Bob"));
const result = partialGreet(args.age(25));
console.log(result);
// Output: Hello, Bob! You are 25 years old and live in Unknown.
```

### Configurable Functions

```typescript
import { createNamedArguments, createConfigurableFunction } from 'named-arguments-ts';

function multiply(a: number, b: number) {
  return a * b;
}

const [args, namedMultiply] = createNamedArguments(multiply);
const configurableMultiply = createConfigurableFunction([args, namedMultiply]);

const multiplyByTwo = configurableMultiply(setup => {
  setup.a(2);
});

console.log(multiplyByTwo(args.b(5))); // Output: 10
```

## API Reference

### `createNamedArguments<F>(func: F): [ArgTypes<F>, BrandedFunction<F>]`

Creates named arguments for a given function.

### `createConfigurableFunction<F>([argTypes, namedFunc]: [ArgTypes<F>, BrandedFunction<F>]): (setupFn: (args: ArgTypes<F>) => void) => F`

Creates a configurable function based on named arguments.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.