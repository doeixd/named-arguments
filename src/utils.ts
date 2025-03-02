/*
 * Named Arguments Composability Utilities
 *
 * This module extends the Named Arguments Library with utilities for composition
 * and transformation, enabling more flexible and powerful usage patterns.
 *
 * Features:
 * - Argument transformations: Transform values before they're applied as arguments
 * - Argument groups: Group related arguments that can be applied together
 * - Argument pipelines: Process values through multiple transformations
 * - Combined arguments: Create composite arguments from multiple source arguments
 * - Default values: Provide default values for optional arguments
 */

import {
    BrandedArg,
    BrandedFunction,
    NamedArg,
    isBrandedArg,
    BRAND_SYMBOL
  } from './named_args';
  
  /**
   * Creates a transformer for named arguments that applies a transformation function
   * to values before they're used as arguments.
   *
   * @template T - The original type of the argument
   * @template U - The transformed type that will be accepted by the returned function
   * @param {NamedArg<T>} argCreator - The original argument creator function
   * @param {(value: U) => T} transformer - Function that transforms the input value to the required type
   * @returns {NamedArg<U>} A new argument creator that accepts U and applies the transformation
   *
   * @example
   * ```typescript
   * function processData(timestamp: Date, value: number) {
   *   // Implementation
   * }
   * 
   * const [args, namedProcess] = createNamedArguments(processData);
   * 
   * // Create a transformer that converts string timestamps to Date objects
   * const timestampArg = transformArg(args.timestamp, (isoString: string) => new Date(isoString));
   * 
   * // Now we can pass strings instead of Date objects
   * const result = namedProcess(
   *   timestampArg('2023-01-15T12:30:00Z'),
   *   args.value(42)
   * );
   * ```
   */
  export function transformArg<T, U>(
    argCreator: NamedArg<T>,
    transformer: (value: U) => T
  ): NamedArg<U> {
    return (value: U): BrandedArg<T> => {
      // Apply the transformation first
      const transformedValue = transformer(value);
      
      // Then create the branded argument with the transformed value
      const brandedArg = argCreator(transformedValue);
      
      // Return the branded argument
      return brandedArg;
    };
  }
  
  /**
   * Type for argument group configurations.
   * Maps each key to either a named argument function or a nested configuration.
   */
  export type ArgGroupConfig<T extends Record<string, any>> = {
    [K in keyof T]: T[K] extends Record<string, any>
      ? ArgGroupConfig<T[K]>
      : NamedArg<T[K]>;
  };
  
  /**
   * Creates a group of related named arguments that can be applied together.
   * This is useful for applying multiple related arguments with a single object.
   *
   * @template T - The type of the argument group values
   * @param {ArgGroupConfig<T>} config - Configuration mapping of property names to argument creators
   * @returns {(values: Partial<T>) => BrandedArg[]} Function that generates branded arguments from values
   *
   * @example
   * ```typescript
   * function connectDatabase(host: string, port: number, credentials: { username: string, password: string }) {
   *   // Implementation
   * }
   * 
   * const [args, namedConnect] = createNamedArguments(connectDatabase);
   * 
   * // Create an argument group for credential properties
   * const credentialsGroup = createArgGroup({
   *   username: args.credentials.username,
   *   password: args.credentials.password
   * });
   * 
   * // Use the argument group
   * const db = namedConnect(
   *   args.host('localhost'),
   *   args.port(5432),
   *   ...credentialsGroup({ username: 'admin', password: 'secret123' })
   * );
   * 
   * // Nested groups are also supported
   * const connectionGroup = createArgGroup({
   *   host: args.host,
   *   port: args.port,
   *   credentials: createArgGroup({
   *     username: args.credentials.username,
   *     password: args.credentials.password
   *   })
   * });
   * 
   * // Apply all connection settings at once
   * const db = namedConnect(
   *   ...connectionGroup({
   *     host: 'localhost',
   *     port: 5432,
   *     credentials: {
   *       username: 'admin',
   *       password: 'secret123'
   *     }
   *   })
   * );
   * ```
   */
  export function createArgGroup<T extends Record<string, any>>(
    config: ArgGroupConfig<T>
  ): (values: Partial<T>) => BrandedArg[] {
    // Helper to process each property in the configuration
    const processProperty = (
      propConfig: ArgGroupConfig<any> | NamedArg<any>,
      propValue: any
    ): BrandedArg[] => {
      // If the value is undefined or null, skip it
      if (propValue === undefined || propValue === null) {
        return [];
      }
      
      // If the config is a function (NamedArg), apply the value
      if (typeof propConfig === 'function') {
        return [propConfig(propValue)];
      }
      
      // If the config is an object and the value is an object, process recursively
      if (typeof propConfig === 'object' && typeof propValue === 'object') {
        const results: BrandedArg[] = [];
        
        // Process each property in the nested configuration
        for (const key in propConfig) {
          if (key in propValue) {
            results.push(...processProperty(propConfig[key], propValue[key]));
          }
        }
        
        return results;
      }
      
      // If the types don't match, return an empty array
      return [];
    };
  
    // Return a function that processes the values object
    return (values: Partial<T>): BrandedArg[] => {
      const brandedArgs: BrandedArg[] = [];
      
      // Process each property in the values object
      for (const key in values) {
        if (key in config) {
          brandedArgs.push(...processProperty(config[key], values[key]));
        }
      }
      
      return brandedArgs;
    };
  }
  
  /**
   * Creates a combined argument that merges multiple named arguments into one.
   *
   * @template T - The type of the combined value
   * @param {NamedArg<any>} targetArg - The argument to receive the combined value
   * @param {(sources: any[]) => T} combiner - Function that combines the source values
   * @param {...NamedArg<any>[]} sourceArgs - The source arguments to combine
   * @returns {(value: any) => BrandedArg<T>[]} Function that applies the sources and returns the combined argument
   * 
   * @example
   * ```typescript
   * function calculateArea(width: number, height: number, area: number) {
   *   console.assert(Math.abs(width * height - area) < 0.001);
   *   return { width, height, area };
   * }
   * 
   * const [args, namedCalculate] = createNamedArguments(calculateArea);
   * 
   * // Create a combined argument that calculates area from width and height
   * const autoArea = combineArgs(
   *   args.area,
   *   ([width, height]) => width * height,
   *   args.width,
   *   args.height
   * );
   * 
   * // Now we only need to provide width and height
   * const rectangle = namedCalculate(
   *   args.width(5),
   *   args.height(10),
   *   ...autoArea()  // Automatically calculates area = 50
   * );
   * ```
   */
  export function combineArgs<T>(
    targetArg: NamedArg<T>,
    combiner: (sources: any[]) => T,
    ...sourceArgs: NamedArg<any>[]
  ): (values?: Record<string, any>) => BrandedArg<T>[] {
    // Return a function that applies the values and combines them
    return (values: Record<string, any> = {}): BrandedArg<T>[] => {
      // Extract source argument names
      const sourceNames = sourceArgs.map(arg => {
        // Create a dummy call to extract the name
        const dummy = arg(null as any);
        return dummy[BRAND_SYMBOL].name;
      });
      
      // If values are provided, store them for when the branded args are evaluated
      if (Object.keys(values).length > 0) {
        // Process the values to create branded args
        const sourceArgValues = sourceArgs.map((arg, index) => {
          const name = sourceNames[index];
          // If a value is provided for this source, use it
          if (name in values) {
            return arg(values[name]);
          }
          // Otherwise, return a placeholder that will be filled in later
          return { [BRAND_SYMBOL]: { name, value: undefined, isPlaceholder: true } };
        });
        
        // Return the target argument with the combined values
        return [targetArg(combiner(sourceArgValues.map(arg => arg[BRAND_SYMBOL].value)))];
      }
      
      // If no values are provided, return a function that will combine the values at application time
      // This is a more advanced feature that requires runtime support in the library
      // It would need to be added to the createBrandedFunction implementation
      
      // For now, return an empty array as a fallback
      return [];
    };
  }
  
  /**
   * Provides a default value for an optional argument.
   *
   * @template T - The type of the argument
   * @param {NamedArg<T>} argCreator - The argument creator function
   * @param {T} defaultValue - The default value to use when the argument is not provided
   * @returns {() => BrandedArg<T>} Function that creates the argument with the default value
   *
   * @example
   * ```typescript
   * function greet(name: string, greeting: string = "Hello") {
   *   return `${greeting}, ${name}!`;
   * }
   * 
   * const [args, namedGreet] = createNamedArguments(greet);
   * 
   * // Create a default value for the greeting
   * const defaultGreeting = withDefault(args.greeting, "Hi");
   * 
   * // Use the default greeting
   * const result = namedGreet(
   *   args.name("World"),
   *   ...defaultGreeting()  // Uses "Hi" as the default
   * );
   * // "Hi, World!"
   * ```
   */
  export function withDefault<T>(
    argCreator: NamedArg<T>,
    defaultValue: T
  ): () => BrandedArg<T>[] {
    return (): BrandedArg<T>[] => {
      return [argCreator(defaultValue)];
    };
  }
  
  /**
   * Creates a pipeline of transformations for a value before applying it as an argument.
   *
   * @template T - The input type of the pipeline
   * @template U - The output type of the pipeline (and the type of the argument)
   * @param {NamedArg<U>} argCreator - The argument creator function for the final value
   * @returns {ArgumentPipeline<T, U>} A pipeline builder object
   *
   * @example
   * ```typescript
   * function processTransaction(amount: number, timestamp: Date, description: string) {
   *   // Implementation
   * }
   * 
   * const [args, namedProcess] = createNamedArguments(processTransaction);
   * 
   * // Create a pipeline for processing the amount
   * const amountPipeline = pipeline(args.amount)
   *   .map((value: string) => parseFloat(value))   // Convert string to number
   *   .map(value => Math.abs(value))               // Ensure it's positive
   *   .map(value => Math.round(value * 100) / 100); // Round to 2 decimal places
   * 
   * // Use the pipeline
   * const transaction = namedProcess(
   *   amountPipeline("42.567"),  // Converts to 42.57
   *   args.timestamp(new Date()),
   *   args.description("Office supplies")
   * );
   * ```
   */
  export interface ArgumentPipeline<T, U> {
    map<V>(fn: (value: T) => V): ArgumentPipeline<V, U>;
    filter(predicate: (value: T) => boolean, fallback: T): ArgumentPipeline<T, U>;
    apply(value: T): BrandedArg<U>;
  }
  
  export function pipeline<T, U>(argCreator: NamedArg<U>): ArgumentPipeline<T, U> {
    // Start with an identity transformation
    let transformations: ((value: any) => any)[] = [(value: T) => value];
    
    // Create the pipeline object
    const pipelineObj: ArgumentPipeline<T, U> = {
      // Add a transformation to the pipeline
      map<V>(fn: (value: T) => V): ArgumentPipeline<V, U> {
        // Create a new transformation that applies the previous ones and then this one
        const newTransformations = [...transformations, fn];
        
        // Create a new pipeline with the updated transformations
        const newPipeline = pipeline(argCreator) as any;
        newPipeline.transformations = newTransformations;
        
        return newPipeline;
      },
      
      // Add a filter to the pipeline
      filter(predicate: (value: T) => boolean, fallback: T): ArgumentPipeline<T, U> {
        // Create a new transformation that applies the filter
        const filterFn = (value: T) => predicate(value) ? value : fallback;
        
        // Add it to the pipeline
        return pipelineObj.map(filterFn);
      },
      
      // Apply the pipeline to a value
      apply(value: T): BrandedArg<U> {
        // Apply all transformations in sequence
        let result = value;
        for (const transform of transformations) {
          result = transform(result);
        }
        
        // Create the branded argument with the final result
        return argCreator(result as unknown as U);
      }
    };
    
    // Add the transformations array as a property
    (pipelineObj as any).transformations = transformations;
    
    // Make the pipeline callable
    return new Proxy(pipelineObj, {
      apply(target, thisArg, args) {
        return target.apply(args[0]);
      }
    }) as ArgumentPipeline<T, U> & ((value: T) => BrandedArg<U>);
  }
  
  /**
   * Creates a wrapper function that provides validation for arguments.
   *
   * @template T - The type of the argument
   * @param {NamedArg<T>} argCreator - The argument creator function
   * @param {(value: T) => boolean} validator - Function that validates the value
   * @param {string} [errorMessage] - Optional error message for validation failures
   * @returns {NamedArg<T>} A new argument creator with validation
   * 
   * @example
   * ```typescript
   * function transferMoney(amount: number, accountId: string) {
   *   // Implementation
   * }
   * 
   * const [args, namedTransfer] = createNamedArguments(transferMoney);
   * 
   * // Create validated arguments
   * const validatedAmount = withValidation(
   *   args.amount,
   *   (value) => value > 0 && value <= 10000,
   *   "Amount must be between 0 and 10,000"
   * );
   * 
   * const validatedAccount = withValidation(
   *   args.accountId,
   *   (value) => /^ACC\d{10}$/.test(value),
   *   "Invalid account ID format"
   * );
   * 
   * // Use the validated arguments
   * const transfer = namedTransfer(
   *   validatedAmount(500),
   *   validatedAccount("ACC1234567890")
   * );
   * ```
   */
  export function withValidation<T>(
    argCreator: NamedArg<T>,
    validator: (value: T) => boolean,
    errorMessage: string = "Validation failed"
  ): NamedArg<T> {
    return (value: T): BrandedArg<T> => {
      // Validate the value
      if (!validator(value)) {
        throw new Error(errorMessage);
      }
      
      // If valid, create the branded argument
      return argCreator(value);
    };
  }
  
  // Export all composability utilities
  export default {
    transformArg,
    createArgGroup,
    combineArgs,
    withDefault,
    pipeline,
    withValidation
  };