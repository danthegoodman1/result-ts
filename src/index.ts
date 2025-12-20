/**
 * A type that represents either success (`Ok`) or failure (`Err`).
 * This is a TypeScript implementation of Rust's `Result` enum.
 *
 * See: https://doc.rust-lang.org/std/result/enum.Result.html
 */

/**
 * The location where an error was created.
 */
export interface CallSite {
  file: string
  line: number
  functionName?: string
}

interface OkResult<O> {
  readonly isOk: true
  readonly isErr: false
  readonly Ok: O
  readonly Err: undefined
}

interface ErrResult<E> {
  readonly isOk: false
  readonly isErr: true
  readonly Ok: undefined
  readonly Err: E
  readonly _trace: CallSite[]
}

/**
 * A type that represents either success (`Ok`) or failure (`Err`).
 * `Result<O, E>` is a discriminated union of `OkResult<O>` and `ErrResult<E>`.
 * This is a TypeScript implementation of Rust's `Result` enum.
 *
 * @see {@link Ok}
 * @see {@link Err}
 */
export type Result<O = void, E = Error> = OkResult<O> | ErrResult<E>

/**
 * Creates a new `Ok` result.
 * @param value The value to wrap in the result.
 */
export function Ok<E = never>(): Result<void, E>
export function Ok<S, E = never>(value: S): Result<S, E>
export function Ok<S, E = never>(value?: S): Result<S | void, E> {
  return {
    isOk: true,
    isErr: false,
    Ok: arguments.length === 0 ? undefined : value,
    Err: undefined,
  } as Result<S | void, E>
}

function getCallSite(): CallSite | undefined {
  const err = new Error()

  if (!err.stack) {
    return undefined
  }

  const stackLines = err.stack.split("\n")
  // The first line is "Error", the second is this function, the third is the caller (e.g., Err), and the fourth is the one we want.
  if (stackLines.length < 4) {
    return undefined
  }

  const callerLine = stackLines[3]

  // Try to parse V8-style stack trace line: " at functionName (path/to/file.ts:123:45)"
  let match = callerLine.match(/^\s*at\s+(.+?)\s+\((.*?):(\d+):\d+\)$/)
  if (match) {
    return {
      functionName: match[1] === "<anonymous>" ? undefined : match[1],
      file: match[2],
      line: parseInt(match[3], 10),
    }
  }

  // Try to parse Firefox/Safari-style stack trace line: "functionName@path/to/file.ts:123:45"
  match = callerLine.match(/^(.+?)@(.*?):(\d+):\d+$/)
  if (match) {
    return {
      functionName: match[1] || undefined,
      file: match[2],
      line: parseInt(match[3], 10),
    }
  }

  // Fallback: try to parse V8-style without function name: " at (path/to/file.ts:123:45)"
  match = callerLine.match(/^\s*at\s+\((.*?):(\d+):\d+\)$/)
  if (match) {
    return {
      functionName: undefined,
      file: match[1],
      line: parseInt(match[2], 10),
    }
  }

  // Handle V8-style top-level execution: " at path/to/file.ts:123:45"
  match = callerLine.match(/^\s*at\s+(.*?):(\d+):\d+$/)
  if (match) {
    return {
      functionName: undefined,
      file: match[1],
      line: parseInt(match[2], 10),
    }
  }

  return undefined
}

function isErrResult<E>(value: unknown): value is ErrResult<E> {
  return (
    typeof value === "object" &&
    value !== null &&
    "isErr" in value &&
    (value as ErrResult<E>).isErr === true
  )
}

/**
 * Creates a new `Err` result.
 * @param error The error to wrap in the result.
 */
export function Err<E, S = never>(error: E | ErrResult<E>): Result<S, E> {
  const newCallSite = getCallSite()
  let resultTrace = newCallSite ? [newCallSite] : []

  if (isErrResult<E>(error)) {
    resultTrace = [...error._trace, ...resultTrace]
    error = error.Err
  }

  if (
    error &&
    typeof error === "object" &&
    "cause" in error &&
    (error as { cause?: unknown }).cause
  ) {
    const cause = (error as { cause: unknown }).cause
    if (isErrResult(cause)) {
      const previousTrace = cause._trace
      resultTrace = newCallSite ? [newCallSite, ...previousTrace] : previousTrace
    }
  }

  return {
    isOk: false,
    isErr: true,
    Ok: undefined,
    Err: error,
    _trace: resultTrace,
  }
}

/**
 * Returns the contained Ok value, or throws if the result is an Err.
 */
export function unwrap<O>(result: Result<O, unknown>): O {
  if (result.isOk) {
    return result.Ok
  }
  throw new Error("Called `unwrap()` on an `Err` value")
}

/**
 * Returns the contained Err value, or throws if the result is an Ok.
 */
export function unwrapErr<E>(result: Result<unknown, E>): E {
  if (result.isErr) {
    return result.Err
  }
  throw new Error("Called `unwrapErr()` on an `Ok` value")
}

/**
 * Returns the trace of call sites for this error (original error to current caller).
 * Returns an empty array if the result is Ok.
 */
export function trace(result: Result<unknown, unknown>): CallSite[] {
  if (result.isErr) {
    return result._trace
  }
  return []
}

/**
 * Pattern matches on the Result, calling the appropriate handler.
 */
export function match<O, E, T>(
  result: Result<O, E>,
  handlers: { Ok: (value: O) => T; Err: (error: E) => T }
): T {
  if (result.isOk) {
    return handlers.Ok(result.Ok)
  }
  return handlers.Err(result.Err)
}

/**
 * Wraps a function in a try/catch block and returns a Result.
 *
 * @param fn - The function to wrap.
 * @returns A Result with the value of the function if it succeeds, or the error if it fails.
 */
export function Throwable<S, E = Error>(fn: () => S): Result<S, E> {
  try {
    return Ok(fn())
  } catch (error) {
    return Err(error as E)
  }
}

/**
 * Wraps an async function in a try/catch block and returns a Promise of a Result.
 *
 * @param fn - The async function to wrap.
 * @returns A Promise of a Result with the value of the function if it succeeds, or the error if it fails.
 */
export function AsyncThrowable<S, E = Error>(
  fn: () => Promise<S>
): Promise<Result<S, E>> {
  return fn()
    .then((value: S) => Ok(value))
    .catch((error: E) => Err(error))
}
