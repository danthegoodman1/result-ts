# result-ts

Rust-style Result types in TypeScript

Follows the Rust Result type: https://doc.rust-lang.org/std/result/enum.Result.html

```
npm i @danthegoodman/result-ts
```

```ts
import { Ok, Err, Throwable, type Result } from '@danthegoodman/result-ts'

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

validJson.match({
  Ok: (data) => console.log("Parsed:", data), // Parsed: { name: "Alice" }
  Err: (error) => console.log("Parse error:", error.message)
})

invalidJson.match({
  Ok: (data) => console.log("Parsed:", data),
  Err: (error) => console.log("Parse error:", error.message) // Parse error: Unexpected token 'i'...
})
```

## Automatic error chaining

Result will automatically build Err chains when you call `Err()`

```
Error: inner failure
Trace: [
  {
    functionName: 'inner',
    file: '/Users/dangoodman/tangiaCode/SeniorCare/webapp/src/packages/result/index.test.ts',
    line: 25
  },
  {
    functionName: 'outer',
    file: '/Users/dangoodman/tangiaCode/SeniorCare/webapp/src/packages/result/index.test.ts',
    line: 31
  },
  {
    functionName: undefined,
    file: '/Users/dangoodman/tangiaCode/SeniorCare/webapp/src/packages/result/index.test.ts',
    line: 38
  }
]
```

So when you have an error, if you want to propagate it up (like rust `?`), wrap the `Result` in an `Err()`:

```ts
if (someResult.isErr) {
  return Err(someResult)
}
```
