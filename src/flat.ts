/**
 * @module flattening
 * @description Provides utility functions to add flattened argument accessors
 *              on top of the core named arguments library (`named_args`).
 *              This module allows mapping nested properties of function parameters
 *              to top-level, easily accessible argument functions.
 * @packageDocumentation
 */

import {
  type NamedArgs as CoreNamedArgs,
  type BrandedFunction,
  type NamedArg,
  type BrandedArg,
  BRAND_SYMBOL,
  // ---- IMPORTANT ----
  // Assuming createNamedArg is NOT exported from the core module.
  // If it IS exported, uncomment the line below and remove the local definition.
  // import { createNamedArg } from './named_args';
} from './named_args'; // Adjust path as needed

// --- Helper Types ---

/**
 * Utility type to make all properties of an object or array deeply readonly.
 * Primitives are preserved (including literals if inferred via `as const`).
 * Functions are kept as is.
 *
 * @template T - The type to make deeply readonly.
 */
export type DeepReadonly<T> = T extends
  | string
  | number
  | boolean
  | symbol
  | bigint
  | null
  | undefined
  | Function
  ? T
  : T extends ReadonlyArray<infer E> // Check ReadonlyArray first (includes tuples)
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T extends Array<infer E> // Check mutable array
  ? Readonly<Array<DeepReadonly<E>>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * Utility type to make complex intersection types more readable in editor tooltips
 * by flattening the structure.
 * @template T - The type to prettify.
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Utility type to merge a union of object types into a single intersection type.
 * e.g., `{ a: number } | { b: string }` becomes `{ a: number; b: string }`.
 * @template U - The union type of objects.
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Utility type to recursively get the type of a property within an object `T`
 * specified by a dot-notation path string `P`.
 * Handles optional properties along the path, returning `T | undefined`.
 * Returns `unknown` if the path is definitively invalid based on the structure of `T`.
 *
 * @template T - The object type to traverse.
 * @template P - The dot-notation path string (e.g., "user.address.street").
 */
export type GetValueByPath<T, P extends string> =
  // Handle T being null or undefined itself
  T extends undefined | null
    ? unknown
    : // Check if path has more segments
    P extends `${infer Head}.${infer Tail}`
    ? // Check if Head is a valid key in T
      Head extends keyof T
      ? // Recurse: Use NonNullable to drill down into potentially optional Head, then get value for Tail
        GetValueByPath<NonNullable<T[Head]>, Tail>
      : // Head is not a key, path is invalid from here
        unknown
    : // No more dots, P is the final key
    P extends keyof T
    ? // Return the type of the property T[P]
      T[P]
    : // Final key P is not found in T
      unknown;

// --- Flattening Specific Types ---

/**
 * Policy for handling name collisions when adding flattened arguments.
 * - `warn`: Log a warning to the console and overwrite the existing accessor (default).
 * - `error`: Throw an error, preventing the creation of the flattened arguments object.
 */
export type CollisionPolicy = 'warn' | 'error';

/**
 * Configuration object interface for the `withFlattening` utility function.
 * Specifies how nested properties of parameters should be mapped to top-level
 * flattened argument accessors.
 *
 * IMPORTANT: While this interface defines the expected structure, when *creating*
 * a configuration object to pass to `withFlattening`, use an `as const` assertion
 * directly on the object literal without this interface annotation to ensure
 * TypeScript infers the specific literal types required for the flattening logic.
 *
 * @template A The base argument structure type { paramName: Type, ... } as defined
 *             for the core `createNamedArguments` function.
 */
export interface FlattenArgsConfig<A extends Record<string, any>> {
  /**
   * Defines the mapping from nested properties to flat argument names.
   * The structure provided should be deeply readonly (achieved via `as const`)
   * to preserve the literal types of the target flat names.
   * - Keys are the original parameter names present in the type `A` (e.g., `"options"`).
   * - Values are objects where:
   *   - Keys are source paths within that parameter's type, using dot-notation
   *     (e.g., `"host"`, `"ssl.enabled"`).
   *   - Values are the desired **string literal** flattened argument names
   *     (e.g., `"hostName"`, `"useSSL"`) to be added to the `args` object.
   */
  flattenAs: DeepReadonly<{
    [ParamName in keyof A]?: {
      [sourcePath: string]: string;
    };
  }>;

  /**
   * Determines the behavior if a specified `flatName` conflicts with an
   * existing argument name on the `args` object (either from the core function
   * or from another flattened argument).
   *
   * @default 'warn'
   */
  onCollision?: CollisionPolicy;
}

/**
 * @internal Generates the map of { FlatName: NamedArg<Type, Brand> }
 *           for all configured flattened arguments.
 *           Relies on `Config` extending `FlattenArgsConfig` which enforces
 *           `DeepReadonly` on `flattenAs`, ensuring literal types for flat names
 *           if the input Config type was inferred using `as const`.
 */
type FlattenedArgsMap<
  A extends Record<string, any>,
  Config extends FlattenArgsConfig<A>, // Use interface constraint for validation
> = Config extends { flattenAs: infer FlattenConfig } // Extract potentially readonly flattenAs
  ? UnionToIntersection<
      // Iterate over ParamNames common to Config and A, ensuring they are strings
      { [ParamName in (keyof FlattenConfig & keyof A) & string]:
        ParamName extends keyof FlattenConfig // Check if ParamName is valid key after intersection
          ? { [SourcePath in keyof FlattenConfig[ParamName]]: // Iterate source paths
              // Access readonly value, infer as FlatName (should be literal type)
              FlattenConfig[ParamName][SourcePath] extends infer FlatName
                ? FlatName extends string // Check usability as key
                  ? { [FN in FlatName]: NamedArg< // <<< FN should be literal type
                        GetValueByPath<A, `${ParamName}.${string & SourcePath}`>,
                        `${ParamName}.${string & SourcePath}` // Brand is source path
                      >
                    }
                  : never // FlatName wasn't a string type
                : never // Infer failed (unlikely)
            }[keyof FlattenConfig[ParamName]] // Extract values for ParamName
          : never // ParamName wasn't actually in FlattenConfig keys
      // Extract values for all valid ParamNames
      }[(keyof FlattenConfig & keyof A) & string]
    >
  : {}; // flattenAs didn't exist or had wrong base type

/**
 * Represents the final type of the `args` object returned by `withFlattening`.
 * It combines the original argument accessors from the core library (`CoreNamedArgs<A>`)
 * with the newly generated flattened argument accessors (`FlattenedArgsMap<A, Config>`).
 *
 * @template A The base argument structure type.
 * @template Config The specific configuration type, typically `typeof myConfig` where `myConfig` uses `as const`. Must satisfy `FlattenArgsConfig<A>`.
 */
export type FlattenedNamedArgs<
  A extends Record<string, any>,
  Config extends FlattenArgsConfig<A>, // Use interface constraint
> = Prettify<CoreNamedArgs<A> & FlattenedArgsMap<A, Config>>;

// --- Flattening Utility Function ---

// Define createNamedArg locally ONLY if it's not exported from the core module.
// Prefer importing from './named_args' if possible for consistency.
/**
 * @internal Creates a function that produces a BrandedArg.
 * Needs to be available, either imported or defined locally.
 */
function createNamedArg<T, N extends string>(name: N): NamedArg<T, N> {
  return (value: T) => ({ [BRAND_SYMBOL]: { name, value } } as BrandedArg<T, N>);
}

/**
 * Enhances the result of `createNamedArguments` by adding flattened argument accessors
 * based on the provided configuration.
 *
 * This utility takes the `[args, brandedFunc]` tuple returned by `createNamedArguments`
 * and a flattening configuration object. It returns a new tuple where the `args` object
 * has been augmented with additional methods corresponding to the flattened properties.
 * The original `brandedFunc` is returned unmodified; it handles the flattened arguments
 * transparently because the generated accessors use brands that identify the original
 * source path (e.g., `"options.host"`).
 *
 * **Important:** For correct type inference of the flattened arguments, define the
 * `config` object passed to this function using an `as const` assertion.
 *
 * @template A - The base argument structure type `{ paramName: Type, ... }` used in `createNamedArguments`.
 * @template F - The type of the original function (`(...args: any[]) => any`).
 * @template Config - The specific configuration object type, typically `typeof myConfig` where `myConfig` uses `as const`. **Must** satisfy `FlattenArgsConfig<A>`.
 *
 * @param {[CoreNamedArgs<A>, BrandedFunction<F>]} namedArgsResult - The tuple `[args, brandedFunc]` returned by `createNamedArguments`.
 * @param {Config} config - The configuration object defining how properties should be flattened. **Use `as const` when defining this object, e.g., `const myConfig = { ... } as const;`**
 * @returns {[FlattenedNamedArgs<A, Config>, BrandedFunction<F>]} A new tuple containing:
 *   - A *new* `args` object including both original and flattened accessors, with the combined type `FlattenedNamedArgs<A, Config>`.
 *   - The original, unmodified `brandedFunc`.
 *
 * @throws {Error} If `config.onCollision` is set to `'error'` and a configured `flatName` conflicts with an existing argument name on the `args` object.
 *
 * @example
 * ```typescript
 * import { createNamedArguments } from './named_args';
 * import { withFlattening } from './flattening'; // type FlattenArgsConfig is optional for usage
 *
 * function setupServer(config: { port: number; host: string; enableHttps?: boolean }) { // ... }
 * type SetupArgs = { config: { port: number; host: string; enableHttps?: boolean } };
 *
 * const [baseArgs, namedSetup] = createNamedArguments<typeof setupServer, SetupArgs>(setupServer);
 *
 * // Define config with 'as const' for literal type inference
 * const flattenConfig = {
 *   flattenAs: {
 *     config: {
 *       port: 'portNumber',
 *       host: 'hostAddress',
 *       enableHttps: 'useHttps'
 *     }
 *   },
 *   onCollision: 'warn' // Optional policy
 * } as const; // <-- Important! No : FlattenArgsConfig<SetupArgs> here!
 *
 * // Pass the const object; TypeScript infers Config generic correctly
 * const [args, finalSetup] = withFlattening(
 *    [baseArgs, namedSetup],
 *    flattenConfig
 * );
 *
 * // Use the enhanced args object:
 * finalSetup(args.portNumber(8080), args.hostAddress('localhost')); // OK
 * // args.portNumber('80'); // Compile-time error
 * ```
 */
export function withFlattening<
  A extends Record<string, any>,
  F extends (...args: any[]) => any,
  Config extends FlattenArgsConfig<A>, // Constraint ensures input satisfies the interface structure
>(
  [originalArgs, brandedFunc]: [CoreNamedArgs<A>, BrandedFunction<F>],
  config: Config, // Input object (defined with `as const` by user)
): [FlattenedNamedArgs<A, Config>, BrandedFunction<F>] {
  // Clone the original args object to avoid mutation of the input.
  const newArgs = { ...originalArgs } as Record<string, Function>;

  // config.flattenAs is guaranteed by the interface constraint to have the correct shape if present
  const flattenConfigObject = config.flattenAs || {};
  const collisionPolicy = config.onCollision || 'warn'; // Default to 'warn'

  // Use Object.keys for iteration as flattenConfig might be readonly type from as const
  for (const paramName of Object.keys(flattenConfigObject)) {
    // Defensive check if paramName from keys is actually in the object
    if (!Object.prototype.hasOwnProperty.call(flattenConfigObject, paramName)) {
      continue;
    }
    // Type assertion needed because TS doesn't automatically know keys from Object.keys match keys of the specific type
    const paramMappings = flattenConfigObject[paramName as keyof typeof flattenConfigObject];

    // Check if the mapping for the current parameter is a valid object
    if (paramMappings && typeof paramMappings === 'object') {
      // Iterate through the source paths (e.g., "host", "ssl.enabled")
      for (const sourcePath of Object.keys(paramMappings)) {
        if (!Object.prototype.hasOwnProperty.call(paramMappings, sourcePath)) {
          continue;
        }
        // Get the target flat name (value should be string literal type if `as const` was used)
        // Type assertion needed for safety when indexing with string key
        const flatName = paramMappings[sourcePath as keyof typeof paramMappings];

        // Runtime validation of the flat name
        if (typeof flatName === 'string' && (flatName as unknown as string).trim() !== '') {
          // Check for potential name collisions on the args object before assigning
          if (flatName in newArgs) {
            const message = `[withFlattening] Flattened name "${flatName}" (from "${paramName}.${sourcePath}") conflicts with an existing argument accessor.`;
            if (collisionPolicy === 'error') {
              // Throw an error as configured
              throw new Error(
                `${message} Aborting creation due to 'error' collision policy.`,
              );
            } else {
              // Log a warning (default behavior)
              console.warn(`${message} The existing accessor will be overwritten.`);
            }
          }

          // *** The Core Integration Point ***
          // The Brand assigned to the BrandedArg MUST represent the original source path.
          const brand = `${paramName}.${sourcePath}`;

          // Create the actual NamedArg function using the core helper.
          // Using <any> for T is acceptable here for runtime generation,
          // as caller type safety is enforced by the FlattenedNamedArgs return type.
          newArgs[flatName] = createNamedArg<any, typeof brand>(brand);

        } else {
          // Log warning for invalid config values found at runtime
          console.warn(
            `[withFlattening] Invalid or empty flat name provided for source path "${sourcePath}" under parameter "${paramName}". Skipping.`,
          );
        }
      }
    }
  }

  // Cast the modified args object to the final, correctly typed structure
  const finalArgs = newArgs as FlattenedNamedArgs<A, Config>;

  // Return the enhanced args object and the original branded function
  return [finalArgs, brandedFunc];
}

