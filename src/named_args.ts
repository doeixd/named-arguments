/*
 * Robust Named Arguments Library
 *
 * This library provides a type-safe way to call functions with named parameters,
 * supporting type inference and type-safe partial application.
 *
 * Features:
 * - Named arguments: Call functions with arguments in any order
 * - Type-safe partial application: Prevents reapplying the same parameter multiple times
 * - Precise return types: TypeScript distinguishes between complete and partial application
 * - Parameter tracking: Maintains type safety across multiple partial applications
 * - Object parameter updates: Safely update previously applied object parameters with reApply
 * - Builder pattern: Accumulate arguments and execute the function
 * - Configurable functions: Preset some arguments via a setup function
 * - Nested property access: Access nested properties of object parameters using dot notation
 *
 * @packageDocumentation
 */

/**
 * Creates named arguments for individual properties of an object parameter.
 * This is a simpler alternative to createNestedArgs for when you only need
 * access to top-level properties of an object parameter.
 *
 * @template T - The object type whose properties will be accessed
 * @param {string} paramName - The name of the parameter in the function
 * @returns {Record<string, NamedArg<any>>} An object with named arguments for each property
 *
 * @example
 * ```typescript
 * // A function with an options object parameter
 * function configureServer(options: {
 *   port: number;
 *   host: string;
 *   ssl: boolean;
 * }) {
 *   // Implementation
 * }
 * 
 * // Create property-level named args for the options object
 * const optionArgs = createObjectPropertyArgs<typeof options>('options');
 * 
 * // Use the property-level named args
 * const server = namedConfigureServer(
 *   optionArgs.port(8080),
 *   optionArgs.host('localhost'),
 *   optionArgs.ssl(true)
 * );
 * ```
 */
export function createObjectPropertyArgs<T extends Record<string, any>>(
  paramName: string
): Record<string, NamedArg<any>> {
  const result: Record<string, any> = {};
  
  // Create a proxy for simple property access only (no deep nesting)
  return new Proxy(result, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop === 'then' || prop === 'toJSON') {
        return undefined;
      }
      
      // If this property accessor has already been created, return it
      if (prop in target) {
        return target[prop];
      }
      
      // Create a named argument function for this property
      const propPath = `${paramName}.${prop}`;
      const argFunc = function(value: any) {
        return { [BRAND_SYMBOL]: { name: propPath, value } } as BrandedArg<any, string>;
      };
      
      // Store it for future use
      target[prop] = argFunc;
      return argFunc;
    }
  });
}/**
 * Type for nested property access with any depth.
 * This allows accessing deeply nested properties using dot notation while
 * maintaining type safety throughout the object tree.
 * 
 * @template T - The type of the object whose nested properties will be accessed
 * @template Path - The base path as a string literal (used internally for recursive types)
 */
export type NestedArgs<T extends Record<string, any>, Path extends string = ""> = {
  [K in keyof T]: K extends string
    ? T[K] extends Record<string, any>
      ? NestedArgs<T[K], Path extends "" ? K : `${Path}.${K}`> & 
        ((value: T[K]) => BrandedArg<T[K], Path extends "" ? K : `${Path}.${K}`>)
      : (value: T[K]) => BrandedArg<T[K], Path extends "" ? K : `${Path}.${K}`>
    : never;
};

export const BRAND_SYMBOL = Symbol('namedArg');

/**
 * Represents a branded argument with a name and value. This is an internal type used to
 * associate values with parameter names at runtime.
 *
 * @template T - The type of the value
 * @template N - The name of the parameter as a string literal type
 *
 * @property {object} [BRAND_SYMBOL] - Symbol used to brand the argument with its name and value
 * @property {N} [BRAND_SYMBOL.name] - The parameter name
 * @property {T} [BRAND_SYMBOL.value] - The parameter value
 *
 * @example
 * ```typescript
 * // Under the hood, each named argument is branded with its parameter name
 * const emailArg = args.email('john@example.com');
 * // Represents: { [BRAND_SYMBOL]: { name: 'email', value: 'john@example.com' } }
 * ```
 */
export type BrandedArg<T = unknown, N extends string = string> = {
  readonly [BRAND_SYMBOL]: {
    name: N;
    value: T;
  };
};

/**
 * Configuration options for named arguments functionality.
 *
 * @property {Record<string, Record<string, string>>} [flattenAs] - Configuration for flattening nested object properties.
 *   Keys are parameter names, values are mappings from property names to flattened parameter names.
 *
 * @example
 * ```typescript
 * const [args, namedFunc] = createNamedArguments(
 *   function(user: { name: string; email: string }) { return user; },
 *   undefined,
 *   {
 *     flattenAs: {
 *       user: {
 *         name: "userName",  // Access user.name as args.userName()
 *         email: "userEmail" // Access user.email as args.userEmail()
 *       }
 *     }
 *   }
 * );
 * namedFunc(args.userName("John"), args.userEmail("john@example.com"));
 * ```
 */
export interface NamedArgsConfig {
  flattenAs?: Record<string, Record<string, string>>;
}

/** Type utility to extract function parameters */
export type Parameters<F extends (...args: any[]) => any> = F extends (...args: infer P) => any ? P : never;

/** Type utility to extract function return type */
export type ReturnType<F extends (...args: any[]) => any> = F extends (...args: any[]) => infer R ? R : never;

/** Function type to create a branded argument */
export type NamedArg<T, N extends string = string> = (value: T) => BrandedArg<T, N>;

/** Type for object properties that are both callable and have properties */
export type CallableObject<T, N extends string> = 
  & ((value: T) => BrandedArg<T, N>)
  & { [K in keyof T]?: K extends string ? NamedArg<T[K], `${N}.${K}`> : never };

/** Structure of named arguments, reflecting the type <A> */
// First, add a type utility to extract flattened properties
export type FlattenedProps<
  T extends Record<string, any>,
  FlattenConfig extends { [P in keyof T]?: { [key: string]: string } }
> = {
  [P in keyof FlattenConfig]: {
    [K in keyof FlattenConfig[P]]: K extends `${infer Base}.${infer Prop}`
      ? P extends keyof T
        ? Base extends keyof T[P]
          ? Prop extends keyof T[P][Base]
            ? NamedArg<T[P][Base][Prop], string & FlattenConfig[P][K]>
            : never
          : never
        : never
      : P extends keyof T
        ? K extends keyof T[P]
          ? NamedArg<T[P][K], string & FlattenConfig[P][K]>
          : never
        : never;
  }
}[keyof FlattenConfig][keyof FlattenConfig[keyof FlattenConfig]];


/**
 * Utility to create an intersection from a union of objects.
 */
export type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Generates the type map for flattened arguments.
 * Keys are the flattened names, values are the corresponding NamedArg functions.
 */
export type FlattenedArgsType<
  A extends Record<string, any>,
  FlattenConfig extends Record<string, Record<string, string>> | undefined
> = FlattenConfig extends Record<string, Record<string, string>>
  // Use UnionToIntersection to merge the objects generated for each flattened arg
  ? UnionToIntersection<{
      // Iterate through the top-level parameter names in the config (e.g., "requestOptions")
      [ParamName in keyof FlattenConfig]: {
        // Iterate through the source property paths in the config (e.g., "headers.contentType", "timeout")
        [SourcePath in keyof FlattenConfig[ParamName]]:
          // Ensure the mapped flattened name is a string
          FlattenConfig[ParamName][SourcePath] extends string ? {
            // The key is the *Flattened Name* (e.g., "contentType")
            [FlatName in FlattenConfig[ParamName][SourcePath]]:
              // The value is NamedArg<TypeAtPath, FlattenedName>
              NamedArg<
                // Get the type from the original structure 'A' using the full path
                GetValueByPath<A, `${string & ParamName}.${string & SourcePath}`>,
                // The name/brand for the NamedArg is the Flattened Name
                FlatName
              >
          } : never; // Should not happen if config is correct
      // Create a union of the { [FlatName]: NamedArg<...> } objects for the current ParamName
      }[keyof FlattenConfig[ParamName]];
    // Create a union of those unions for all ParamNames
    }[keyof FlattenConfig]>
  // If no FlattenConfig is provided, return an empty object type
  : {};

/** Helper type to make complex intersections readable */
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// export type NamedArgs<
//   T extends Record<string, any>,
//   Config extends NamedArgsConfig = {}
// > = {
//   [K in keyof T]-?: T[K] extends Record<string, any>
//     ? CallableObject<T[K], string & K>
//     : NamedArg<T[K], string & K>;
// } & (Config extends { flattenAs: infer F }
//   ? F extends Record<string, Record<string, string>>
//     ? { [K in keyof FlattenedProps<T, F>]: FlattenedProps<T, F>[K] }
//     : {}
//   : {})

// export type NamedArgs<
//   T extends Record<string, any>,
//   Config extends NamedArgsConfig = {}
// > = Prettify<
//   // Base arguments (e.g., args.requestOptions)
//   {
//     [K in keyof T]-?: T[K] extends Record<string, any>
//       ? // Handle nested objects - make them callable and allow property access
//         CallableObject<T[K], string & K>
//       : // Handle non-object parameters
//         NamedArg<T[K], string & K>;
//   }
//   // Merge with flattened arguments (e.g., args.contentType)
//   & FlattenedArgsType<T, Config['flattenAs']>
// >;

export type NamedArgs<T extends Record<string, any>> = {
  [K in keyof T]-?: T[K] extends Record<string, any>
    ? // NOTE: CallableObject provides access to 1st level properties, e.g. args.options.timeout()
      // Deeper nesting needs a dedicated utility like createNestedArgs.
      CallableObject<T[K], string & K>
    : NamedArg<T[K], string & K>;
};

/** Metadata for function parameters */
export interface ParameterInfo {
  name: string;
  required?: boolean;
  defaultValue?: unknown;
  isRest?: boolean;
  order?: number;
}

/** Type definitions for partial application */
export type AppliedNames = readonly string[];

/**
 * Type utility to extract the name from a branded argument
 */
export type ExtractArgName<T> = T extends BrandedArg<any, infer N> ? N : never;

/**
 * Type utility to extract the base parameter name (without property path)
 */
export type ExtractBaseParamName<N extends string> =
  N extends `${infer Base}.${string}` ? Base : N;

/**
 * Type utility to check if a parameter name has already been applied
 */
export type IsNameApplied<
  Name extends string,
  AppliedParams extends readonly string[]
> = ExtractBaseParamName<Name> extends AppliedParams[number] ? true : false;

/**
 * Type utility to filter a single branded arg based on applied parameters
 */
export type FilterBrandedArg<
  Arg,
  AppliedParams extends readonly string[]
> = Arg extends BrandedArg<any, infer N>
  ? IsNameApplied<N, AppliedParams> extends true
    ? never
    : Arg
  : Arg;

/**
 * Type utility to filter a tuple of branded arguments based on already applied parameters
 */
export type FilterBrandedArgs<
  Args extends readonly any[],
  AppliedParams extends readonly string[]
> = {
  [K in keyof Args]: FilterBrandedArg<Args[K], AppliedParams>
};

/**
 * Type utility to extract parameter names from branded arguments
 */
export type ExtractParameterNames<
  Args extends readonly any[]
> = Args extends readonly [infer First, ...infer Rest]
  ? First extends BrandedArg<any, infer N>
    ? [ExtractBaseParamName<N>, ...ExtractParameterNames<Rest>]
    : ExtractParameterNames<Rest>
  : [];

/**
 * Type utility to check if all required parameters are provided
 */
export type AreAllRequiredParamsProvided<
  ParamInfo extends readonly ParameterInfo[],
  AppliedParams extends readonly string[]
> = Extract<ParamInfo[number], { required: true }>['name'] extends infer RequiredNames
  ? RequiredNames extends string
    ? RequiredNames extends AppliedParams[number]
      ? true
      : false
    : true // No required parameters
  : true; // No required parameters

/**
 * Enhanced return type that distinguishes between complete and partial application
 */
export type PartialApplicationReturnType<
  F extends (...args: any[]) => any,
  ParamInfo extends readonly ParameterInfo[],
  CurrentParams extends readonly string[],
  NewParams extends readonly string[]
> = AreAllRequiredParamsProvided<ParamInfo, [...CurrentParams, ...NewParams]> extends true
  ? ReturnType<F>  // All required params provided, return the function's return type
  : BrandedFunction<F, [...CurrentParams, ...NewParams]>; // Not all required params, return partially applied function

/**
 * Interface for the branded function with type-safe partial application.
 * BrandedFunction wraps the original function with extra functionality and type tracking.
 *
 * @template F - The type of the original function
 * @template AppliedParams - String literal type tracking which parameters have been applied
 *
 * @example
 * ```typescript
 * // Create named arguments for a function
 * function greet(name: string, greeting: string) {
 *   return `${greeting}, ${name}!`;
 * }
 *
 * const [args, namedGreet] = createNamedArguments(greet);
 *
 * // Partially apply some arguments
 * const greetJohn = namedGreet.partial(args.name('John'));
 *
 * // Complete the application later
 * const result = greetJohn(args.greeting('Hello')); // "Hello, John!"
 *
 * // Check which arguments still need to be provided
 * const remaining = greetJohn.remainingArgs(); // ["greeting"]
 *
 * // Update an object parameter that was previously applied
 * const updatedOptions = configuredFunction.reApply('options', (prev) => ({
 *   ...prev,
 *   timeout: 5000,
 *   retries: 3
 * }));
 * ```
 */
export interface BrandedFunction<
  F extends (...args: any[]) => any,
  AppliedParams extends readonly string[] = []
> {
  // Call signature that tracks applied parameters in the return type
  <Args extends readonly any[]>(
    ...args: FilterBrandedArgs<Args, AppliedParams>
  ): PartialApplicationReturnType<
    F,
    readonly ParameterInfo[],
    AppliedParams, 
    ExtractParameterNames<Args>
  >;
  
  // Implementation details
  _originalFunction: F;
  _parameterInfo: ParameterInfo[];
  _appliedArgs: Record<string, any>;
  _args?: any[];
  _appliedNames: string[];
  
  /**
   * Creates a partially applied function with the given arguments.
   * Maintains type safety by tracking which parameters have been applied.
   *
   * @template Args - Type of the arguments array
   * @param {...FilterBrandedArgs<Args, AppliedParams>} args - Named arguments to apply
   * @returns {BrandedFunction<F, [...AppliedParams, ...ExtractParameterNames<Args>]>} A new branded function with additional applied parameters
   *
   * @example
   * ```typescript
   * // Create a function with named arguments
   * function formatCurrency(amount: number, currency: string, locale: string) {
   *   return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
   * }
   *
   * const [args, namedFormat] = createNamedArguments(formatCurrency);
   *
   * // Create a partial application for USD in US English
   * const formatUSD = namedFormat.partial(
   *   args.currency('USD'),
   *   args.locale('en-US')
   * );
   *
   * // Use the partial application with remaining arguments
   * const price = formatUSD(args.amount(1234.56)); // "$1,234.56"
   * ```
   */
  partial<Args extends readonly any[]>(
    ...args: FilterBrandedArgs<Args, AppliedParams>
  ): BrandedFunction<F, [...AppliedParams, ...ExtractParameterNames<Args>]>;
  
  /**
   * Returns an array of required parameter names that haven't been applied yet.
   * Useful for checking which parameters still need to be provided.
   *
   * @returns {string[]} Array of required parameter names that haven't been applied
   *
   * @example
   * ```typescript
   * const [args, namedFunc] = createNamedArguments(
   *   (a: string, b: number, c: boolean) => {},
   *   [
   *     { name: 'a', required: true },
   *     { name: 'b', required: true },
   *     { name: 'c', required: false }
   *   ]
   * );
   *
   * const partial = namedFunc.partial(args.a('value'));
   * const remaining = partial.remainingArgs(); // ["b"]
   * ```
   */
  remainingArgs(): string[];

  /**
   * Updates a previously applied object parameter with a new value derived from the previous value.
   * This is useful for modifying complex object parameters without having to respecify all properties.
   *
   * @template T - Type of the object parameter to update (inferred from the parameter value)
   * @template N - The name of the parameter as a string literal type
   * @param {NamedArg<T, N>} param - A function that creates a named argument for the parameter to update
   * @param {(prev: T) => T} updater - A function that takes the previous value and returns an updated value
   * @returns {BrandedFunction<F, AppliedParams>} A new branded function with the updated parameter
   *
   * @example
   * ```typescript
   * // Configure a request with initial options
   * const baseRequest = namedRequest.partial(
   *   args.method('GET'),
   *   args.options({
   *     headers: {
   *       contentType: 'application/json'
   *     },
   *     timeout: 3000
   *   })
   * );
   *
   * // Update just the timeout and add authorization
   * const authRequest = baseRequest.reApply(args.options, (prev) => ({
   *   ...prev,
   *   headers: {
   *     ...prev.headers,
   *     authorization: 'Bearer token123'
   *   },
   *   timeout: 5000
   * }));
   * ```
   */
  reApply<T extends Record<string, any>, N extends string>(
    paramFn: NamedArg<T, N>,
    updater: (prev: T) => T
  ): BrandedFunction<F, AppliedParams>;
}

// Helper type to map parameter indices (as strings) to their types,
// filtering out standard array properties. Needed for default A type.
export type ParamsToObject<P extends any[]> = {
  // Map only numeric indices K
  [K in keyof P as K extends `${number}` ? K : never]: P[K];
};

/**
 * Utility type to recursively get the type of a property at a given path.
 * Handles nested properties and optional chaining (returns undefined if path is invalid).
 * Returns 'unknown' if path is definitively invalid relative to the structure.
 */
type GetValueByPath<T, P extends string> =
  // Handle null/undefined input type
  T extends undefined | null ? unknown :
  // Check if path has dots
  P extends `${infer Head}.${infer Tail}`
    // Check if Head is a valid key in T
    ? Head extends keyof T
      // Recurse with the nested property type and the rest of the path
      // Use NonNullable to simulate drilling down into potentially optional properties
      ? GetValueByPath<NonNullable<T[Head]>, Tail>
      // Head is not a key, path is invalid
      : unknown
    // No more dots, P is the final key
    : P extends keyof T
      // Return the type of the property
      ? T[P]
      // Final key P is not found
      : unknown;


/**
 * Creates named arguments and a branded function for a given function.
 *
 * @template F - Type of the original function
 * @template A - Record type describing the argument structure, defaults to parameters of F
 *
 * @param {F} func - The function to transform
 * @param {ParameterInfo[]} [parameters] - Optional parameter metadata
 * @returns {[NamedArgs<A>, BrandedFunction<F>]} A tuple containing: 
 *   - Named argument accessors (with properties matching the type A)
 *   - A branded function that accepts named arguments
 *
 * @example
 * ```typescript
 * // Basic usage
 * function createUser(firstName: string, lastName: string, age: number, email: string) {
 *   return { firstName, lastName, age, email };
 * }
 *
 * const [args, namedCreateUser] = createNamedArguments<
 *   typeof createUser,
 *   {firstName: string, lastName: string, age: number, email: string}
 * >(createUser);
 *
 * // Use named arguments in any order
 * const user = namedCreateUser(
 *   args.email('john.doe@example.com'),
 *   args.firstName('John'),
 *   args.age(30),
 *   args.lastName('Doe')
 * );
 *
 * // With parameter metadata
 * const [args, namedGreet] = createNamedArguments(
 *   (name: string, greeting?: string) => `${greeting || 'Hello'}, ${name}!`,
 *   [
 *     { name: 'name', required: true },
 *     { name: 'greeting', required: false, defaultValue: 'Hello' }
 *   ]
 * );
 * ```
 */
export function createNamedArguments<
  F extends (...args: any[]) => any,
  // Default A maps parameter *indices* (as strings '0', '1', ...) to types.
  // Parameter *names* cannot be reliably inferred at the type level from F alone.
  // For name-based type safety and better DX, explicitly provide the A type parameter,
  // e.g., createNamedArguments<typeof myFunc, { name: string; age: number }>(myFunc)
  A extends Record<string, any> = ParamsToObject<Parameters<F>>,
  // Config extends NamedArgsConfig = {}
>(
  func: F,
  parameters?: ParameterInfo[],
  // config: Config = {} as Config
): [NamedArgs<A>, BrandedFunction<F>] {
  const paramInfo = parameters || inferParameters(func);
  const argTypes = {} as NamedArgs<A>;

  // Create argument types
  for (const param of paramInfo) {
    const paramName = param.name;
    if (!paramName) continue;

    const paramType = ({} as A)[paramName];
    if (paramType && typeof paramType === 'object' && !param.isRest) {
      // Create a callable object for nested properties
      const nestedObject: any = {};
      
      // Add property accessors
      for (const prop in paramType) {
        nestedObject[prop] = createNamedArg(`${paramName}.${prop}`);
      }
      
      // Make the object itself callable
      const callableNestedObject = Object.assign(
        (value: any) => ({ [BRAND_SYMBOL]: { name: paramName, value } } as BrandedArg<any, string>),
        nestedObject
      );
      
      // Add it to argument types
      (argTypes as any)[paramName] = callableNestedObject;
    } else {
      (argTypes as any)[paramName] = createNamedArg(paramName);
    }
  }

  // if (config.flattenAs) {
  //   for (const param in config.flattenAs) {
  //     for (const prop in config.flattenAs[param]) {
  //       const flatName = config.flattenAs[param][prop];
  //       (argTypes as any)[flatName] = createNamedArg(`${param}.${prop}`);
  //     }
  //   }
  // }

  const brandedFunc = createBrandedFunction(func, paramInfo, []);
  return [argTypes, brandedFunc];
}

/** Helper to create a branded argument */
export function createNamedArg<T, N extends string>(name: N): NamedArg<T, N> {
  return (value: T) => ({ [BRAND_SYMBOL]: { name, value } } as BrandedArg<T, N>);
}

/** Infers parameter information from a function's signature */
export function inferParameters(func: Function): ParameterInfo[] {
  const paramStr = func.toString().match(/(?:function\s*\w*|\(\s*|\b)\s*\(([^)]*)\)/)?.[1] || '';
  const paramNames = paramStr.split(',').map(p => p.trim().split(/[?=]/)[0].replace(/^\{|\}$/g, ''));
  return paramNames.map(name => ({
    name,
    required: !func.toString().includes(`${name}?`) && !func.toString().includes(`${name} =`),
    isRest: name.startsWith('...')
  })).filter(p => p.name);
}

/**
 * Creates a branded function with tracking of applied parameters.
 * This is the core implementation that enables named arguments and partial application.
 *
 * @template F - Type of the original function
 * @param {F} func - The original function to wrap
 * @param {ParameterInfo[]} paramInfo - Parameter metadata
 * @param {string[]} appliedParams - Array of parameter names that have already been applied
 * @returns {BrandedFunction<F>} A branded function that can accept named arguments
 *
 * @internal
 */
export function createBrandedFunction<F extends (...args: any[]) => any>(
  func: F,
  paramInfo: ParameterInfo[] | Readonly<ParameterInfo[]>,
  appliedParams: string[] = []
): BrandedFunction<F> {
  // Create appliedArgsMap to track argument values by parameter name
  const appliedArgsMap: Record<string, any> = {};

  const brandedFunc = function(this: any, ...brandedArgs: BrandedArg[]): any {
    const args: any[] = new Array(paramInfo.length).fill(undefined);
    const newAppliedParams = [...appliedParams];
    const appliedParamIndices = new Set<number>();
    let restArgs: any[] = [];
    const objectProps: Record<string, Record<string, any>> = {};

    // Set the args property for reApply to use
    (brandedFunc as any)._args = args;

    // Process each branded argument
    for (const arg of brandedArgs) {
      if (!isBrandedArg(arg)) continue;
      
      const { name, value } = arg[BRAND_SYMBOL];
      
      // Skip this arg if the parameter has already been applied
      if (name.includes('.')) {
        const [paramName] = name.split('.', 2);
        if (appliedParams.includes(paramName)) {
          console.warn(`Parameter ${paramName} has already been applied, ignoring ${name}`);
          continue;
        }
      } else if (appliedParams.includes(name)) {
        console.warn(`Parameter ${name} has already been applied, ignoring`);
        continue;
      }

      // Handle nested properties (param.prop)
      if (name.includes('.')) {
        const [paramName, propName] = name.split('.', 2);
        const paramIndex = paramInfo.findIndex(p => p.name === paramName);
        
        if (paramIndex !== -1) {
          objectProps[paramName] = objectProps[paramName] || {};
          objectProps[paramName][propName] = value;
          appliedParamIndices.add(paramIndex);
          if (!newAppliedParams.includes(paramName)) {
            newAppliedParams.push(paramName);
          }
        }
        continue;
      }

      // Handle regular arguments
      const argIndex = paramInfo.findIndex(info => info.name === name);
      if (argIndex !== -1) {
        const { isRest } = paramInfo[argIndex];
        
        if (isRest) {
          restArgs = Array.isArray(value) ? [...value] : [value];
        } else {
          args[argIndex] = value;
          appliedParamIndices.add(argIndex);
          if (!newAppliedParams.includes(name)) {
            newAppliedParams.push(name);
          }
        }
      }
    }

    // Apply object properties to argument objects
    for (const [paramName, props] of Object.entries(objectProps)) {
      const paramIndex = paramInfo.findIndex(p => p.name === paramName);
      if (paramIndex !== -1) {
        args[paramIndex] = args[paramIndex] || {};
        Object.assign(args[paramIndex], props);
      }
    }

    // Update the applied args map with current values
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== undefined && i < paramInfo.length) {
        appliedArgsMap[paramInfo[i].name] = args[i];
      }
    }

    // Check if all required args are provided
    const requiredParams = paramInfo
      .filter(p => p.required && !p.isRest)
      .map(p => p.name);
      
    const requiredCount = requiredParams.length;
    const appliedRequiredCount = requiredParams.filter(p => newAppliedParams.includes(p)).length;
    
    // If not all required args provided, return a partial function
    if (appliedRequiredCount < requiredCount) {
      return createBrandedFunction(func, paramInfo, newAppliedParams);
    }

    // Apply default values
    applyDefaultValues(args, [...paramInfo]);
    
    // Check for missing required args
    checkMissingArgs(args, [...paramInfo]);
    
    // Call the wrapped function with all args
    return func.apply(this, [...args, ...restArgs]);
  };

  // Attach metadata and methods
  const result = Object.assign(brandedFunc, {
    _originalFunction: func,
    _parameterInfo: paramInfo,
    _appliedNames: appliedParams,
    _appliedArgs: appliedArgsMap, // Add the appliedArgs map
    
    
    partial: function<Args extends readonly any[]>(...args: FilterBrandedArgs<Args, typeof appliedParams>): BrandedFunction<F, [...typeof appliedParams, ...ExtractParameterNames<Args>]> {
      // If no args provided, return this function
      if (args.length === 0) {
        return this as unknown as BrandedFunction<F, typeof appliedParams>;
      }
      
      // Casting this function as any to avoid type errors
      const result = (this as any)(...args);
      return result as unknown as BrandedFunction<F, [...typeof appliedParams, ...ExtractParameterNames<Args>]>;
    },
    
    // Add the reApply method for named argument functions
    reApply: function<T extends Record<string, any>, N extends string>(
      paramFn: NamedArg<T, N>,
      updater: (prev: T) => T
    ): BrandedFunction<F, typeof appliedParams> {
      // Create a dummy argument to extract the parameter name
      const dummyObj = {} as T;
      const dummyArg = paramFn(dummyObj);
      
      if (!isBrandedArg(dummyArg)) {
        throw new Error('Invalid parameter function provided to reApply');
      }
      
      const name = dummyArg[BRAND_SYMBOL].name;
      const baseParamName = name.includes('.') ? name.split('.', 1)[0] : name;
      
      if (!appliedParams.includes(baseParamName)) {
        throw new Error(`Cannot reapply parameter ${baseParamName} that hasn't been applied yet`);
      }
      
      const paramIndex = paramInfo.findIndex(p => p.name === baseParamName);
      if (paramIndex === -1) {
        throw new Error(`Parameter ${baseParamName} not found in function signature`);
      }
      
      // Create a deep clone of the current applied args
      const currentAppliedArgs = JSON.parse(JSON.stringify(this._appliedArgs || {}));
      
      // Get the previous value
      const prevValue = currentAppliedArgs[baseParamName] as T;
      if (typeof prevValue !== 'object' || prevValue === null) {
        throw new Error(`Parameter ${baseParamName} is not an object or is null`);
      }
      
      // Apply the updater function
      const newValue = updater(prevValue);
      
      // Create a new BrandedArg with the updated value
      const newArg = { 
        [BRAND_SYMBOL]: { 
          name: baseParamName, 
          value: newValue 
        } 
      } as BrandedArg;
      
      // Create a temporary array of arguments for the new function
      const tempArgs: BrandedArg[] = [];
      
      // Add arguments that were previously applied except the one we're updating
      for (const param of appliedParams) {
        if (param !== baseParamName && currentAppliedArgs[param] !== undefined) {
          tempArgs.push({
            [BRAND_SYMBOL]: {
              name: param,
              value: currentAppliedArgs[param]
            }
          } as BrandedArg);
        }
      }
      
      // Add the updated parameter
      tempArgs.push(newArg);
      
      // Create a new function from scratch
      const newFunc = createBrandedFunction(func, paramInfo, []);
      
      // Apply all the args to create a properly configured function
      return newFunc(...tempArgs) as unknown as BrandedFunction<F, typeof appliedParams>;
    },
    
    remainingArgs: function(): string[] {
      return paramInfo
        .filter(p => !p.isRest && !appliedParams.includes(p.name) && p.required)
        .map(p => p.name);
    }
  });

  return result as unknown as BrandedFunction<F, typeof appliedParams>;
}

/** Applies default values to arguments */
function applyDefaultValues(args: any[], paramInfo: ParameterInfo[]): void {
  for (let i = 0; i < paramInfo.length; i++) {
    const { defaultValue, isRest } = paramInfo[i];
    if (!isRest && args[i] === undefined && defaultValue !== undefined) {
      args[i] = defaultValue;
    }
  }
}

/** Checks for missing required arguments */
function checkMissingArgs(args: any[], paramInfo: ParameterInfo[]): void {
  const missingArgs = paramInfo.filter((arg, index) => 
    !arg.isRest && args[index] === undefined && arg.required);
    
  if (missingArgs.length > 0) {
    throw new Error(`Missing required argument(s): ${missingArgs.map(arg => arg.name).join(', ')}`);
  }
}

/**
 * Type guard to check if a value is a branded argument.
 * Useful for runtime validation of arguments.
 *
 * @template T - Type of the value
 * @template N - Type of the parameter name
 * @param {unknown} value - The value to check
 * @returns {boolean} True if the value is a branded argument
 *
 * @example
 * ```typescript
 * if (isBrandedArg(someValue)) {
 *   // TypeScript now knows that someValue is a BrandedArg
 *   const paramName = someValue[BRAND_SYMBOL].name;
 *   const paramValue = someValue[BRAND_SYMBOL].value;
 * }
 * ```
 */
export function isBrandedArg<T = unknown, N extends string = string>(value: unknown): value is BrandedArg<T, N> {
  return (
    value !== null &&
    typeof value === 'object' &&
    BRAND_SYMBOL in value &&
    typeof (value as any)[BRAND_SYMBOL] === 'object' &&
    'name' in (value as any)[BRAND_SYMBOL] &&
    'value' in (value as any)[BRAND_SYMBOL]
  );
}

/**
 * Type guard to check if a value is a branded function.
 * Useful for runtime validation of functions.
 *
 * @template F - Type of the original function
 * @param {unknown} value - The value to check
 * @returns {boolean} True if the value is a branded function
 *
 * @example
 * ```typescript
 * if (isBrandedFunction(someFunction)) {
 *   // TypeScript now knows that someFunction is a BrandedFunction
 *   const originalFunction = someFunction._originalFunction;
 *   const parameterInfo = someFunction._parameterInfo;
 *   const remaining = someFunction.remainingArgs();
 * }
 * ```
 */
export function isBrandedFunction<F extends (...args: any[]) => any>(value: unknown): value is BrandedFunction<F> {
  return (
    typeof value === 'function' && 
    '_originalFunction' in value && 
    '_parameterInfo' in value &&
    typeof (value as any)._originalFunction === 'function' &&
    Array.isArray((value as any)._parameterInfo)
  );
}

/**
 * Creates a configurable function that allows presetting some arguments.
 * This is useful for creating reusable function configurations.
 *
 * @template A - Record type describing the argument structure
 * @template F - Type of the original function
 * @param {[NamedArgs<A>, BrandedFunction<F>]} namedArgsResult - Result of createNamedArguments
 * @returns {(setupFn: (wrappedArgs: NamedArgs<A>) => void) => (...remainingArgs: BrandedArg[]) => any}
 *   A function that takes a setup function to preset arguments and returns a new function accepting remaining arguments
 *
 * @example
 * ```typescript
 * function processArray<T>(
 *   array: T[],
 *   filterFn: (item: T) => boolean,
 *   sortFn?: (a: T, b: T) => number,
 *   limit?: number
 * ): T[] {
 *   let result = array.filter(filterFn);
 *   if (sortFn) result = result.sort(sortFn);
 *   if (limit !== undefined) result = result.slice(0, limit);
 *   return result;
 * }
 *
 * const [args, namedProcess] = createNamedArguments(processArray);
 *
 * // Create a configurable function
 * const configureArrayProcessor = createConfigurableFunction([args, namedProcess]);
 *
 * // Configure a processor for top N positive numbers
 * const topPositiveNumbers = configureArrayProcessor(args => {
 *   // Filter for positive numbers
 *   args.filterFn(num => num > 0);
 *   // Sort in descending order
 *   args.sortFn((a, b) => b - a);
 * });
 *
 * // Use the configured function
 * const numbers = [-5, 10, 3, -2, 8, 1];
 * const top3 = topPositiveNumbers(args.array(numbers), args.limit(3)); // [10, 8, 3]
 * 
 */
export function createConfigurableFunction<
  A extends Record<string, any>,
  F extends (...args: any[]) => any
>(
  [args, brandedFunc]: [NamedArgs<A>, BrandedFunction<F>]
): (setupFn: (wrappedArgs: NamedArgs<A>) => void) => (...remainingArgs: BrandedArg[]) => any {
  return (setupFn) => {
    const presetArgs: BrandedArg[] = [];
    const collector = (arg: BrandedArg) => presetArgs.push(arg);
    const wrappedArgs = wrapArgsForCollection(args, collector);
    setupFn(wrappedArgs);
    
    // If no preset args, return the original function
    if (presetArgs.length === 0) {
      return (...remainingArgs: BrandedArg[]) => brandedFunc(...remainingArgs);
    }
    
    // Create a new branded function with the preset args
    const partialFunc = brandedFunc(...presetArgs) as BrandedFunction<F>;
    
    // Return a function that applies the remaining args
    return (...remainingArgs: BrandedArg[]) => partialFunc(...remainingArgs);
  };
}

/**
 * Helper function to wrap named arguments for collection.
 * This internal utility creates wrapped argument accessors that collect arguments when used.
 * 
 * @template A - Record type describing the argument structure
 * @param {NamedArgs<A>} args - Original named arguments
 * @param {(arg: BrandedArg) => void} collector - Function to collect branded arguments
 * @returns {NamedArgs<A>} Wrapped named arguments that collect when used
 * @internal
 */
function wrapArgsForCollection<A extends Record<string, any>>(
  args: NamedArgs<A>, 
  collector: (arg: BrandedArg) => void
): NamedArgs<A> {
  const wrapped = {} as NamedArgs<A>;
  
  for (const key in args) {
    const value = args[key as keyof typeof args];
    
    if (typeof value === 'function') {
      (wrapped as any)[key] = function() {
        const brandedArg = (value as Function).apply(null, arguments);
        collector(brandedArg);
        return brandedArg;
      };
    } else if (typeof value === 'object' && value !== null) {
      (wrapped as any)[key] = wrapArgsForCollection(value as any, collector);
    }
  }
  
  return wrapped;
}

/**
 * Builder class for accumulating branded arguments and executing the function.
 * Provides a fluent builder pattern for constructing function calls with named arguments.
 * 
 * @template F - Type of the function being built
 */
class Builder<F extends (...args: any[]) => any> {
  private args: BrandedArg[] = [];
  private func: BrandedFunction<F>;
  private paramNames: Set<string> = new Set();

  constructor(func: BrandedFunction<F>) {
    this.func = func;
  }

  /**
   * Adds one or more branded arguments to the builder.
   * Ensures parameters aren't applied multiple times.
   * 
   * @param {...BrandedArg[]} newArgs - Branded arguments to add
   * @returns {this} The builder instance for method chaining
   */
  with(...newArgs: BrandedArg[]): this {
    for (const arg of newArgs) {
      if (!isBrandedArg(arg)) continue;
      
      const { name } = arg[BRAND_SYMBOL];
      
      // Check if this parameter has already been set
      if (name.includes('.')) {
        const [paramName] = name.split('.', 2);
        if (this.paramNames.has(paramName)) {
          console.warn(`Parameter ${paramName} already applied, ignoring ${name}`);
          continue;
        }
        this.paramNames.add(paramName);
      } else {
        if (this.paramNames.has(name)) {
          console.warn(`Parameter ${name} already applied, ignoring`);
          continue;
        }
        this.paramNames.add(name);
      }
      
      this.args.push(arg);
    }
    
    return this;
  }

  /**
   * Executes the function with all accumulated arguments.
   * 
   * @returns {any} The result of executing the function
   */
  execute(): any {
    return this.func(...this.args);
  }
}

/**
 * Creates a builder for the branded function.
 * The builder pattern allows for accumulating arguments and executing the function when ready.
 *
 * @template F - Type of the original function
 * @param {BrandedFunction<F>} brandedFunc - The branded function to build arguments for
 * @returns {Builder<F>} A builder instance
 *
 * @example
 * ```typescript
 * function configureApp(
 *   port: number,
 *   host: string,
 *   database: { url: string, name: string },
 *   logging?: boolean
 * ) {
 *   return { port, host, database, logging };
 * }
 *
 * const [args, namedConfig] = createNamedArguments(configureApp);
 *
 * // Create a builder
 * const appBuilder = createBuilder(namedConfig);
 *
 * // Use the builder pattern to construct the configuration
 * const devConfig = appBuilder
 *   .with(args.port(3000))
 *   .with(args.host('localhost'))
 *   .with(args.database({ url: 'localhost:27017', name: 'devdb' }))
 *   .execute();
 * ```
 */
export function createBuilder<F extends (...args: any[]) => any>(
  brandedFunc: BrandedFunction<F>
): Builder<F> {
  return new Builder<F>(brandedFunc);
}

// Support CommonJS imports
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    createNamedArguments,
    createConfigurableFunction,
    createBuilder,
    isBrandedArg,
    isBrandedFunction,
  };
}

/**
 * Creates named arguments for deeply nested object properties with full type safety.
 * This specialized primitive allows accessing nested properties at any depth.
 *
 * @template T - The type of the object whose nested properties will be accessed
 * @param {string} basePath - The base path for all properties (usually the parameter name)
 * @returns {NestedArgs<T>} A proxy object that provides type-safe access to all nested properties
 *
 * @example
 * ```typescript
 * // Function with a deeply nested object parameter
 * function setupApplication(config: {
 *   server: {
 *     port: number;
 *     host: string;
 *     ssl: {
 *       enabled: boolean;
 *       cert: string;
 *     };
 *   };
 *   database: {
 *     url: string;
 *     credentials: {
 *       username: string;
 *       password: string;
 *     };
 *   };
 * }) {
 *   // Implementation
 * }
 *
 * // Create named arguments
 * const [args, namedSetup] = createNamedArguments(setupApplication);
 *
 * // Create nested arguments for the config parameter
 * type ConfigType = Parameters<typeof setupApplication>[0];
 * const config = createNestedArgs<ConfigType>('config');
 *
 * // Use the nested arguments with convenient dot notation
 * const app = namedSetup(
 *   config.server.port(8080),
 *   config.server.ssl.enabled(true),
 *   config.database.credentials.username('admin')
 * );
 * ```
 */
export function createNestedArgs<T extends Record<string, any>>(
  basePath: string
): NestedArgs<T> {
  const createNestedProxy = (path: string): any => {
    const handler: ProxyHandler<any> = {
      get(target, prop) {
        if (typeof prop !== 'string' || prop === 'then' || prop === 'toJSON') {
          return undefined;
        }
        
        const fullPath = path ? `${path}.${prop}` : prop;
        
        // Lazily create and cache the nested property
        if (!(prop in target)) {
          // Create a function that produces a branded argument
          const argFunc = function(value: any) {
            return { [BRAND_SYMBOL]: { name: fullPath, value } } as BrandedArg<any, string>;
          };
          
          // Create a new proxy for further nesting
          const nestedProxy = createNestedProxy(fullPath);
          
          // Combine the function and proxy capabilities
          const combined = new Proxy(argFunc, {
            get(funcTarget, funcProp) {
              if (typeof funcProp === 'string' && 
                  funcProp !== 'then' && 
                  funcProp !== 'toJSON' && 
                  !(funcProp in Function.prototype)) {
                return nestedProxy[funcProp];
              }
              return Reflect.get(funcTarget, funcProp);
            }
          });
          
          target[prop] = combined;
        }
        
        return target[prop];
      }
    };
    
    return new Proxy({}, handler);
  };
  
  return createNestedProxy(basePath) as NestedArgs<T>;
}

export default {
  createNamedArguments,
  createConfigurableFunction,
  createBuilder,
  createObjectPropertyArgs,
  createNestedArgs,
  isBrandedArg,
  isBrandedFunction,
};