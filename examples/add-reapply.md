# Adding a reApply Method to Named Arguments

This guide shows how to add a `reApply` method to the `BrandedFunction` interface, which allows you to update object parameters that have already been applied in a partial application.

## The Problem

When using partial application with named arguments, once a parameter has been applied, you cannot apply it again. This can be limiting when working with complex objects where you want to incrementally build up the object in multiple steps.

For example, in this code:

```typescript
// Initial configuration with headers
const authClient = baseRequestClient.partial(
  args.requestOptions({
    headers: {
      contentType: 'application/json',
      accept: 'application/json',
      authorization: 'Bearer token123'
    }
  })
);

// This will fail because requestOptions has already been applied
const retryClient = authClient.partial(
  args.requestOptions({
    retries: {
      count: 3,
      delay: 1000
    },
    cache: false
  })
);
```

## The Solution: reApply Method

The `reApply` method allows you to update previously applied object parameters using an updater function:

```typescript
// Initial configuration with headers
const authClient = baseRequestClient.partial(
  args.requestOptions({
    headers: {
      contentType: 'application/json',
      accept: 'application/json',
      authorization: 'Bearer token123'
    }
  })
);

// Use reApply to update the requestOptions parameter
const retryClient = authClient.reApply('requestOptions', (prev) => ({
  ...prev,  // Keep all previous properties
  retries: {
    count: 3,
    delay: 1000
  },
  cache: false
}));
```

## Implementation Steps

1. Update the `BrandedFunction` interface to add the `reApply` method:

```typescript
export interface BrandedFunction<
  F extends (...args: any[]) => any,
  AppliedParams extends readonly string[] = []
> {
  // Existing methods...
  
  // Track applied arguments
  _appliedArgs: Record<string, any>;
  
  // New method to reapply/update an already applied parameter
  reApply<T extends object>(
    name: AppliedParams[number], 
    updater: (prev: T) => T
  ): BrandedFunction<F, AppliedParams>;
}
```

2. Modify the `createBrandedFunction` function to:
   - Track applied arguments values
   - Implement the reApply method

```typescript
function createBrandedFunction<F extends (...args: any[]) => any>(
  func: F,
  paramInfo: ParameterInfo[],
  flattenAs: Record<string, Record<string, string>> = {},
  appliedParams: string[] = []
): BrandedFunction<F> {
  // Existing implementation...
  
  // Store arguments by parameter name
  const appliedArgsMap: Record<string, any> = {};
  const args: any[] = new Array(paramInfo.length).fill(undefined);
  
  // Track arguments for each parameter
  const brandedFunc = function(this: any, ...brandedArgs: BrandedArg[]): any {
    // Process arguments...
    
    // Store the args array for later use in reApply
    (brandedFunc as any)._args = args;
    
    // Update appliedArgsMap with the final args
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== undefined && i < paramInfo.length) {
        appliedArgsMap[paramInfo[i].name] = args[i];
      }
    }
    
    // Rest of the implementation...
  };
  
  const result = Object.assign(brandedFunc, {
    _originalFunction: func,
    _parameterInfo: paramInfo,
    _appliedNames: appliedParams,
    _appliedArgs: appliedArgsMap,  // Store applied args
    
    // Existing methods...
    
    reApply: function<T extends object>(name: string, updater: (prev: T) => T): BrandedFunction<F> {
      if (!appliedParams.includes(name)) {
        throw new Error(`Cannot reapply parameter ${name} that hasn't been applied yet`);
      }
      
      const paramIndex = paramInfo.findIndex(p => p.name === name);
      if (paramIndex === -1) {
        throw new Error(`Parameter ${name} not found in function signature`);
      }
      
      // Get the previous value
      const prevValue = this._appliedArgs[name] as T;
      if (typeof prevValue !== 'object' || prevValue === null) {
        throw new Error(`Parameter ${name} is not an object or is null`);
      }
      
      // Apply the updater function
      const newValue = updater(prevValue);
      
      // Create a branded arg with the updated value
      const newArg = { 
        [BRAND_SYMBOL]: { 
          name, 
          value: newValue 
        } 
      } as BrandedArg;
      
      // Create a new function with the same params 
      const newFunc = createBrandedFunction(func, paramInfo, flattenAs, appliedParams);
      
      // Copy over all args except the one being updated
      const newArgs = [...(this._args || [])];
      newArgs[paramIndex] = newValue;
      
      // Store the updated args
      (newFunc as any)._args = newArgs;
      (newFunc as any)._appliedArgs = {
        ...this._appliedArgs,
        [name]: newValue
      };
      
      return newFunc;
    }
  });
  
  return result as BrandedFunction<F>;
}
```

## Usage Example

With this implementation, you can use the `reApply` method to incrementally build complex objects:

```typescript
const [args, namedRequest] = createNamedArguments(makeRequest);

// Create a partial with basic config
const baseClient = namedRequest.partial(
  args.method('POST'),
  args.config({
    headers: {
      contentType: 'application/json',
      accept: 'application/json'
    }
  })
);

// Use reApply to update the config with authentication
const authClient = baseClient.reApply('config', (prevConfig) => ({
  ...prevConfig,
  headers: {
    ...prevConfig.headers,
    authorization: 'Bearer token123'
  }
}));

// Add more properties with another reApply
const retryClient = authClient.reApply('config', (prevConfig) => ({
  ...prevConfig,
  retries: {
    count: 3,
    delay: 1000
  },
  cache: false
}));

// Final call with url and logOptions
const result = retryClient(
  args.url('https://api.example.com/data'),
  args.logOptions({
    level: 'debug',
    format: 'json'
  })
);
```

This enhancement allows for much more flexible use of named arguments with complex objects, without losing type safety.