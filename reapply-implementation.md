# reApply Implementation for named_args.ts

Here are the specific changes needed to implement the `reApply` method in `named_args.ts`:

## 1. Update the BrandedFunction interface

First, update the `BrandedFunction` interface to add the `reApply` method and related properties:

```typescript
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
  _appliedNames: string[];
  _appliedArgs: Record<string, any>; // Add this
  _args?: any[]; // Add this
  
  // Partial application with parameter tracking
  partial<Args extends readonly any[]>(
    ...args: FilterBrandedArgs<Args, AppliedParams>
  ): BrandedFunction<F, [...AppliedParams, ...ExtractParameterNames<Args>]>;
  
  // Utility method to check remaining required arguments
  remainingArgs(): string[];
  
  // Add the reApply method
  reApply<T extends object>(
    name: AppliedParams[number], 
    updater: (prev: T) => T
  ): BrandedFunction<F, AppliedParams>;
}
```

## 2. Update the createBrandedFunction implementation

Then, modify the `createBrandedFunction` function to track applied arguments and implement the `reApply` method:

```typescript
function createBrandedFunction<F extends (...args: any[]) => any>(
  func: F,
  paramInfo: ParameterInfo[],
  flattenAs: Record<string, Record<string, string>> = {},
  appliedParams: string[] = []
): BrandedFunction<F> {
  // Existing code...
  
  const brandedFunc = function(this: any, ...brandedArgs: BrandedArg[]): any {
    const args: any[] = new Array(paramInfo.length).fill(undefined);
    // Rest of existing code...
    
    // Add this line after args is initialized:
    (brandedFunc as any)._args = args;
    
    // Rest of existing function implementation...
  };

  // Create appliedArgsMap to track argument values by parameter name
  const appliedArgsMap: Record<string, any> = {};
  
  // Attach metadata and methods
  const result = Object.assign(brandedFunc, {
    _originalFunction: func,
    _parameterInfo: paramInfo,
    _appliedNames: appliedParams,
    _appliedArgs: appliedArgsMap, // Add this
    
    // Existing methods...
    
    // Add the reApply method
    reApply: function<T extends object>(name: string, updater: (prev: T) => T): BrandedFunction<F> {
      if (!appliedParams.includes(name)) {
        throw new Error(`Cannot reapply parameter ${name} that hasn't been applied yet`);
      }
      
      const paramIndex = paramInfo.findIndex(p => p.name === name);
      if (paramIndex === -1) {
        throw new Error(`Parameter ${name} not found in function signature`);
      }
      
      // Create a deep clone of the current applied args
      const currentAppliedArgs = JSON.parse(JSON.stringify(this._appliedArgs || {}));
      
      // Get the previous value
      const prevValue = currentAppliedArgs[name] as T;
      if (typeof prevValue !== 'object' || prevValue === null) {
        throw new Error(`Parameter ${name} is not an object or is null`);
      }
      
      // Apply the updater function
      const newValue = updater(prevValue);
      
      // Create a new BrandedArg with the updated value
      const newArg = { 
        [BRAND_SYMBOL]: { 
          name, 
          value: newValue 
        } 
      } as BrandedArg;
      
      // Create a temporary array of arguments for the new function
      const tempArgs: BrandedArg[] = [];
      
      // Add arguments that were previously applied except the one we're updating
      for (const param of appliedParams) {
        if (param !== name && currentAppliedArgs[param] !== undefined) {
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
      const newFunc = createBrandedFunction(func, paramInfo, flattenAs, []);
      
      // Apply all the args to create a properly configured function
      return (newFunc as any)(...tempArgs);
    }
  });
  
  return result as BrandedFunction<F>;
}
```

## 3. Update the brandedFunc implementation to track applied arguments

Inside the `brandedFunc` function, after processing each branded argument, add code to update the `appliedArgsMap`:

```typescript
// Add this after the argument processing loop but before applying default values
for (let i = 0; i < args.length; i++) {
  if (args[i] !== undefined && i < paramInfo.length) {
    appliedArgsMap[paramInfo[i].name] = args[i];
  }
}
```

This will ensure the `_appliedArgs` property contains the current argument values keyed by parameter name.

## Complete Implementation Example

With these changes, the `reApply` method will be available on any `BrandedFunction` returned by `createNamedArguments`, allowing you to update previously applied object parameters without TypeScript errors.

This implementation provides:
1. Type-safe parameter updates
2. Proper merging of object properties
3. Consistent behavior with the rest of the named arguments API