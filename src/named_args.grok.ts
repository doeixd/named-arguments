/**
 * Robust Named Arguments Library
 *
 * This library provides a type-safe way to call functions with named parameters,
 * supporting type inference, customizable flattening, and type-safe partial application.
 *
 * ### Features:
 * - **Named Arguments**: Call functions with arguments in any order.
 * - **Type-Safe Partial Application**: Prevents reapplying the same parameter multiple times.
 * - **Precise Return Types**: TypeScript distinguishes between complete and partial application.
 * - **Parameter Tracking**: Maintains type safety across multiple partial applications.
 * - **Object Parameter Updates**: Safely update previously applied object parameters with `reApply`.
 * - **Builder Pattern**: Accumulate arguments and execute the function.
 * - **Configurable Functions**: Preset some arguments via a setup function.
 *
 * @packageDocumentation
 */

const BRAND_SYMBOL = Symbol("namedArg");

// ### Types and Interfaces

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

/**
 * Represents a branded argument with a name and value, used internally to associate
 * values with parameter names at runtime.
 *
 * @template T - The type of the value.
 * @template N - The parameter name as a string literal type.
 *
 * @property {object} [BRAND_SYMBOL] - Symbol branding the argument with its name and value.
 * @property {N} [BRAND_SYMBOL.name] - The parameter name.
 * @property {T} [BRAND_SYMBOL.value] - The parameter value.
 *
 * @example
 * ```typescript
 * const emailArg = args.email("john@example.com");
 * // Represents: { [BRAND_SYMBOL]: { name: "email", value: "john@example.com" } }
 * ```
 */
export type BrandedArg<T = unknown, N extends string = string> = {
  readonly [BRAND_SYMBOL]: {
    name: N;
    value: T;
  };
};

/** Extracts the parameter types of a function. */
export type Parameters<F extends (...args: any[]) => any> = F extends (...args: infer P) => any ? P : never;

/** Extracts the return type of a function. */
export type ReturnType<F extends (...args: any[]) => any> = F extends (...args: any[]) => infer R ? R : never;

/** Defines a function that creates a branded argument. */
export type NamedArg<T, N extends string = string> = (value: T) => BrandedArg<T, N>;

/**
 * Represents an object that is both callable and has nested property accessors.
 *
 * @template T - The object type.
 * @template N - The base parameter name.
 */
export type CallableObject<T, N extends string> = ((value: T) => BrandedArg<T, N>) & {
  [K in keyof T]?: K extends string ? NamedArg<T[K], `${N}.${K}`> : never;
};

/**
 * Defines the structure of named arguments, reflecting the argument type.
 *
 * @template T - Record type describing the argument structure.
 */
export type NamedArgs<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Record<string, any> ? CallableObject<T[K], string & K> : NamedArg<T[K], string & K>;
};

/**
 * Metadata for function parameters.
 *
 * @property {string} name - Parameter name.
 * @property {boolean} [required] - Whether the parameter is required.
 * @property {unknown} [defaultValue] - Default value if not provided.
 * @property {boolean} [isRest] - Indicates a rest parameter.
 * @property {number} [order] - Parameter order (optional).
 */
export interface ParameterInfo {
  name: string;
  required?: boolean;
  defaultValue?: unknown;
  isRest?: boolean;
  order?: number;
}

/** Array of applied parameter names. */
export type AppliedNames = readonly string[];

/** Extracts the name from a branded argument. */
export type ExtractArgName<T> = T extends BrandedArg<any, infer N> ? N : never;

/** Extracts the base parameter name (before any dots). */
export type ExtractBaseParamName<N extends string> = N extends `${infer Base}.${string}` ? Base : N;

/** Checks if a parameter name has been applied. */
export type IsNameApplied<Name extends string, AppliedParams extends readonly string[]> = ExtractBaseParamName<Name> extends AppliedParams[number] ? true : false;

/** Filters a single branded argument based on applied parameters. */
export type FilterBrandedArg<Arg, AppliedParams extends readonly string[]> = Arg extends BrandedArg<any, infer N>
  ? IsNameApplied<N, AppliedParams> extends true
    ? never
    : Arg
  : Arg;

/** Filters a tuple of branded arguments based on applied parameters. */
export type FilterBrandedArgs<Args extends readonly any[], AppliedParams extends readonly string[]> = {
  [K in keyof Args]: FilterBrandedArg<Args[K], AppliedParams>;
};

/** Extracts parameter names from branded arguments. */
export type ExtractParameterNames<Args extends readonly any[]> = Args extends readonly [infer First, ...infer Rest]
  ? First extends BrandedArg<any, infer N>
    ? [ExtractBaseParamName<N>, ...ExtractParameterNames<Rest>]
    : ExtractParameterNames<Rest>
  : [];

/** Checks if all required parameters are provided. */
export type AreAllRequiredParamsProvided<ParamInfo extends readonly ParameterInfo[], AppliedParams extends readonly string[]> = Extract<
  ParamInfo[number],
  { required: true }
>["name"] extends infer RequiredNames
  ? RequiredNames extends string
    ? RequiredNames extends AppliedParams[number]
      ? true
      : false
    : true
  : true;

/** Determines the return type based on whether all required parameters are provided. */
export type PartialApplicationReturnType<
  F extends (...args: any[]) => any,
  ParamInfo extends readonly ParameterInfo[],
  CurrentParams extends readonly string[],
  NewParams extends readonly string[]
> = AreAllRequiredParamsProvided<ParamInfo, [...CurrentParams, ...NewParams]> extends true
  ? ReturnType<F>
  : BrandedFunction<F, [...CurrentParams, ...NewParams]>;

/**
 * Interface for a branded function with type-safe partial application and additional utilities.
 *
 * @template F - The original function type.
 * @template AppliedParams - Tracks applied parameter names.
 *
 * @example
 * ```typescript
 * function greet(name: string, greeting: string) {
 *   return `${greeting}, ${name}!`;
 * }
 * const [args, namedGreet] = createNamedArguments(greet);
 * const greetJohn = namedGreet.partial(args.name("John"));
 * const result = greetJohn(args.greeting("Hello")); // "Hello, John!"
 * const remaining = greetJohn.remainingArgs(); // ["greeting"]
 * ```
 */
export interface BrandedFunction<F extends (...args: any[]) => any, AppliedParams extends readonly string[] = []> {
  /**
   * Calls the function with branded arguments, returning either the result or a partially applied function.
   */
  <Args extends readonly any[]>(...args: FilterBrandedArgs<Args, AppliedParams>): PartialApplicationReturnType<
    F,
    readonly ParameterInfo[],
    AppliedParams,
    ExtractParameterNames<Args>
  >;

  /** The original function being wrapped. */
  _originalFunction: F;

  /** Parameter metadata. */
  _parameterInfo: ParameterInfo[];

  /** Tracks applied argument values. */
  _appliedArgs: Record<string, any>;

  /** Current argument array (internal). */
  _args?: any[];

  /** Names of applied parameters. */
  _appliedNames: string[];

  /**
   * Creates a partially applied function with the given arguments.
   *
   * @template Args - The argument types.
   * @param args - Named arguments to apply.
   * @returns A new branded function with additional applied parameters.
   *
   * @example
   * ```typescript
   * function formatCurrency(amount: number, currency: string, locale: string) {
   *   return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
   * }
   * const [args, namedFormat] = createNamedArguments(formatCurrency);
   * const formatUSD = namedFormat.partial(args.currency("USD"), args.locale("en-US"));
   * const price = formatUSD(args.amount(1234.56)); // "$1,234.56"
   * ```
   */
  partial<Args extends readonly any[]>(
    ...args: FilterBrandedArgs<Args, AppliedParams>
  ): BrandedFunction<F, [...AppliedParams, ...ExtractParameterNames<Args>]>;

  /**
   * Lists required parameter names that haven’t been applied.
   *
   * @returns Array of remaining required parameter names.
   *
   * @example
   * ```typescript
   * const [args, namedFunc] = createNamedArguments(
   *   (a: string, b: number) => a + b,
   *   [{ name: "a", required: true }, { name: "b", required: true }]
   * );
   * const partial = namedFunc.partial(args.a("test"));
   * console.log(partial.remainingArgs()); // ["b"]
   * ```
   */
  remainingArgs(): string[];

  /**
   * Updates a previously applied object parameter.
   *
   * @template T - Type of the object parameter.
   * @param name - Name of the parameter to update.
   * @param updater - Function to update the previous value.
   * @returns A new branded function with the updated parameter.
   *
   * @example
   * ```typescript
   * const [args, namedRequest] = createNamedArguments(
   *   (method: string, options: { timeout: number }) => ({ method, options })
   * );
   * const baseRequest = namedRequest.partial(args.options({ timeout: 3000 }));
   * const updatedRequest = baseRequest.reApply("options", prev => ({ ...prev, timeout: 5000 }));
   * ```
   */
  reApply<T extends object>(name: AppliedParams[number], updater: (prev: T) => T): BrandedFunction<F, AppliedParams>;
}

// ### Core Functions

/**
 * Creates named arguments and a branded function for a given function.
 *
 * @template F - Type of the original function.
 * @template A - Record type describing the argument structure (defaults to function parameters).
 *
 * @param func - The function to transform.
 * @param parameters - Optional parameter metadata.
 * @param config - Configuration for flattening (optional).
 * @returns A tuple of named arguments and a branded function.
 *
 * @example
 * ```typescript
 * function createUser(firstName: string, lastName: string, age: number, email: string) {
 *   return { firstName, lastName, age, email };
 * }
 * const [args, namedCreateUser] = createNamedArguments(createUser);
 * const user = namedCreateUser(
 *   args.email("john.doe@example.com"),
 *   args.firstName("John"),
 *   args.age(30),
 *   args.lastName("Doe")
 * ); // { firstName: "John", lastName: "Doe", age: 30, email: "john.doe@example.com" }
 * ```
 */
export function createNamedArguments<
  F extends (...args: any[]) => any,
  A extends Record<string, any> = { [K in keyof Parameters<F>]: Parameters<F>[K] }
>(func: F, parameters?: ParameterInfo[], config: NamedArgsConfig = {}): [NamedArgs<A>, BrandedFunction<F>] {
  const paramInfo = parameters || inferParameters(func);
  const argTypes = {} as NamedArgs<A>;

  for (const param of paramInfo) {
    const paramType = ({} as A)[param.name];
    if (paramType && typeof paramType === "object" && !param.isRest) {
      const nestedObject: any = {};
      for (const prop in paramType) {
        nestedObject[prop] = createNamedArg(`${param.name}.${prop}`);
      }
      const callableNestedObject = Object.assign(
        (value: any) => ({ [BRAND_SYMBOL]: { name: param.name, value } } as BrandedArg<any, string>),
        nestedObject
      );
      (argTypes as any)[param.name] = callableNestedObject;
    } else {
      (argTypes as any)[param.name] = createNamedArg(param.name);
    }
  }

  if (config.flattenAs) {
    for (const param in config.flattenAs) {
      for (const prop in config.flattenAs[param]) {
        const flatName = config.flattenAs[param][prop];
        (argTypes as any)[flatName] = createNamedArg(`${param}.${prop}`);
      }
    }
  }

  const brandedFunc = createBrandedFunction(func, paramInfo, config.flattenAs || {}, []);
  return [argTypes, brandedFunc];
}

/**
 * Creates a branded function with parameter tracking.
 *
 * @template F - Type of the original function.
 * @param func - The function to wrap.
 * @param paramInfo - Parameter metadata.
 * @param flattenAs - Flattening configuration.
 * @param appliedParams - Already applied parameter names.
 * @returns A branded function instance.
 * @internal
 */
function createBrandedFunction<F extends (...args: any[]) => any>(
  func: F,
  paramInfo: ParameterInfo[],
  flattenAs: Record<string, Record<string, string>> = {},
  appliedParams: string[] = []
): BrandedFunction<F> {
  const flattenMap: Record<string, { param: string; prop: string }> = {};
  for (const param in flattenAs) {
    for (const prop in flattenAs[param]) {
      flattenMap[flattenAs[param][prop]] = { param, prop };
    }
  }

  const appliedArgsMap: Record<string, any> = {};

  const brandedFunc = function (this: any, ...brandedArgs: BrandedArg[]): any {
    const args: any[] = new Array(paramInfo.length).fill(undefined);
    const newAppliedParams = [...appliedParams];
    const appliedParamIndices = new Set<number>();
    let restArgs: any[] = [];
    const objectProps: Record<string, Record<string, any>> = {};

    (brandedFunc as any)._args = args;

    for (const arg of brandedArgs) {
      if (!isBrandedArg(arg)) continue;
      const { name, value } = arg[BRAND_SYMBOL];

      if (name.includes(".")) {
        const [paramName] = name.split(".", 2);
        if (appliedParams.includes(paramName)) {
          console.warn(`Parameter ${paramName} has already been applied, ignoring ${name}`);
          continue;
        }
      } else if (appliedParams.includes(name)) {
        console.warn(`Parameter ${name} has already been applied, ignoring`);
        continue;
      }

      if (flattenMap[name]) {
        const { param, prop } = flattenMap[name];
        const paramIndex = paramInfo.findIndex((p) => p.name === param);
        if (paramIndex !== -1) {
          objectProps[param] = objectProps[param] || {};
          objectProps[param][prop] = value;
          appliedParamIndices.add(paramIndex);
          if (!newAppliedParams.includes(param)) newAppliedParams.push(param);
        }
        continue;
      }

      if (name.includes(".")) {
        const [paramName, propName] = name.split(".", 2);
        const paramIndex = paramInfo.findIndex((p) => p.name === paramName);
        if (paramIndex !== -1) {
          objectProps[paramName] = objectProps[paramName] || {};
          objectProps[paramName][propName] = value;
          appliedParamIndices.add(paramIndex);
          if (!newAppliedParams.includes(paramName)) newAppliedParams.push(paramName);
        }
        continue;
      }

      const argIndex = paramInfo.findIndex((info) => info.name === name);
      if (argIndex !== -1) {
        const { isRest } = paramInfo[argIndex];
        if (isRest) {
          restArgs = Array.isArray(value) ? [...value] : [value];
        } else {
          args[argIndex] = value;
          appliedParamIndices.add(argIndex);
          if (!newAppliedParams.includes(name)) newAppliedParams.push(name);
        }
      }
    }

    for (const [paramName, props] of Object.entries(objectProps)) {
      const paramIndex = paramInfo.findIndex((p) => p.name === paramName);
      if (paramIndex !== -1) {
        args[paramIndex] = args[paramIndex] || {};
        Object.assign(args[paramIndex], props);
      }
    }

    for (let i = 0; i < args.length; i++) {
      if (args[i] !== undefined && i < paramInfo.length) {
        appliedArgsMap[paramInfo[i].name] = args[i];
      }
    }

    const requiredParams = paramInfo.filter((p) => p.required && !p.isRest).map((p) => p.name);
    const appliedRequiredCount = requiredParams.filter((p) => newAppliedParams.includes(p)).length;

    if (appliedRequiredCount < requiredParams.length) {
      return createBrandedFunction(func, paramInfo, flattenAs, newAppliedParams);
    }

    applyDefaultValues(args, paramInfo);
    checkMissingArgs(args, paramInfo);
    return func.apply(this, [...args, ...restArgs]);
  };

  return Object.assign(brandedFunc, {
    _originalFunction: func,
    _parameterInfo: paramInfo,
    _appliedNames: appliedParams,
    _appliedArgs: appliedArgsMap,
    partial: function <Args extends readonly any[]>(
      ...args: FilterBrandedArgs<Args, typeof appliedParams>
    ): BrandedFunction<F, [...typeof appliedParams, ...ExtractParameterNames<Args>]> {
      if (args.length === 0) return this as any;
      return (this as any)(...args);
    },
    reApply: function <T extends object>(name: string, updater: (prev: T) => T): BrandedFunction<F, typeof appliedParams> {
      if (!appliedParams.includes(name)) throw new Error(`Cannot reapply parameter ${name} that hasn’t been applied`);
      const paramIndex = paramInfo.findIndex((p) => p.name === name);
      if (paramIndex === -1) throw new Error(`Parameter ${name} not found in function signature`);
      const currentAppliedArgs = JSON.parse(JSON.stringify(this._appliedArgs || {}));
      const prevValue = currentAppliedArgs[name] as T;
      if (typeof prevValue !== "object" || prevValue === null) throw new Error(`Parameter ${name} is not an object`);
      const newValue = updater(prevValue);
      const newArg = { [BRAND_SYMBOL]: { name, value: newValue } } as BrandedArg;
      const tempArgs: BrandedArg[] = [];
      for (const param of appliedParams) {
        if (param !== name && currentAppliedArgs[param] !== undefined) {
          tempArgs.push({ [BRAND_SYMBOL]: { name: param, value: currentAppliedArgs[param] } } as BrandedArg);
        }
      }
      tempArgs.push(newArg);
      const newFunc = createBrandedFunction(func, paramInfo, flattenAs, []);
      return newFunc(...tempArgs) as any;
    },
    remainingArgs: function (): string[] {
      return paramInfo.filter((p) => !p.isRest && !appliedParams.includes(p.name) && p.required).map((p) => p.name);
    },
  }) as BrandedFunction<F>;
}

/**
 * Creates a configurable function with preset arguments.
 *
 * @template A - Argument structure type.
 * @template F - Original function type.
 * @param namedArgsResult - Result from `createNamedArguments`.
 * @returns A function that presets arguments and accepts remaining ones.
 *
 * @example
 * ```typescript
 * function processArray<T>(array: T[], filterFn: (item: T) => boolean, sortFn?: (a: T, b: T) => number, limit?: number): T[] {
 *   let result = array.filter(filterFn);
 *   if (sortFn) result = result.sort(sortFn);
 *   if (limit !== undefined) result = result.slice(0, limit);
 *   return result;
 * }
 * const [args, namedProcess] = createNamedArguments(processArray);
 * const configure = createConfigurableFunction([args, namedProcess]);
 * const topPositive = configure((args) => {
 *   args.filterFn((num) => num > 0);
 *   args.sortFn((a, b) => b - a);
 * });
 * const result = topPositive(args.array([-5, 10, 3, -2, 8, 1]), args.limit(3)); // [10, 8, 3]
 * ```
 */
export function createConfigurableFunction<A extends Record<string, any>, F extends (...args: any[]) => any>(
  [args, brandedFunc]: [NamedArgs<A>, BrandedFunction<F>]
): (setupFn: (wrappedArgs: NamedArgs<A>) => void) => (...remainingArgs: BrandedArg[]) => any {
  return (setupFn) => {
    const presetArgs: BrandedArg[] = [];
    const collector = (arg: BrandedArg) => presetArgs.push(arg);
    const wrappedArgs = wrapArgsForCollection(args, collector);
    setupFn(wrappedArgs);
    if (presetArgs.length === 0) return (...remainingArgs: BrandedArg[]) => brandedFunc(...remainingArgs);
    const partialFunc = brandedFunc(...presetArgs) as BrandedFunction<F>;
    return (...remainingArgs: BrandedArg[]) => partialFunc(...remainingArgs);
  };
}

/**
 * Creates a builder for accumulating arguments and executing the function.
 *
 * @template F - Original function type.
 * @param brandedFunc - The branded function to build arguments for.
 * @returns A builder instance.
 *
 * @example
 * ```typescript
 * function configureApp(port: number, host: string, database: { url: string; name: string }, logging?: boolean) {
 *   return { port, host, database, logging };
 * }
 * const [args, namedConfig] = createNamedArguments(configureApp);
 * const builder = createBuilder(namedConfig);
 * const config = builder
 *   .with(args.port(3000))
 *   .with(args.host("localhost"))
 *   .with(args.database({ url: "localhost:27017", name: "devdb" }))
 *   .execute();
 * ```
 */
export function createBuilder<F extends (...args: any[]) => any>(brandedFunc: BrandedFunction<F>): Builder<F> {
  return new Builder(brandedFunc);
}

// ### Helper Functions and Classes

/** Creates a branded argument from a name and value. */
function createNamedArg<T, N extends string>(name: N): NamedArg<T, N> {
  return (value: T) => ({ [BRAND_SYMBOL]: { name, value } } as BrandedArg<T, N>);
}

/** Infers parameter information from a function’s signature. */
function inferParameters(func: Function): ParameterInfo[] {
  const paramStr = func.toString().match(/(?:function\s*\w*|\(\s*|\b)\s*\(([^)]*)\)/)?.[1] || "";
  const paramNames = paramStr.split(",").map((p) => p.trim().split(/[?=]/)[0].replace(/^\{|\}$/g, ""));
  return paramNames
    .map((name) => ({
      name,
      required: !func.toString().includes(`${name}?`) && !func.toString().includes(`${name} =`),
      isRest: name.startsWith("..."),
    }))
    .filter((p) => p.name);
}

/** Applies default values to arguments if not provided. */
function applyDefaultValues(args: any[], paramInfo: ParameterInfo[]): void {
  for (let i = 0; i < paramInfo.length; i++) {
    const { defaultValue, isRest } = paramInfo[i];
    if (!isRest && args[i] === undefined && defaultValue !== undefined) args[i] = defaultValue;
  }
}

/** Throws an error if required arguments are missing. */
function checkMissingArgs(args: any[], paramInfo: ParameterInfo[]): void {
  const missingArgs = paramInfo.filter((arg, index) => !arg.isRest && args[index] === undefined && arg.required);
  if (missingArgs.length > 0) {
    throw new Error(`Missing required argument(s): ${missingArgs.map((arg) => arg.name).join(", ")}`);
  }
}

/**
 * Type guard to check if a value is a branded argument.
 *
 * @template T - Value type.
 * @template N - Parameter name type.
 * @param value - The value to check.
 * @returns True if the value is a branded argument.
 *
 * @example
 * ```typescript
 * if (isBrandedArg(someValue)) {
 *   const { name, value } = someValue[BRAND_SYMBOL];
 * }
 * ```
 */
export function isBrandedArg<T = unknown, N extends string = string>(value: unknown): value is BrandedArg<T, N> {
  return (
    value !== null &&
    typeof value === "object" &&
    BRAND_SYMBOL in value &&
    typeof (value as any)[BRAND_SYMBOL] === "object" &&
    "name" in (value as any)[BRAND_SYMBOL] &&
    "value" in (value as any)[BRAND_SYMBOL]
  );
}

/**
 * Type guard to check if a value is a branded function.
 *
 * @template F - Function type.
 * @param value - The value to check.
 * @returns True if the value is a branded function.
 *
 * @example
 * ```typescript
 * if (isBrandedFunction(someFunction)) {
 *   const remaining = someFunction.remainingArgs();
 * }
 * ```
 */
export function isBrandedFunction<F extends (...args: any[]) => any>(value: unknown): value is BrandedFunction<F> {
  return (
    typeof value === "function" &&
    "_originalFunction" in value &&
    "_parameterInfo" in value &&
    typeof (value as any)._originalFunction === "function" &&
    Array.isArray((value as any)._parameterInfo)
  );
}

/** Wraps named arguments to collect them during setup. */
function wrapArgsForCollection<A extends Record<string, any>>(
  args: NamedArgs<A>,
  collector: (arg: BrandedArg) => void
): NamedArgs<A> {
  const wrapped = {} as NamedArgs<A>;
  for (const key in args) {
    const value = args[key as keyof typeof args];
    if (typeof value === "function") {
      (wrapped as any)[key] = function (...fnArgs: any[]) {
        const brandedArg = (value as Function).apply(null, fnArgs);
        collector(brandedArg);
        return brandedArg;
      };
    } else if (typeof value === "object" && value !== null) {
      (wrapped as any)[key] = wrapArgsForCollection(value as any, collector);
    }
  }
  return wrapped;
}

/**
 * Builder class for accumulating arguments and executing the function.
 *
 * @template F - Original function type.
 */
class Builder<F extends (...args: any[]) => any> {
  private args: BrandedArg[] = [];
  private func: BrandedFunction<F>;
  private paramNames: Set<string> = new Set();

  constructor(func: BrandedFunction<F>) {
    this.func = func;
  }

  /**
   * Adds arguments to the builder.
   * @param newArgs - Arguments to add.
   * @returns The builder instance for chaining.
   */
  with(...newArgs: BrandedArg[]): this {
    for (const arg of newArgs) {
      if (!isBrandedArg(arg)) continue;
      const { name } = arg[BRAND_SYMBOL];
      if (name.includes(".")) {
        const [paramName] = name.split(".", 2);
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
   * Executes the function with accumulated arguments.
   * @returns The function’s result.
   */
  execute(): ReturnType<F> {
    return this.func(...this.args) as ReturnType<F>;
  }
}

// ### Exports

/** CommonJS support */
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = {
    createNamedArguments,
    createConfigurableFunction,
    createBuilder,
    isBrandedArg,
    isBrandedFunction,
  };
}

/** Default export for convenience */
export default {
  createNamedArguments,
  createConfigurableFunction,
  createBuilder,
  isBrandedArg,
  isBrandedFunction,
};