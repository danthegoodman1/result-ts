# Result

Follows the Rust Result type: https://doc.rust-lang.org/std/result/enum.Result.html

Add the methods as you need them. Some of the standard Result methods are intentionally omitted (like `is_ok_and()` can just be `is_ok() && something`), because JS has a ternary operator (Rust doesn't).

It also includes a `.match` which is like Rust `match` but for the `Result`.

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
