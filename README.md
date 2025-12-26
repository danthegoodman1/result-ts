# result-ts

Rust-style Result types in TypeScript. JSON-serializable with automatic error chain tracing.

Follows the Rust Result type: https://doc.rust-lang.org/std/result/enum.Result.html

```
npm i @danthegoodman/result-ts
```

```ts
import { Ok, Err, Throwable, match, trace, tryUnwrap, isResult, type Result } from '@danthegoodman/result-ts'

// Basic usage
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("Cannot divide by zero")
  }
  return Ok(a / b)
}

const result = divide(10, 2)
if (result.isOk) {
  console.log("Result:", result.Ok) // Result: 5
} else {
  console.log("Error:", result.Err)
}

// Using Throwable with JSON.parse
const parseJSON = (json: string): Result<any, Error> =>
  Throwable(() => JSON.parse(json))

const validJson = parseJSON('{"name": "Alice"}')
const invalidJson = parseJSON('invalid json')

match(validJson, {
  Ok: (data) => console.log("Parsed:", data), // Parsed: { name: "Alice" }
  Err: (error) => console.log("Parse error:", error.message)
})

match(invalidJson, {
  Ok: (data) => console.log("Parsed:", data),
  Err: (error) => console.log("Parse error:", error.message) // Parse error: Unexpected token 'i'...
})
```

## JSON Serialization

Result objects are plain JavaScript objects, making them fully JSON-serializable:

```ts
const result = Err({ code: "NOT_FOUND", message: "User not found" })

// Serialize and send over the wire
const json = JSON.stringify(result)

// Deserialize on the receiving end
const parsed = JSON.parse(json)

// Continue the error chain
if (parsed.isErr) {
  return Err(parsed) // Trace is preserved and extended
}
```

## Automatic error chaining

Result will automatically build Err chains when you call `Err()`. Use `trace()` to get the call stack:

```ts
function inner(): Result<string> {
  return Err(new Error("inner failure"))
}

function outer(): Result<number> {
  const result = inner()
  if (result.isErr) {
    return Err(result)
  }
  return Ok(123)
}

const result = outer()
if (result.isErr) {
  console.log("Error:", result.Err.message)
  console.log("Trace:", trace(result))
}
```

Output:

```
Error: inner failure
Trace: [
  { functionName: 'inner', file: '...', line: 25 },
  { functionName: 'outer', file: '...', line: 31 }
]
```

To propagate errors up the stack (like Rust's `?` operator), wrap the Result in `Err()`:

```ts
if (someResult.isErr) {
  return Err(someResult)
}
```

## The `?` Operator Pattern

Use `tryUnwrap` to mimic Rust's `?` operator. It returns the Ok value or throws the Err value:

```ts
function processData(): Result<Output, Error> {
  try {
    const a = tryUnwrap(stepOne())   // throws if Err
    const b = tryUnwrap(stepTwo(a))  // throws if Err
    return Ok(transform(b))
  } catch (err) {
    return Err(err as Error)
  }
}
```

## API

### Factory Functions

- `Ok(value)` - Create a successful result
- `Err(error)` - Create an error result (also accepts another `ErrResult` to chain)
- `Throwable(fn)` - Wrap a function that may throw in a Result
- `AsyncThrowable(fn)` - Wrap an async function that may throw in a Promise<Result>

### Utility Functions

- `unwrap(result)` - Get the Ok value or throw an error
- `tryUnwrap(result)` - Get the Ok value or throw the Err value (like Rust's `?`)
- `unwrapErr(result)` - Get the Err value or throw an error
- `tryUnwrapErr(result)` - Get the Err value or throw the Ok value
- `match(result, { Ok, Err })` - Pattern match on the result
- `map(result, fn)` - Transform the Ok value with a function returning Result
- `mapErr(result, fn)` - Transform the Err value with a function returning Result
- `trace(result)` - Get the call site trace for an error
- `isResult(value)` - Type guard to check if a value is a Result
