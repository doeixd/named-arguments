import { describe, it, expect, vi } from 'vitest';
import {
  createNamedArguments,
  createConfigurableFunction,
  parseFunctionArguments,
  splitArguments,
  parseArgument,
  safeEval,
  isBrandedArg,
  isBrandedFunction
} from '../src/index';

// Helper type for test clarity
type Simplify<T> = {[KeyType in keyof T]: T[KeyType]} & {};

describe('Core Functionality', () => {
  describe('createNamedArguments', () => {
    it('should create named arguments for a simple function', () => {
      function greet(name: string, age: number) {
        return `Hello, ${name}! You are ${age} years old.`;
      }

      const [args, namedGreet] = createNamedArguments<{name: string, age: number}, typeof greet>(greet);
      const result = namedGreet(args.name('Alice'), args.age(30));
      
      expect(result).toBe('Hello, Alice! You are 30 years old.');
    });

    it('should allow arguments in any order', () => {
      function greet(name: string, age: number) {
        return `Hello, ${name}! You are ${age} years old.`;
      }

      const [args, namedGreet] = createNamedArguments<{name: string, age: number}, typeof greet>(greet);
      const result = namedGreet(args.age(25), args.name('Bob'));
      
      expect(result).toBe('Hello, Bob! You are 25 years old.');
    });

    it('should work with optional parameters', () => {
      function greet(name: string, age?: number) {
        return age !== undefined
          ? `Hello, ${name}! You are ${age} years old.`
          : `Hello, ${name}!`;
      }

      const [args, namedGreet] = createNamedArguments<{name: string, age?: number}, typeof greet>(greet);
      
      expect(namedGreet(args.name('Charlie'))).toBe('Hello, Charlie!');
      expect(namedGreet(args.name('David'), args.age(40))).toBe('Hello, David! You are 40 years old.');
    });

    it('should handle rest parameters', () => {
      function sum(first: number, ...rest: number[]) {
        return [first, ...rest].reduce((a, b) => a + b, 0);
      }

      const [args, namedSum] = createNamedArguments<{first: number, rest: number[]}, typeof sum>(sum);
      
      expect(namedSum(args.first(1), args.rest(2, 3, 4))).toBe(10);
      expect(namedSum(args.rest(2, 3, 4), args.first(1))).toBe(10);
    });

    it('should throw an error for missing required arguments', () => {
      function divide(a: number, b: number) {
        return a / b;
      }

      const [args, namedDivide] = createNamedArguments<{a: number, b: number}, typeof divide>(divide);
      
      expect(() => namedDivide(args.a(10))).not.toThrow(); // This returns a partial function
      expect(() => {
        const partial = namedDivide(args.a(10));
        if (typeof partial === 'function') {
          return partial();
        }
      }).toThrow(/Missing required argument/);
    });

    it('should handle functions that throw exceptions', () => {
      function riskyFunction(shouldThrow: boolean) {
        if (shouldThrow) {
          throw new Error('Intentional error');
        }
        return 'Success';
      }

      const [args, namedRisky] = createNamedArguments<{shouldThrow: boolean}, typeof riskyFunction>(riskyFunction);
      
      expect(namedRisky(args.shouldThrow(false))).toBe('Success');
      expect(() => namedRisky(args.shouldThrow(true))).toThrow('Intentional error');
    });
  });

  describe('Partial Application', () => {
    it('should support partial application of arguments', () => {
      function add(a: number, b: number, c: number) {
        return a + b + c;
      }

      const [args, namedAdd] = createNamedArguments<{a: number, b: number, c: number}, typeof add>(add);
      
      const withA = namedAdd(args.a(1));
      expect(typeof withA).toBe('function');
      
      const withAB = withA(args.b(2));
      expect(typeof withAB).toBe('function');
      
      const result = withAB(args.c(3));
      expect(result).toBe(6);
    });

    it('should allow reordering in partial application', () => {
      function formatPerson(firstName: string, lastName: string, age: number) {
        return `${firstName} ${lastName} (${age})`;
      }

      const [args, namedFormat] = createNamedArguments<
        {firstName: string, lastName: string, age: number},
        typeof formatPerson
      >(formatPerson);
      
      const withAge = namedFormat(args.age(30));
      const withAgeLast = withAge(args.lastName('Smith'));
      const result = withAgeLast(args.firstName('John'));
      
      expect(result).toBe('John Smith (30)');
    });
  });

  describe('createConfigurableFunction', () => {
    it('should create a configurable function', () => {
      function divide(a: number, b: number) {
        return a / b;
      }

      const [args, namedDivide] = createNamedArguments<{a: number, b: number}, typeof divide>(divide);
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

      const [args, namedGreet] = createNamedArguments<{name: string, greeting: string}, typeof greet>(greet);
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

    it('should provide configurable functions with proper typing through explicit arg mapping', () => {
      function multiply(a: number, b: number, c: number) {
        return a * b * c;
      }

      // Create named arguments with explicit parameter names that match the function
      const [args, namedMultiply] = createNamedArguments<{a: number, b: number, c: number}, typeof multiply>(multiply);
      
      // createConfigurableFunction uses the named arguments record
      const configurableMultiply = createConfigurableFunction([args, namedMultiply]);

      // Specify configured args here using a generic parameter
      const doubleMultiply = configurableMultiply<'a'>(args => {
        args.a(2);
      });

      // TypeScript knows this is a function, but won't know exact parameter names
      // since they can't be extracted from the function type
      expect(typeof doubleMultiply).toBe('function');
      expect(doubleMultiply(3, 4)).toBe(24); // 2 * 3 * 4
      
      // We can use named arguments which are always type-safe
      expect(doubleMultiply(args.b(3), args.c(4))).toBe(24);
      
      // Let's create another variant configuring multiple parameters
      const multiplyByTwoAndThree = configurableMultiply<'a' | 'b'>(args => {
        args.a(2);
        args.b(3);
      });
      
      // Still works correctly at runtime
      expect(multiplyByTwoAndThree(4)).toBe(24); // 2 * 3 * 4
    });
    });
  });

  describe('parseArgument', () => {
    it('should parse a simple argument', () => {
      const result = parseArgument('name', 0);
      expect(result).toEqual({ 
        name: 'name', 
        order: 0, 
        isRest: false,
        required: true,
        type: 'any' 
      });
    });

    it('should parse an argument with default value', () => {
      const result = parseArgument('age = 30', 1);
      expect(result).toEqual({ 
        name: 'age', 
        order: 1, 
        defaultValue: 30, 
        isRest: false,
        required: false,
        type: 'any' 
      });
    });

    it('should parse a rest argument', () => {
      const result = parseArgument('...rest', 2);
      expect(result).toEqual({ 
        name: 'rest', 
        order: 2, 
        isRest: true,
        required: false,
        type: 'any' 
      });
    });

    it('should handle basic object destructuring', () => {
      const result = parseArgument('{name, age}', 0);
      expect(result.name).toBe('name, age');
    });

    it('should parse type annotations', () => {
      const result = parseArgument('count: number', 0);
      expect(result).toEqual({
        name: 'count',
        order: 0,
        isRest: false,
        required: true,
        type: 'number'
      });
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

    it('should prevent access to global objects', () => {
      // Mock console.warn to prevent test output noise
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(safeEval('window.alert("hack")')).toBe('window.alert("hack")');
      expect(safeEval('document.cookie')).toBe('document.cookie');
      warnSpy.mockRestore();
    });
  });

describe('Type Guards', () => {
  describe('isBrandedArg', () => {
    it('should identify branded arguments', () => {
      function testFunc(name: string) { return name; }
      const [args] = createNamedArguments<{name: string}, typeof testFunc>(testFunc);
      
      const brandedArg = args.name('test');
      expect(isBrandedArg(brandedArg)).toBe(true);
    });
    
    it('should reject non-branded values', () => {
      expect(isBrandedArg(null)).toBe(false);
      expect(isBrandedArg(undefined)).toBe(false);
      expect(isBrandedArg(42)).toBe(false);
      expect(isBrandedArg("string")).toBe(false);
      expect(isBrandedArg({})).toBe(false);
      expect(isBrandedArg({ some: 'object' })).toBe(false);
    });
  });
  
  describe('isBrandedFunction', () => {
    it('should identify branded functions', () => {
      function testFunc(name: string) { return name; }
      const [, namedFunc] = createNamedArguments<{name: string}, typeof testFunc>(testFunc);
      
      expect(isBrandedFunction(namedFunc)).toBe(true);
    });
    
    it('should reject regular functions', () => {
      const regularFunc = (a: number) => a;
      expect(isBrandedFunction(regularFunc)).toBe(false);
    });
    
    it('should reject non-function values', () => {
      expect(isBrandedFunction(42)).toBe(false);
      expect(isBrandedFunction('string')).toBe(false);
      expect(isBrandedFunction({})).toBe(false);
    });
  });
});

describe('Edge Cases and Performance', () => {
  it('should handle complex nested object destructuring patterns', () => {
    // This is a function with complex destructuring
    function processUser({ user: { name, profile: { age } } }: { user: { name: string, profile: { age: number } } }) {
      return `${name} is ${age} years old`;
    }
    
    const [args, namedProcess] = createNamedArguments<any, typeof processUser>(processUser);
    
    // The library will just treat the param as a single object with a complex name
    const result = namedProcess(args['user']({ user: { name: 'Alice', profile: { age: 30 } } }));
    expect(result).toBe('Alice is 30 years old');
  });
  
  it('should handle functions with a large number of parameters efficiently', () => {
    // Create a function with 20 parameters
    const manyParamsFunc = new Function(
      ...[...Array(20)].map((_, i) => `p${i}`),
      'return [' + [...Array(20)].map((_, i) => `p${i}`).join(',') + '];'
    );
    
    const start = performance.now();
    const [args, namedFunc] = createNamedArguments<any, any>(manyParamsFunc);
    const end = performance.now();
    
    // Creating named arguments should be reasonably fast
    expect(end - start).toBeLessThan(100); // Should take less than 100ms
    
    // Check that we can call it with parameters in any order
    const result = namedFunc(
      args.p5(5),
      args.p0(0),
      args.p10(10),
      args.p1(1)
    );
    // @ts-expect-error 
    expect(result[0]).toBe(0);
    // @ts-expect-error 
    expect(result[1]).toBe(1);
    // @ts-expect-error 
    expect(result[5]).toBe(5);
    // @ts-expect-error 
    expect(result[10]).toBe(10);
  });
});

describe('Parsing Functions', () => {
  describe('parseFunctionArguments', () => {
    it('should parse simple function arguments', () => {
      const funcString = 'function (a, b, c) {}';
      const result = parseFunctionArguments(funcString);
      expect(result).toEqual([
        { name: 'a', order: 0, isRest: false, required: true, type: 'any' },
        { name: 'b', order: 1, isRest: false, required: true, type: 'any' },
        { name: 'c', order: 2, isRest: false, required: true, type: 'any' }
      ]);
    });

    it('should parse function with default and rest parameters', () => {
      const funcString = 'function (a, b = 5, ...rest) {}';
      const result = parseFunctionArguments(funcString);
      expect(result).toEqual([
        { name: 'a', order: 0, isRest: false, required: true, type: 'any' },
        { name: 'b', order: 1, defaultValue: 5, isRest: false, required: false, type: 'any' },
        { name: 'rest', order: 2, isRest: true, required: false, type: 'any' }
      ]);
    });

    it('should parse arrow function arguments', () => {
      const funcString = '(a, b) => { return a + b; }';
      const result = parseFunctionArguments(funcString);
      expect(result).toEqual([
        { name: 'a', order: 0, isRest: false, required: true, type: 'any' },
        { name: 'b', order: 1, isRest: false, required: true, type: 'any' }
      ]);
    });

    it('should handle type annotations', () => {
      const funcString = 'function (name: string, age: number = 30) {}';
      const result = parseFunctionArguments(funcString);
      expect(result).toEqual([
        { name: 'name', order: 0, isRest: false, required: true, type: 'string' },
        { name: 'age', order: 1, defaultValue: 30, isRest: false, required: false, type: 'number' }
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

    it('should handle string literals with commas', () => {
      const argsString = 'name, "hello, world", age';
      const result = splitArguments(argsString);
      expect(result).toEqual(['name', '"hello, world"', 'age']);
    });
    
    it('should handle complex nested structures', () => {
      const argsString = 'a, {b: "c,d", e: [1,2,3]}, ...f';
      const result = splitArguments(argsString);
      expect(result).toEqual(['a', '{b: "c,d", e: [1,2,3]}', '...f']);
    });
  })
})