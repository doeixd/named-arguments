/**
 * Enhanced Named Arguments Library
 * 
 * This library provides a type-safe way to call functions with named parameters
 * rather than positional arguments, making function calls more readable and
 * less error-prone, especially for functions with many parameters.
 */

/**
 * Symbol used to identify branded arguments internally
 */
export const BRAND_SYMBOL = Symbol('namedArg');

/**
 * Represents a branded argument with a specific type.
 * @template T The type of the argument value
 */
export type BrandedArg<T = unknown> = {
  readonly [BRAND_SYMBOL]: {
    name: string;
    value: T;
  };
};

/**
 * Type guard to check if a value is a BrandedArg
 * @param value The value to check
 * @returns Whether the value is a BrandedArg
 */
export function isBrandedArg(value: unknown): value is BrandedArg {
  return value !== null && 
         typeof value === 'object' && 
         BRAND_SYMBOL in value &&
         typeof (value as any)[BRAND_SYMBOL] === 'object' &&
         'name' in (value as any)[BRAND_SYMBOL] &&
         'value' in (value as any)[BRAND_SYMBOL];
}

/**
 * Extracts the parameter types from a function type.
 * @template F Function type
 */
export type Parameters<F extends (...args: any[]) => any> = 
  F extends (...args: infer P) => any ? P : never;

/**
 * Extracts the return type from a function.
 * @template F Function type
 */
export type ReturnType<F extends (...args: any[]) => any> = 
  F extends (...args: any[]) => infer R ? R : never;


/**
 * Gets the parameter name for a specific index in a function
 * Used for type mapping
 */
export type GetParameterName<
  F extends (...args: any[]) => any,
  Index extends keyof Parameters<F>
> = keyof ArgumentMap<F>;

/**
 * Utility type to remove specific indices from a tuple
 */
export type RemoveIndices<
  T extends any[], 
  K extends keyof any
> = {
  [I in keyof T as I extends K ? never : I]: T[I];
};

/**
 * Maps a function's parameters to a record by name
 */
export type ArgumentMap<F extends (...args: any[]) => any> = {
  [K in keyof FunctionParameterNames<F>]: Parameters<F>[FunctionParameterIndices<F>[K]]
};

/**
 * Represents the structure of argument types for a given function.
 * @template F Function type
 */
export type ArgTypes<F extends (...args: any[]) => any> = {
  [K in keyof ArgumentMap<F>]: NamedArg<ArgumentMap<F>[K]>;
};

/**
 * Named argument accessor function
 * @template T Value type
 */
export type NamedArg<T> = (value: T) => BrandedArg<T>;

/**
 * Creates a named argument
 * @param name Argument name
 * @returns A function that creates a branded argument
 */
export function createNamedArg<T>(name: string): NamedArg<T> {
  return (value: T) => ({
    [BRAND_SYMBOL]: {
      name,
      value
    }
  } as BrandedArg<T>);
}

/**
 * Named arguments collection for a record of types
 * @template T Record of argument types
 */
export type NamedArgs<T extends Record<string, any>> = {
  [K in keyof T]-?: NamedArg<T[K]>;
};

/**
 * A function that accepts branded arguments
 * @template F Original function type
 */
export interface BrandedFunction<F extends (...args: any[]) => any> {
  (...args: BrandedArg[]): ReturnType<F> | BrandedFunction<F>;
  _originalFunction: F;
  _parameterInfo: ArgumentInfo[];
}

/**
 * Maps function parameter indices to their names
 * This is used for type mapping and is populated during runtime
 */
export type FunctionParameterIndices<F> = {
  [name: string]: number;
};

/**
 * Maps function parameter names to their indices
 * This is used for type mapping and is populated during runtime
 */
export type FunctionParameterNames<F> = {
  [index: number]: string;
};

/**
 * Argument information interface
 */
export interface ArgumentInfo {
  /** Parameter name */
  name: string;
  /** Position in the parameter list */
  order: number;
  /** Default value for optional parameters */
  defaultValue?: unknown;
  /** Whether this is a rest parameter */
  isRest: boolean;
  /** Parameter type as a string representation */
  type: string;
  /** Whether the parameter is required */
  required: boolean;
}

/**
 * Creates a set of named arguments and a function that accepts them
 * Supports flattening object parameters so their properties become named arguments
 * 
 * @param func The original function
 * @returns A tuple containing named argument accessors and a branded function
 * @example
 * ```typescript
 * // Function with an options object
 * function createUser(name: string, options: { age: number, email?: string }) {
 *   return { name, age: options.age, email: options.email };
 * }
 * 
 * // Create named arguments with flattened options
 * const [args, namedCreateUser] = createNamedArguments<
 *   { name: string, age: number, email?: string },  // Flattened parameter structure
 *   typeof createUser
 * >(createUser);
 * 
 * // Use flattened named arguments
 * const user = namedCreateUser(
 *   args.name('John'),
 *   args.age(30),     // These were properties of the options object
 *   args.email('john@example.com')
 * );
 * ```
 */
export function createNamedArguments<
  A extends Record<string, any>,  // Flattened argument structure
  F extends (...args: any[]) => any
>(func: F): [NamedArgs<A>, BrandedFunction<F>] {
  // Parse the function to get parameter information
  const paramInfo = parseFunctionArguments(func.toString());
  
  // Create the named argument accessors
  const argTypes = {} as NamedArgs<A>;
  
  // Create named arg accessors for each parameter and flattened properties
  for (const paramName in (({} as unknown) as A)) {
    // Make sure all properties are present regardless of optional status in the type
    (argTypes as any)[paramName] = createNamedArg(paramName);
  }

  // Create the branded function with flattening support
  const brandedFunc = createBrandedFunctionWithFlattening(func, paramInfo);

  return [argTypes, brandedFunc];
}

/**
 * Creates a branded function that accepts named arguments with support for object flattening
 * @param func The original function
 * @param paramInfo Parameter information
 * @returns A branded function
 */
export function createBrandedFunctionWithFlattening<F extends (...args: any[]) => any>(
  func: F,
  paramInfo: ArgumentInfo[]
): BrandedFunction<F> {
  // Count required arguments
  const requiredArgCount = paramInfo.filter(
    arg => !arg.isRest && arg.required
  ).length;

  // Create the branded function
  const brandedFunc = function(
    this: any,
    ...brandedArgs: BrandedArg[]
  ): ReturnType<F> | BrandedFunction<F> {
    // Create a new array to hold the arguments in their correct positions
    const args: any[] = new Array(paramInfo.length).fill(undefined);
    const appliedArgs = new Set<number>();
    let restArgs: any[] = [];
    
    // Track flattened object properties
    const flattenedProps: Record<string, Record<string, any>> = {};
    
    // Group flattened properties by their parent object parameter
    const parameterPaths = extractParameterPaths(brandedArgs);
    
    // First pass: handle direct parameters and collect properties for object parameters
    for (const arg of brandedArgs) {
      if (!isBrandedArg(arg)) continue;
      
      const brandData = arg[BRAND_SYMBOL];
      const argName = brandData.name;
      
      // Check if this is a property path (contains a dot)
      if (argName.includes('.')) {
        // Handle as a flattened property
        const [objParamName, propName] = argName.split('.', 2);
        const paramIndex = paramInfo.findIndex(p => p.name === objParamName);
        
        if (paramIndex !== -1) {
          flattenedProps[objParamName] = flattenedProps[objParamName] || {};
          flattenedProps[objParamName][propName] = brandData.value;
          appliedArgs.add(paramIndex);
        }
        continue;
      }
      
      // Handle as a direct parameter
      const argIndex = paramInfo.findIndex(info => info.name === argName);
      
      if (argIndex === -1) {
        // Check if this is a flattened property
        for (const param of paramInfo) {
          if (parameterPaths[param.name]?.includes(argName)) {
            flattenedProps[param.name] = flattenedProps[param.name] || {};
            flattenedProps[param.name][argName] = brandData.value;
            appliedArgs.add(param.order);
            break;
          }
        }
        continue;
      }
      
      const { isRest } = paramInfo[argIndex];
      
      if (isRest) {
        // Handle rest parameter
        const value = brandData.value;
        if (Array.isArray(value)) {
          restArgs.push(...value);
        } else {
          restArgs.push(value);
        }
      } else if (!appliedArgs.has(argIndex)) {
        // Handle regular parameter
        args[argIndex] = brandData.value;
        appliedArgs.add(argIndex);
      }
    }
    
    // Second pass: apply flattened properties to their object parameters
    for (const [objName, props] of Object.entries(flattenedProps)) {
      const paramIndex = paramInfo.findIndex(p => p.name === objName);
      if (paramIndex !== -1) {
        args[paramIndex] = args[paramIndex] || {};
        Object.assign(args[paramIndex], props);
      }
    }

    // If not all required arguments are provided, return a partial function
    if (appliedArgs.size < requiredArgCount) {
      return createPartialFunctionWithFlattening(
        brandedFunc,
        args,
        appliedArgs,
        restArgs,
        paramInfo,
        flattenedProps
      );
    }

    // Apply default values for optional parameters
    applyDefaultValues(args, paramInfo);

    // Check if any required arguments are missing
    checkMissingArgs(args, paramInfo);

    // Call the original function with the arguments
    return func.apply(this, [...args, ...restArgs]);
  } as BrandedFunction<F>;

  // Add metadata to the branded function
  brandedFunc._originalFunction = func;
  brandedFunc._parameterInfo = paramInfo;

  return brandedFunc;
}

/**
 * Creates a partial function with flattening support
 */
export function createPartialFunctionWithFlattening<F extends (...args: any[]) => any>(
  brandedFunc: BrandedFunction<F>,
  previousArgs: any[],
  appliedArgs: Set<number>,
  restArgs: any[],
  paramInfo: ArgumentInfo[],
  flattenedProps: Record<string, Record<string, any>>
): BrandedFunction<F> {
  const partialFunc = function(
    this: any,
    ...moreBrandedArgs: BrandedArg[]
  ): ReturnType<F> | BrandedFunction<F> {
    // Create new arrays for the current invocation
    const currentArgs = [...previousArgs];
    const currentAppliedArgs = new Set(appliedArgs);
    const currentRestArgs = [...restArgs];
    const currentFlattenedProps = { ...flattenedProps };
    
    // Apply new branded arguments
    for (const arg of moreBrandedArgs) {
      if (!isBrandedArg(arg)) continue;
      
      const brandData = arg[BRAND_SYMBOL];
      const argName = brandData.name;
      
      // Check if this is a property path (contains a dot)
      if (argName.includes('.')) {
        // Handle as a flattened property
        const [objParamName, propName] = argName.split('.', 2);
        const paramIndex = paramInfo.findIndex(p => p.name === objParamName);
        
        if (paramIndex !== -1) {
          currentFlattenedProps[objParamName] = currentFlattenedProps[objParamName] || {};
          currentFlattenedProps[objParamName][propName] = brandData.value;
          currentAppliedArgs.add(paramIndex);
        }
        continue;
      }
      
      // Handle as a direct parameter
      const argIndex = paramInfo.findIndex(info => info.name === argName);
      
      if (argIndex === -1) {
        // Check if this is a flattened property
        const parameterPaths = extractParameterPaths(moreBrandedArgs);
        for (const param of paramInfo) {
          if (parameterPaths[param.name]?.includes(argName)) {
            currentFlattenedProps[param.name] = currentFlattenedProps[param.name] || {};
            currentFlattenedProps[param.name][argName] = brandData.value;
            currentAppliedArgs.add(param.order);
            break;
          }
        }
        continue;
      }
      
      const { isRest } = paramInfo[argIndex];
      
      if (isRest) {
        // Handle rest parameter
        const value = brandData.value;
        if (Array.isArray(value)) {
          currentRestArgs.push(...value);
        } else {
          currentRestArgs.push(value);
        }
      } else if (!currentAppliedArgs.has(argIndex)) {
        // Handle regular parameter
        currentArgs[argIndex] = brandData.value;
        currentAppliedArgs.add(argIndex);
      }
    }
    
    // Apply flattened properties to their object parameters
    for (const [objName, props] of Object.entries(currentFlattenedProps)) {
      const paramIndex = paramInfo.findIndex(p => p.name === objName);
      if (paramIndex !== -1) {
        currentArgs[paramIndex] = currentArgs[paramIndex] || {};
        Object.assign(currentArgs[paramIndex], props);
      }
    }
    
    // Create branded args from the applied arguments for the next call
    const nextBrandedArgs = currentArgs
      .map((arg, index) => {
        if (arg === undefined) return undefined;
        return {
          [BRAND_SYMBOL]: {
            name: paramInfo[index].name,
            value: arg
          }
        } as BrandedArg;
      })
      .filter((arg): arg is BrandedArg => arg !== undefined);
    
    // Call the branded function with the collected arguments
    return brandedFunc.apply(this, nextBrandedArgs);
  } as BrandedFunction<F>;
  
  // Add metadata to the partial function
  partialFunc._originalFunction = brandedFunc._originalFunction;
  partialFunc._parameterInfo = paramInfo;
  
  return partialFunc;
}

/**
 * Creates a partial function with some arguments applied
 */
export function createPartialFunction<F extends (...args: any[]) => any>(
  brandedFunc: BrandedFunction<F>,
  previousArgs: any[],
  appliedArgs: Set<number>,
  restArgs: any[],
  paramInfo: ArgumentInfo[]
): BrandedFunction<F> {
  const partialFunc = function(
    this: any,
    ...moreBrandedArgs: BrandedArg[]
  ): ReturnType<F> | BrandedFunction<F> {
    // Create new arrays for the current invocation
    const currentArgs = [...previousArgs];
    const currentAppliedArgs = new Set(appliedArgs);
    const currentRestArgs = [...restArgs];
    
    // Apply the new branded arguments
    for (const arg of moreBrandedArgs) {
      if (!isBrandedArg(arg)) continue;
      
      const brandData = arg[BRAND_SYMBOL];
      const argName = brandData.name;
      const argIndex = paramInfo.findIndex(info => info.name === argName);
      
      if (argIndex === -1) continue;
      
      const { isRest } = paramInfo[argIndex];
      
      if (isRest) {
        // Handle rest parameter
        const value = brandData.value;
        if (Array.isArray(value)) {
          currentRestArgs.push(...value);
        } else {
          currentRestArgs.push(value);
        }
      } else if (!currentAppliedArgs.has(argIndex)) {
        // Handle regular parameter
        currentArgs[argIndex] = brandData.value;
        currentAppliedArgs.add(argIndex);
      }
    }
    
    // Create branded args from the applied arguments for the next call
    const nextBrandedArgs = currentArgs
      .map((arg, index) => {
        if (arg === undefined) return undefined;
        return {
          [BRAND_SYMBOL]: {
            name: paramInfo[index].name,
            value: arg
          }
        } as BrandedArg;
      })
      .filter((arg): arg is BrandedArg => arg !== undefined);
    
    // Call the branded function with the collected arguments
    return brandedFunc.apply(this, nextBrandedArgs);
  } as BrandedFunction<F>;
  
  // Add metadata to the partial function
  partialFunc._originalFunction = brandedFunc._originalFunction;
  partialFunc._parameterInfo = paramInfo;
  
  return partialFunc;
}

/**
 * Helper function to extract parameter paths from function metadata and arguments
 * This helps identify which properties belong to which object parameters
 */
export function extractParameterPaths(
  brandedArgs: BrandedArg[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  // Extract paths from dot notation in argument names
  for (const arg of brandedArgs) {
    if (!isBrandedArg(arg)) continue;
    
    const brandData = arg[BRAND_SYMBOL];
    const argName = brandData.name;
    
    if (argName.includes('.')) {
      const [objName, propName] = argName.split('.', 2);
      result[objName] = result[objName] || [];
      if (!result[objName].includes(propName)) {
        result[objName].push(propName);
      }
    }
  }
  
  return result;
}

/**
 * Applies default values to arguments
 */
export function applyDefaultValues(args: any[], paramInfo: ArgumentInfo[]): void {
  for (let i = 0; i < paramInfo.length; i++) {
    const { defaultValue, isRest } = paramInfo[i];
    if (!isRest && args[i] === undefined && defaultValue !== undefined) {
      args[i] = defaultValue;
    }
  }
}

/**
 * Checks for missing required arguments
 */
export function checkMissingArgs(args: any[], paramInfo: ArgumentInfo[]): void {
  const missingArgs = paramInfo.filter((arg, index) => 
    !arg.isRest && args[index] === undefined && arg.required
  );
  
  if (missingArgs.length > 0) {
    throw new Error(
      `Missing required argument(s): ${missingArgs.map(arg => arg.name).join(', ')}`
    );
  }
}

/**
 * Type guard to check if a value is a BrandedFunction
 * @param value The value to check
 * @returns Whether the value is a BrandedFunction
 */
export function isBrandedFunction<F extends (...args: any[]) => any>(
  value: ReturnType<F> | BrandedFunction<F>
): value is BrandedFunction<F> {
  return typeof value === 'function' && 
         '_originalFunction' in value &&
         '_parameterInfo' in value;
}

/**
 * Creates a configurable function based on named arguments
 * @template A The record of named arguments with names matching function parameter names
 * @template F The original function type
 * @param namedArgsResult Result of createNamedArguments
 * @returns A configurable function factory that accepts generic type parameter for which args will be configured
 * @example
 * ```typescript
 * function divide(a: number, b: number) {
 *   return a / b;
 * }
 * 
 * const [args, namedDivide] = createNamedArguments<{a: number, b: number}, typeof divide>(divide);
 * const configurableMultiply = createConfigurableFunction([args, namedDivide]);
 * 
 * // Use the keys from the named args record to specify what we're configuring
 * const divideByTwo = configurableMultiply<'b'>(args => {
 *   args.b(2);
 * });
 * 
 * // divideByTwo has type: (a: number) => number
 * divideByTwo(10); // returns 5
 * ```
 */
export function createConfigurableFunction<
  A extends Record<string, any>,
  F extends (...args: any[]) => any
>(
  [argTypes, brandedFunc]: [NamedArgs<A>, BrandedFunction<F>]
): {
  <ConfigArgs extends keyof A>(
    setupFn: (args: Pick<NamedArgs<A>, ConfigArgs>) => void
  ): (...args: any[]) => ReturnType<F>
} {
  return function<ConfigArgs extends keyof A>(
    setupFn: (args: Pick<NamedArgs<A>, ConfigArgs>) => void
  ) {
    // Collect the arguments applied in the setup function
    const appliedArgs: BrandedArg[] = [];
    
    // Create a proxy to record which arguments are used
    const recordingArgTypes = new Proxy({} as Pick<NamedArgs<A>, ConfigArgs>, {
      get(_, prop: string | symbol) {
        // Get the original arg creator function
        const originalArgCreator = (argTypes as any)[prop.toString()];
        
        if (typeof originalArgCreator !== 'function') {
          throw new Error(`Unknown argument: ${String(prop)}`);
        }
        
        // Return a function that records the argument usage
        return (...args: any[]) => {
          const brandedArg = originalArgCreator(...args);
          appliedArgs.push(brandedArg);
          return brandedArg;
        };
      }
    });
    
    // Run the setup function to collect arguments
    setupFn(recordingArgTypes);
    
    // Create a mapping of parameter names to their indices
    const paramNameToIndex: Record<string, number> = {};
    const paramInfo = brandedFunc._parameterInfo;
    
    paramInfo.forEach((param, index) => {
      paramNameToIndex[param.name] = index;
    });
    
    // Get the names of configured parameters
    const configuredParamNames = new Set<string>(
      appliedArgs.map(arg => arg[BRAND_SYMBOL].name)
    );
    
    // Create the configured function
    const configuredFunction = function(this: any, ...runtimeArgs: any[]): ReturnType<F> {
      // Combine preset arguments with runtime arguments
      const allArgs = [...appliedArgs];
      
      // Track which parameters have been used
      const usedParams = new Set<string>(configuredParamNames);
      
      // Find available parameters that aren't configured
      const availableParams = paramInfo
        .filter(param => !usedParams.has(param.name) && !param.isRest)
        .sort((a, b) => a.order - b.order);
      
      // Map runtime arguments to available parameters
      for (let i = 0; i < runtimeArgs.length; i++) {
        const arg = runtimeArgs[i];
        
        // If already branded, use as is
        if (isBrandedArg(arg)) {
          allArgs.push(arg);
          usedParams.add(arg[BRAND_SYMBOL].name);
          continue;
        }
        
        // Get the next available parameter
        if (i < availableParams.length) {
          const param = availableParams[i];
          allArgs.push({
            [BRAND_SYMBOL]: {
              name: param.name,
              value: arg
            }
          } as BrandedArg);
          usedParams.add(param.name);
        } else {
          // Handle extra arguments as rest parameters
          const restParam = paramInfo.find(p => p.isRest);
          if (restParam) {
            // Either add to existing rest arg or create a new one
            const existingRestArgIndex = allArgs.findIndex(
              a => isBrandedArg(a) && a[BRAND_SYMBOL].name === restParam.name
            );
            
            if (existingRestArgIndex >= 0) {
              // Add to existing rest arg
              const existingArg = allArgs[existingRestArgIndex];
              const existingValues = existingArg[BRAND_SYMBOL].value;
              if (Array.isArray(existingValues)) {
                existingValues.push(arg);
              } else {
                // Replace with array
                allArgs[existingRestArgIndex] = {
                  [BRAND_SYMBOL]: {
                    name: restParam.name,
                    value: [existingValues, arg]
                  }
                } as BrandedArg;
              }
            } else {
              // Create new rest arg
              allArgs.push({
                [BRAND_SYMBOL]: {
                  name: restParam.name,
                  value: [arg]
                }
              } as BrandedArg);
            }
          } else {
            throw new Error(`Too many arguments provided`);
          }
        }
      }
      
      // Call the branded function
      const result = brandedFunc.apply(this, allArgs);
      
      // Unwrap branded function result if needed
      if (isBrandedFunction<F>(result)) {
        return result.apply(this) as ReturnType<F>;
      }
      
      return result;
    };
    
    // Return with the correct type
    return configuredFunction as (
      ...args: RemoveConfiguredArgs<Parameters<F>, A, ConfigArgs>
    ) => ReturnType<F>;
  };
}

/**
 * Type helper to remove configured arguments from parameter list
 */
export type RemoveConfiguredArgs<
  Params extends any[],
  A extends Record<string, any>,
  ConfigArgs extends keyof A
> = {
  [K in keyof Params as K extends `${number}` 
    ? (ParameterNameAtIndex<Params, K> extends ConfigArgs ? never : K)
    : K
  ]: Params[K]
};

/**
 * Maps parameter index to its name (conceptual - determined at runtime)
 */
export type ParameterNameAtIndex<Params, Index extends keyof Params> = keyof Params;

/**
 * Parses function arguments from a function string
 * @param functionString The function as a string
 * @returns An array of argument information
 */
export function parseFunctionArguments(functionString: string): ArgumentInfo[] {
  // Extract the argument string from the function
  const argRegex = /(?:function\s*\w*|\(\s*|\b)\s*\(([^)]*)\)/;
  const match = functionString.match(argRegex);
  
  if (!match) {
    throw new Error("Invalid function string: couldn't extract parameters");
  }
  
  const argsString = match[1].trim();
  if (!argsString) return [];
  
  // Split and parse the arguments
  const args = splitArguments(argsString);
  return args.map((arg, index) => parseArgument(arg, index));
}

/**
 * Splits the argument string into individual arguments
 * @param argsString The string containing all arguments
 * @returns An array of individual argument strings
 */
export function splitArguments(argsString: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  
  for (const char of argsString) {
    // Handle string delimiters
    if ((char === '"' || char === "'" || char === '`') && !escaped) {
      if (inString && char === stringChar) {
        inString = false;
      } else if (!inString) {
        inString = true;
        stringChar = char;
      }
    }
    
    // Handle escape character
    if (char === '\\' && inString) {
      escaped = !escaped;
    } else {
      escaped = false;
    }
    
    // Handle parentheses depth
    if (!inString) {
      if (char === '(') depth++;
      if (char === ')') depth--;
    }
    
    // Split on commas at depth 0 and not in strings
    if (char === ',' && depth === 0 && !inString) {
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
 * Parses a single argument string
 * @param arg The argument string to parse
 * @param index The index of the argument
 * @returns The parsed argument information
 */
export function parseArgument(arg: string, index: number): ArgumentInfo {
  // Check if it's a rest parameter
  const isRest = arg.startsWith('...');
  
  // Get the parameter name
  let name;
  if (isRest) {
    name = arg.slice(3).split(':')[0].trim();
  } else {
    name = arg.split(/[=:]/, 1)[0].trim();
  }
  
  // Clean up parameter name (handle destructuring)
  name = name.replace(/^\{|\}$/g, '');
  
  // Check for default value
  const hasDefault = !isRest && arg.includes('=');
  const defaultValue = hasDefault ? 
    safeEval(arg.split('=')[1].trim()) : 
    undefined;
  
  // Extract type information
  let type = 'any';
  const typeMatch = arg.match(/:\s*([^=]*?)(?:=|$)/);
  if (typeMatch) {
    type = typeMatch[1].trim();
  }
  
  return {
    name,
    order: index,
    defaultValue,
    isRest,
    type,
    required: !hasDefault && !isRest
  };
}

/**
 * Safely evaluates a string as a JavaScript expression
 * @param str The string to evaluate
 * @returns The result of the evaluation
 */
export function safeEval(str: string): unknown {
  // Define allowed constructors and objects
  const allowList = [
    'Object', 'Array', 'String', 'Number', 'Boolean', 
    'Date', 'Math', 'JSON', 'RegExp', 'Map', 'Set'
  ];
  
  // Create a sandbox with allowed objects
  const sandbox = Object.fromEntries(
    allowList.map(name => [name, (globalThis as any)[name]])
  );
  
  try {
    // Create a function that evaluates the expression in the sandbox
    const func = new Function(
      ...Object.keys(sandbox),
      `"use strict"; return (${str});`
    );
    
    // Call the function with the sandbox objects
    return func(...Object.values(sandbox));
  } catch (error) {
    console.warn(`Failed to evaluate default value: ${str}`);
    // Return the original string if evaluation fails
    return str;
  }
}

// Export everything in a namespace for easy importing
export default {
  createNamedArguments,
  createConfigurableFunction,
  isBrandedArg,
  isBrandedFunction,
  parseFunctionArguments,
  splitArguments,
  parseArgument,
  safeEval,
  createPartialFunction,
  createBrandedFunctionWithFlattening,
};