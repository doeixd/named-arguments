/**
 * @module mapped_named_args
 * @description Provides an alternative factory function (`createMappedNamedArguments`)
 *              to create a named arguments interface based on an explicit mapping
 *              specification, rather than inferring from function parameters directly.
 *              This allows renaming arguments and mapping them to nested properties.
 *              It returns a custom wrapper function with partial application logic
 *              based on the mapped keys.
 * @packageDocumentation
 */

import {
  // Core types needed
  type BrandedFunction as CoreBrandedFunction,
  type NamedArg as CoreNamedArg, // Alias core type
  type BrandedArg,
  BRAND_SYMBOL,
  type ParameterInfo,
  type ReturnType as CoreReturnType,
  // Core implementation function (crucial for the hybrid approach)
  createBrandedFunction,
  // Helpers from core
  inferParameters,
  isBrandedArg,
} from './named_args'; // Adjust path as needed

// --- Helper: setValueByPath (Example implementation if not imported) ---
/**
 * @internal Helper to set a value in a nested object based on a path.
 * Creates intermediate objects if they don't exist.
 */
function setValueByPath(
  obj: Record<string, any>,
  path: string,
  value: any,
): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      current[key] === undefined ||
      typeof current[key] !== 'object' ||
      current[key] === null
    ) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

// --- Core Helper Types (Needed for this module's logic) ---

/**
 * Utility type to make all properties of an object or array deeply readonly.
 * @template T - The type to make deeply readonly.
 */
export type DeepReadonly<T> = T extends
  | string | number | boolean | symbol | bigint | null | undefined | Function
  ? T
  : T extends ReadonlyArray<infer E>
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T extends Array<infer E>
  ? Readonly<Array<DeepReadonly<E>>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * Utility type to make complex intersection types more readable.
 * @template T - The type to prettify.
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Utility type to recursively get the type of a property within an object `T`
 * specified by a dot-notation path string `P`.
 * Returns `unknown` if the path is invalid.
 * @template T - The object type to traverse.
 * @template P - The dot-notation path string.
 */
export type GetValueByPath<T, P extends string> = T extends undefined | null
  ? unknown
  : P extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? GetValueByPath<NonNullable<T[Head]>, Tail>
    : unknown
  : P extends keyof T
  ? T[P]
  : unknown;

// --- Map Specification and Resulting Args Type ---

/**
 * Describes the target path within the original function's arguments
 * where a mapped argument's value should be placed.
 * @example "userId", "config.host", "config.ssl.enabled"
 */
export type ArgumentTargetPath = string;

/**
 * The specification map provided to `createMappedNamedArguments`.
 * **Use `as const` when defining objects of this type.**
 */
export type ArgMapSpecification = DeepReadonly<{
  readonly [OutputArgName: string]: ArgumentTargetPath;
}>;

/** The function type for a mapped argument accessor. */
export type MappedNamedArg<T, N extends string> = CoreNamedArg<T, N>;

/** Generates the type for the `args` object based on the Spec. */
export type MappedNamedArgs<
  A extends Record<string, any>,
  Spec extends ArgMapSpecification,
> = Prettify<{
  [OutputArgName in keyof Spec as OutputArgName extends string ? OutputArgName : never]:
    Spec[OutputArgName] extends infer TargetPath
      ? TargetPath extends string
        ? MappedNamedArg<GetValueByPath<A, TargetPath>, TargetPath>
        : never
      : never;
}>;

// --- Custom Type Logic for the Mapped Wrapper Function ---

/**
 * @internal Extracts the OutputArgName (key in Spec) from a BrandedArg
 *           by matching the BrandedArg's brand (TargetPath) against Spec values.
 *           Returns `never` if no match.
 */
type ExtractMapKey<Arg, Spec extends ArgMapSpecification> =
  Arg extends BrandedArg<any, infer Brand>
    ? Brand extends ArgumentTargetPath
      // Use Exclude to ensure only the actual key type(s) remain, filtering out never
      ? Exclude<{ [K in keyof Spec]: Spec[K] extends Brand ? K : never }[keyof Spec], never> extends infer MatchedKey
        // If MatchedKey is never (no match found), return never, otherwise return the key
        ? MatchedKey extends never ? never : MatchedKey
        : never // Should be unreachable
      : never // Brand wasn't ArgumentTargetPath
    : never; // Arg wasn't BrandedArg

/** @internal Utility type to filter 'never' types from a tuple. */
type FilterNever<T extends readonly any[]> = T extends readonly [infer Head, ...infer Tail]
  ? Head extends never
    ? FilterNever<Tail>
    : readonly [Head, ...FilterNever<Tail>]
  : readonly [];

/** @internal Extracts all *valid* OutputArgNames from a tuple of Mapped BrandedArgs. */
type ExtractMapKeys<Args extends readonly any[], Spec extends ArgMapSpecification> =
  FilterNever<{
    [I in keyof Args]: ExtractMapKey<Args[I], Spec>;
  }>;

/** @internal Recursive helper to check if type K exists in tuple T */
type IsKeyInTuple<K, T extends readonly any[]> =
  T extends readonly [infer Head, ...infer Tail]
    ? K extends Head // Check if K matches the current Head
      ? true
      : IsKeyInTuple<K, Tail> // Recurse if no match
    : false; // Reached end of tuple without match

/**
 * @internal Filters a tuple of incoming BrandedArgs (`Args`), removing those whose
 *           corresponding OutputArgName (derived via `ExtractMapKey`) is already
 *           present in the `AppliedMapKeys` tuple. (Uses revised recursive check)
 */
type FilterMappedArgs<
  Args extends readonly any[],
  Spec extends ArgMapSpecification,
  AppliedMapKeys extends readonly (keyof Spec)[],
> = {
  [I in keyof Args]: ExtractMapKey<Args[I], Spec> extends infer MapKey // Get MapKey (e.g., "age")
    ? MapKey extends keyof Spec // Check if MapKey is a valid key from the Spec
        // Use the recursive helper type to check if MapKey is in AppliedMapKeys
        ? IsKeyInTuple<MapKey, AppliedMapKeys> extends true // Check membership
            ? never // Key IS in the tuple, filter it
            : Args[I] // Key is NOT in the tuple, keep it
        : Args[I] // MapKey wasn't a valid keyof Spec (e.g., never), keep arg
    : Args[I]; // ExtractMapKey failed (arg wasn't branded), keep arg
};

// --- Mapped Branded Function Interface ---

/**
 * The custom wrapper function type returned by `createMappedNamedArguments`.
 * Provides type-safe partial application based on the keys defined in the `ArgMapSpecification`.
 */
export interface MappedBrandedFunction<
  F extends (...args: any[]) => any,
  A extends Record<string, any>,
  Spec extends ArgMapSpecification,
  // Constraint AppliedMapKeys to be a tuple of keys from Spec
  AppliedMapKeys extends readonly (keyof Spec)[] = [],
> {
  /**
   * Calls the function partially, applying the provided mapped arguments.
   * Returns a new MappedBrandedFunction instance representing the further partially applied state.
   */
  <Args extends readonly BrandedArg[]>(
    ...args: FilterMappedArgs<Args, Spec, AppliedMapKeys> // Input args are filtered
  ): // Return type uses the broader array type for applied keys state to avoid TS2344
  MappedBrandedFunction<F, A, Spec, readonly (keyof Spec)[]>;

  /**
   * Creates a new partially applied function with the given arguments.
   */
  partial<Args extends readonly BrandedArg[]>(
    ...args: FilterMappedArgs<Args, Spec, AppliedMapKeys> // Input args are filtered
  ): // Return type uses the broader array type
  MappedBrandedFunction<F, A, Spec, readonly (keyof Spec)[]>;

  /** Executes the original function with all accumulated arguments. */
  execute(): CoreReturnType<F>;

  /** Returns an array of the unapplied OutputArgNames from the Spec. */
  remainingArgs(): Exclude<keyof Spec, AppliedMapKeys[number]>[];

  // Internal properties
  readonly _originalFunction: F;
  readonly _argMapSpec: Spec;
  readonly _appliedMapKeys: AppliedMapKeys; // Current state uses the precise tuple
  readonly _parameterInfo?: Readonly<ParameterInfo[]>;
}

// --- Runtime Implementation ---

/** @internal Creates a function that produces a BrandedArg. */
function createNamedArg<T, N extends string>(name: N): MappedNamedArg<T, N> {
  return (value: T) => ({ [BRAND_SYMBOL]: { name, value } } as BrandedArg<T, N>);
}

/** @internal Runtime helper to filter out non-BrandedArg values. */
function filterBrandedArgs_runtime(args: readonly any[]): BrandedArg[] {
  return args.filter(isBrandedArg);
}

/** @internal Runtime helper to extract map keys. */
function extractMapKeys_runtime<Spec extends ArgMapSpecification>(
  args: readonly BrandedArg[],
  spec: Spec,
): (keyof Spec)[] {
  const keys: (keyof Spec)[] = [];
  const targetPathToKeyMap = new Map<ArgumentTargetPath, keyof Spec>();
  for (const key in spec) {
    if (Object.prototype.hasOwnProperty.call(spec, key)) {
      targetPathToKeyMap.set(spec[key], key);
    }
  }
  for (const arg of args) {
    const targetPath = arg[BRAND_SYMBOL].name;
    const mapKey = targetPathToKeyMap.get(targetPath);
    if (mapKey !== undefined) {
      keys.push(mapKey);
    }
  }
  return keys;
}

/**
 * @internal Creates instances of the MappedBrandedFunction wrapper.
 */
function createMappedBrandedFunction_internal<
  F extends (...args: any[]) => any,
  A extends Record<string, any>,
  Spec extends ArgMapSpecification,
  // Function constraint uses the precise tuple type for input filtering
  AppliedMapKeys extends readonly (keyof Spec)[] = [],
>(
  func: F,
  argMapSpec: Spec,
  paramInfo: Readonly<ParameterInfo[]>,
  initialAppliedMapKeys: AppliedMapKeys,
  initialCoreBrandedFunc: CoreBrandedFunction<F>, // The *internal* state holder
  // Return type uses the broader array type to avoid constraint errors
): MappedBrandedFunction<F, A, Spec, AppliedMapKeys> {

  // --- The Wrapper Function Implementation ---
  const mappedFunc = <Args extends readonly BrandedArg[]>(
    ...args: FilterMappedArgs<Args, Spec, AppliedMapKeys> // Input check uses precise AppliedMapKeys
  ): MappedBrandedFunction<F, A, Spec, readonly (keyof Spec)[]> => { // Return uses broader array type
    // --- Logic for state transition ---
    const coreArgsToApply = filterBrandedArgs_runtime(args);
    // Assertion needed as core partial sig differs from wrapper sig
    const nextCoreBrandedFunc = initialCoreBrandedFunc.partial(
      ...(coreArgsToApply as any),
    ) as CoreBrandedFunction<F>;
    const newAppliedMapKeysRuntime = extractMapKeys_runtime(coreArgsToApply, argMapSpec);
    // Calculate the runtime array of unique keys for the *next* state
    const uniqueAppliedMapKeys = [
      ...new Set([...initialAppliedMapKeys, ...newAppliedMapKeysRuntime]),
    ];

    // Return a *new* wrapper, passing the runtime array cast to the broader type
    // for the recursive call's AppliedMapKeys parameter
    return createMappedBrandedFunction_internal<F, A, Spec, readonly (keyof Spec)[]>( // Use broader type for next state's generic parameter
      func,
      argMapSpec,
      paramInfo,
      uniqueAppliedMapKeys as readonly (keyof Spec)[], // Cast runtime array
      nextCoreBrandedFunc,
    );
  };

  // --- Attach Methods ---
  return Object.assign(mappedFunc, {
    // Attach .partial method with correct signature and implementation
    partial: <Args extends readonly BrandedArg[]>(
      ...args: FilterMappedArgs<Args, Spec, AppliedMapKeys> // Input check uses precise AppliedMapKeys
    ): MappedBrandedFunction<F, A, Spec, readonly (keyof Spec)[]> => { // Return broader type
      // --- Direct implementation for .partial (mirrors mappedFunc) ---
      const coreArgsToApply = filterBrandedArgs_runtime(args);
      const nextCoreBrandedFunc = initialCoreBrandedFunc.partial(
        ...(coreArgsToApply as any),
      ) as CoreBrandedFunction<F>;
      const newAppliedMapKeysRuntime = extractMapKeys_runtime(coreArgsToApply, argMapSpec);
      const uniqueAppliedMapKeys = [
        ...new Set([...initialAppliedMapKeys, ...newAppliedMapKeysRuntime]),
      ];

      // Return a *new* wrapper instance with the updated state
      return createMappedBrandedFunction_internal<F, A, Spec, readonly (keyof Spec)[]>( // Use broader type for next state's generic parameter
        func,
        argMapSpec,
        paramInfo,
        uniqueAppliedMapKeys as readonly (keyof Spec)[], // Cast runtime array
        nextCoreBrandedFunc,
      );
    },

    // Attach .execute method
    execute: (): CoreReturnType<F> => {
       // Execute the current internal core function state
      try {
        // Assertion needed as core func might technically return partial
        return initialCoreBrandedFunc() as CoreReturnType<F>;
      } catch (error) {
        console.error(
          'Execution failed. Ensure all required arguments were provided via the mapped args.',
          error,
        );
        throw error;
      }
    },

    // Attach .remainingArgs method
    remainingArgs: (): Exclude<keyof Spec, AppliedMapKeys[number]>[] => {
      // Returns unapplied keys from the Spec based on current state
      const allKeys = Object.keys(argMapSpec);
      const appliedSet = new Set(initialAppliedMapKeys);
      // TODO: Enhance to consider required status from paramInfo
      return allKeys.filter((key) => !appliedSet.has(key)) as Exclude<
        keyof Spec, AppliedMapKeys[number]
      >[];
    },

    // Attach internal properties
    _originalFunction: func,
    _argMapSpec: argMapSpec,
    _appliedMapKeys: initialAppliedMapKeys, // Store the precise tuple for current state
    _parameterInfo: paramInfo,
  });
}


// --- Main Exported Factory Function ---

/**
 * Creates a custom named arguments interface based on an explicit specification map.
 *
 * Generates an `args` object containing only the accessors defined as keys in the
 * `argMapSpec`. Returns a custom wrapper function (`MappedBrandedFunction`) with
 * type-safe partial application based on the *mapped keys*, allowing incremental
 * application even for arguments targeting the same underlying base parameter.
 *
 * **Important:**
 * - You **must** provide the `A` generic parameter accurately representing the
 *   target function's argument structure ({ paramName: Type, ... }).
 * - Use `as const` when defining your `argMapSpec` object for accurate type generation.
 *
 * @template F - The target function type.
 * @template A - The type structure of the target function's arguments. **Must be provided explicitly.**
 * @template Spec - The type of the specific `argMapSpec` object (inferred via `as const`). Must satisfy `ArgMapSpecification`.
 *
 * @param {Spec} argMapSpec - The specification map defining the desired `args` object. Keys are output names, values are target paths. **Use `as const`**.
 * @param {F} func - The target function to wrap.
 * @param {Readonly<ParameterInfo[]>} [parameters] - Optional: Pre-calculated parameter metadata for `func`. If not provided, it will be inferred. Recommended for accuracy.
 *
 * @returns {[MappedNamedArgs<A, Spec>, MappedBrandedFunction<F, A, Spec, []>]} A tuple containing:
 *   - The custom `args` object with accessors matching the `argMapSpec` keys.
 *   - The initial custom wrapper function providing map-aware partial application (initially no args applied).
 */
export function createMappedNamedArguments<
  F extends (...args: any[]) => any,
  A extends Record<string, any>, // User MUST provide this accurately
  Spec extends ArgMapSpecification, // Inferred from const object passed in
>(
  argMapSpec: Spec,
  func: F,
  parameters?: Readonly<ParameterInfo[]>, // Accept readonly array
): [MappedNamedArgs<A, Spec>, MappedBrandedFunction<F, A, Spec, []>] { // Initial state has empty AppliedMapKeys
  // 1. Generate the runtime 'args' object based on the spec
  const args = {} as Record<string, Function>;
  for (const outputArgName in argMapSpec) {
    if (Object.prototype.hasOwnProperty.call(argMapSpec, outputArgName)) {
      const targetPath = argMapSpec[outputArgName];
      if (typeof targetPath === 'string' && targetPath.trim() !== '') {
        // Type <any> is acceptable for runtime generation here
        args[outputArgName] = createNamedArg<any, typeof targetPath>(targetPath);
      } else {
        console.warn(
          `[createMappedNamedArguments] Invalid target path for "${outputArgName}". Skipping.`,
        );
      }
    }
  }

  // 2. Get parameter info for the core BrandedFunction
  const paramInfo = parameters || inferParameters(func);
  // Ensure readonly for internal consistency
  const readonlyParamInfo = Object.freeze(
    paramInfo.map((p) => Object.freeze({ ...p })),
  );

  // 3. Create the initial underlying core branded function (holds the *actual* state)
  const initialCoreBrandedFunc = createBrandedFunction(
    func,
    readonlyParamInfo, // Pass the parameter info
  );

  // 4. Create the initial mapped wrapper function instance
  const mappedWrapper = createMappedBrandedFunction_internal<F, A, Spec, []>( // Explicit empty array for initial state
    func,
    argMapSpec,
    readonlyParamInfo,
    [], // Initial state: no keys applied
    initialCoreBrandedFunc, // Pass the initial core state holder
  );

  // 5. Return the mapped args and the initial wrapper function
  return [args as MappedNamedArgs<A, Spec>, mappedWrapper];
}

// Export all public types and the factory function
// Other types like ArgMapSpecification, MappedNamedArgs etc. are already exported