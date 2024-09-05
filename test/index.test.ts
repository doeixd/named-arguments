import { describe, it, expect } from 'vitest';
import {
  createNamedArguments,
  createConfigurableFunction,
  parseFunctionArguments,
  splitArguments,
  parseArgument,
  safeEval,
  isBrandedFunction
} from '../src/index';
type Simplify<T> = {[KeyType in keyof T]: T[KeyType]} & {};
describe('createNamedArguments', () => {
  it('should create named arguments for a simple function', () => {
    function greet(name: string, age: number) {
      return `Hello, ${name}! You are ${age} years old.`;
    }

    const [args, namedGreet] = createNamedArguments(greet);

    const result = namedGreet((args as Simplify<typeof args>).name('Alice'), args.age(30));
    expect(result).toBe('Hello, Alice! You are 30 years old.');
  });

  it('should allow arguments in any order', () => {
    function greet(name: string, age: number) {
      return `Hello, ${name}! You are ${age} years old.`;
    }

    const [args, namedGreet] = createNamedArguments(greet);

    const result = namedGreet(args.age(25), args.name('Bob'));
    expect(result).toBe('Hello, Bob! You are 25 years old.');
  });

  it('should work with optional parameters', () => {
    function greet(name: string, age?: number) {
      return age ? `Hello, ${name}! You are ${age} years old.` : `Hello, ${name}!`;
    }

    const [args, namedGreet] = createNamedArguments(greet);

    expect(namedGreet(args.name('Charlie'))).toBe('Hello, Charlie!');
    expect(namedGreet(args.name('David'), args.age(40))).toBe('Hello, David! You are 40 years old.');
  });

  it('should handle rest parameters', () => {
    function sum(first: number, ...rest: number[]) {
      return [first, ...rest].reduce((a, b) => a + b, 0);
    }

    const [args, namedSum] = createNamedArguments(sum);

    expect(namedSum(args.first(1), args.rest(2, 3, 4))).toBe(10);
  });
});


describe('createConfigurableFunction', () => {
  it('should create a configurable function', () => {
    function divide(a: number, b: number) {
      return a / b;
    }

    const [args, namedDivide] = createNamedArguments(divide);
    const configurableDivide = createConfigurableFunction([args, namedDivide]);

    const divideByTwo = configurableDivide(args => {
      args.b(2);
    });

    expect(divideByTwo(10)).toBe(5);
    expect(divideByTwo(20)).toBe(10);
  });

  it('should allow multiple configurations', () => {
    function greet(name: string, greeting: string) {
      return `${greeting}, ${name}!`;
    }

    const [args, namedGreet] = createNamedArguments(greet);
    const configurableGreet = createConfigurableFunction([args, namedGreet]);

    const greetInFrench = configurableGreet(args => {
      args.greeting('Bonjour');
    });

    const greetAlice = configurableGreet(args => {
      args.name('Alice');
    });

    expect(greetInFrench('John')).toBe('Bonjour, John!');
    expect(greetAlice('Hello')).toBe('Hello, Alice!');
  });
});

describe('parseFunctionArguments', () => {
  it('should parse simple function arguments', () => {
    const funcString = 'function (a, b, c) {}';
    const result = parseFunctionArguments(funcString);
    expect(result).toEqual([
      { name: 'a', order: 0, isRest: false },
      { name: 'b', order: 1, isRest: false },
      { name: 'c', order: 2, isRest: false }
    ]);
  });

  it('should parse function with default and rest parameters', () => {
    const funcString = 'function (a, b = 5, ...rest) {}';
    const result = parseFunctionArguments(funcString);
    expect(result).toEqual([
      { name: 'a', order: 0, isRest: false },
      { name: 'b', order: 1, defaultValue: 5, isRest: false },
      { name: 'rest', order: 2, isRest: true }
    ]);
  });
});

describe('splitArguments', () => {
  it('should split simple arguments', () => {
    const argsString = 'a, b, c';
    const result = splitArguments(argsString);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should handle nested parentheses', () => {
    const argsString = 'a, func(b, c), d';
    const result = splitArguments(argsString);
    expect(result).toEqual(['a', 'func(b, c)', 'd']);
  });
});

describe('parseArgument', () => {
  it('should parse a simple argument', () => {
    const result = parseArgument('name', 0);
    expect(result).toEqual({ name: 'name', order: 0, isRest: false });
  });

  it('should parse an argument with default value', () => {
    const result = parseArgument('age = 30', 1);
    expect(result).toEqual({ name: 'age', order: 1, defaultValue: 30, isRest: false });
  });

  it('should parse a rest argument', () => {
    const result = parseArgument('...rest', 2);
    expect(result).toEqual({ name: 'rest', order: 2, isRest: true });
  });
});

describe('safeEval', () => {
  it('should evaluate simple expressions', () => {
    expect(safeEval('2 + 2')).toBe(4);
    expect(safeEval('"hello" + " world"')).toBe('hello world');
  });

  it('should handle object and array literals', () => {
    expect(safeEval('{ a: 1, b: 2 }')).toEqual({ a: 1, b: 2 });
    expect(safeEval('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('should return the string if evaluation fails', () => {
    const unsafeExpression = 'console.log("This should not execute")';
    expect(safeEval(unsafeExpression)).toBe(unsafeExpression);
  });
});

describe('isBrandedFunction', () => {
  it('should return true for branded functions', () => {
    const [args, namedFunc] = createNamedArguments((a: number) => a);
    expect(isBrandedFunction(namedFunc)).toBe(true);
  });

  it('should return false for regular functions', () => {
    const regularFunc = (a: number) => a;
    expect(isBrandedFunction(regularFunc)).toBe(false);
  });

  it('should return false for non-function values', () => {
    expect(isBrandedFunction(42)).toBe(false);
    expect(isBrandedFunction('string')).toBe(false);
    expect(isBrandedFunction({})).toBe(false);
  });
});