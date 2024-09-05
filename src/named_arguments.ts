/**
 * Represents a branded argument with a specific type.
 */
type BrandedArg<T> = {
  [brand: symbol]: T;
};

/**
 * Extracts the parameter types from a function type.
 */
type Parameters<T extends (...args: unknown[]) => unknown> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Represents the structure of argument types for a given function.
 */
type ArgTypes<F extends (...args: unknown[]) => unknown> = {
  [K in keyof Parameters<F>]: (value: Parameters<F>[K]) => BrandedArg<Parameters<F>[K]>;
};

/**
 * Represents a function that accepts branded arguments and returns the same type as the original function.
 */
// type BrandedFunction<F extends (...args: unknown[]) => unknown> = 
//   (...args: BrandedArg<Parameters<F>[number]>[]) => ReturnType<F> | BrandedFunction<F>;

/**
 * Argument information interface
 */
interface ArgumentInfo {
  name: string;
  order: number;
  defaultValue?: unknown;
  isRest: boolean;
}

type NamedArg<T> = (value: T) => BrandedArg<T>;

type NamedArgs <T extends Record<string, any>> = {
  [K in keyof T]: NamedArg<T[K]>
};

type BrandedFunction<T extends (...args: any[]) => any> = 
  (...args: BrandedArg<any>[]) => ReturnType<T> | BrandedFunction<T>;

function createNamedArguments<A extends Record<string, any>, T extends (...args: any[]) => any>(func: T): [NamedArgs<A>, BrandedFunction<T>] {
  const argInfo = parseFunctionArguments(func);
  const requiredArgCount = argInfo.filter(arg => !arg.isRest && arg.defaultValue === undefined).length;
  
  const argTypes = Object.fromEntries(
    argInfo.map(({ name, isRest, type }) => [
      name,
      isRest
        ? (...values: any[]) => ({ [Symbol.for(`${name}Brand`)]: values })
        : (value: typeof type) => ({ [Symbol.for(`${name}Brand`)]: value })
    ])
  ) as NamedArgs<T>;

  const newFunc: BrandedFunction<T> = (...brandedArgs: BrandedArg<any>[]) => {
    const args: any[] = new Array(argInfo.length).fill(undefined);
    const appliedArgs = new Set<number>();
    let restArgs: any[] = [];

    const applyArgs = (brandedArgs: BrandedArg<any>[]) => {
      brandedArgs.forEach(arg => {
        const brandSymbol = Object.getOwnPropertySymbols(arg)[0];
        const argName = Symbol.keyFor(brandSymbol)?.replace('Brand', '');
        if (argName) {
          const argIndex = argInfo.findIndex(info => info.name === argName);
          if (argIndex !== -1) {
            const { isRest } = argInfo[argIndex];
            if (isRest) {
              restArgs = restArgs.concat(arg[brandSymbol]);
            } else if (!appliedArgs.has(argIndex)) {
              args[argIndex] = arg[brandSymbol];
              appliedArgs.add(argIndex);
            }
          }
        }
      });
    };

    const createPartialFunc = (): BrandedFunction<T> => (...moreBrandedArgs: BrandedArg<any>[]) => {
      applyArgs(moreBrandedArgs);
      return newFunc(...args.map((arg, index) => 
        arg !== undefined ? { [Symbol.for(`${argInfo[index].name}Brand`)]: arg } : undefined
      ).filter((arg): arg is BrandedArg<any> => arg !== undefined));
    };

    applyArgs(brandedArgs);

    if (appliedArgs.size < requiredArgCount) {
      return createPartialFunc();
    }

    argInfo.forEach(({ defaultValue, isRest }, index) => {
      if (!isRest && args[index] === undefined && defaultValue !== undefined) {
        args[index] = defaultValue;
      }
    });

    const missingArgs = argInfo.filter((arg, index) => !arg.isRest && args[index] === undefined && arg.defaultValue === undefined);
    if (missingArgs.length > 0) {
      throw new Error(`Missing required argument(s): ${missingArgs.map(arg => arg.name).join(', ')}`);
    }

    return func(...args, ...restArgs);
  };

  return [argTypes, newFunc];
}

/**
 * Parses function arguments from a function string.
 * @param {string} functionString - The function as a string.
 * @returns {ArgumentInfo[]} An array of argument information.
 */
function parseFunctionArguments(functionString: string): ArgumentInfo[] {
  const argRegex = /(?:function\s*\w*|\(\s*|\b)\s*\(([^)]*)\)/;
  const match = functionString.match(argRegex);
  if (!match) throw new Error("Invalid function string");
  const argsString = match[1].trim();
  if (!argsString) return [];
  return splitArguments(argsString).map((arg, index) => parseArgument(arg, index));
}

/**
 * Splits the argument string into individual arguments.
 * @param {string} argsString - The string containing all arguments.
 * @returns {string[]} An array of individual argument strings.
 */
function splitArguments(argsString: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  
  for (const char of argsString) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current) args.push(current.trim());
  return args;
}

/**
 * Parses a single argument string.
 * @param {string} arg - The argument string to parse.
 * @param {number} index - The index of the argument.
 * @returns {ArgumentInfo} The parsed argument information.
 */
function parseArgument(arg: string, index: number): ArgumentInfo {
  const isRest = arg.startsWith('...');
  const name = isRest ? arg.slice(3) : arg.split('=')[0].trim().replace(/^\{|\}$/g, '');
  const defaultValue = !isRest && arg.includes('=') ? safeEval(arg.split('=')[1].trim()) : undefined;
  
  return {
    name,
    order: index,
    defaultValue,
    isRest
  };
}

/**
 * Safely evaluates a string as a JavaScript expression.
 * @param {string} str - The string to evaluate.
 * @returns {any} The result of the evaluation.
 */
function safeEval(str: string): any {
  const allowList = ['Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON'];
  const sandbox = Object.fromEntries(allowList.map(name => [name, (globalThis as any)[name]]));
  const func = new Function(...Object.keys(sandbox), `return (${str});`);
  
  try {
    return func(...Object.values(sandbox));
  } catch (error) {
    console.warn(`Failed to evaluate default value: ${str}`);
    return str;
  }
}

/**
 * Type guard to check if a value is a BrandedFunction
 */
function isBrandedFunction<F extends (...args: any[]) => any>(
  value: ReturnType<F> | BrandedFunction<F>
): value is BrandedFunction<F> {
  return typeof value === 'function';
}

/**
 * Creates a configurable function based on named arguments.
 * @template F
 * @param {[ArgTypes<F>, BrandedFunction<F>]} namedArgsResult - Result of createNamedArguments
 * @returns {(setupFn: (args: ArgTypes<F>) => void) => F} A function that takes a setup function and returns a partially applied version of the original function
 */
function createConfigurableFunction<F extends (...args: any[]) => any>(
  [argTypes, namedFunc]: [ArgTypes<F>, BrandedFunction<F>]
): (setupFn: (args: ArgTypes<F>) => void) => F {
  return function(setupFn: (args: ArgTypes<F>) => void): F {
    const appliedArgs: { prop: keyof ArgTypes<F>; args: any[] }[] = [];
    const recordingArgTypes = new Proxy(argTypes, {
      get(target, prop: string | symbol) {
        return (...args: any[]) => {
          appliedArgs.push({ prop: prop as keyof ArgTypes<F>, args });
          return { [Symbol.for(`${prop.toString()}Brand`)]: args[0] };
        };
      }
    });

    setupFn(recordingArgTypes);

    return function(this: any, ...runtimeArgs: any[]): ReturnType<F> {
      const fullArgs = [...appliedArgs.map(({ prop, args }) => (argTypes as any)[prop](...args)), ...runtimeArgs];
      const result = namedFunc.apply(this, fullArgs);
      
      // Use the type guard to handle the possibility of a BrandedFunction result
      if (isBrandedFunction<F>(result)) {
        // If it's a BrandedFunction, we need to call it again to get the final result
        return result.apply(this) as ReturnType<F>;
      }
      
      return result;
    } as F;
  };
}

export {
  createNamedArguments,
  createConfigurableFunction,
  BrandedArg,
  ArgTypes,
  BrandedFunction,
  parseFunctionArguments,
  splitArguments,
  parseArgument,
  safeEval,
  ArgumentInfo,
  isBrandedFunction
};