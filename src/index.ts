/**
 * A type that represents either success (`Ok`) or failure (`Err`).
 * This is a TypeScript implementation of Rust's `Result` enum.
 *
 * See: https://doc.rust-lang.org/std/result/enum.Result.html
 */

class OkImpl<O, E> {
  readonly isOk = true as const
  readonly isErr = false as const
  readonly Ok: O
  readonly Err = undefined

  constructor(value: O) {
    this.Ok = value
  }

  /**
   * Returns the contained Ok value.
   */
  unwrap(): O {
    return this.Ok
  }

  /**
   * Throws an error because the value is an Ok.
   */
  unwrapErr(): E {
    throw new Error("Called `unwrapErr()` on an `Ok` value")
  }

  /**
   * Pattern matches on the `Ok` value.
   */
  match<T>(handlers: { Ok: (value: O) => T; Err: (error: E) => T }): T {
    return handlers.Ok(this.Ok)
  }
}

/**
 * The location where an error was created.
 */
export interface CallSite {
  file: string
  line: number
  functionName?: string
}

class ErrImpl<O, E> {
  readonly isOk = false as const
  readonly isErr = true as const
  readonly Ok = undefined
  readonly Err: E
  private readonly _trace: CallSite[]

  constructor(error: E, trace: CallSite[]) {
    this.Err = error
    this._trace = trace
  }

  /**
   * Throws an error because the value is an Err.
   */
  unwrap(): O {
    throw new Error("Called `unwrap()` on an `Err` value")
  }

  /**
   * Returns the contained Err value.
   */
  unwrapErr(): E {
    return this.Err
  }

  /**
   * Returns the trace of call sites for this error (original error to current caller)
   */
  trace(): CallSite[] {
    return this._trace
  }

  /**
   * Pattern matches on the `Err` value.
   */
  match<T>(handlers: { Ok: (value: O) => T; Err: (error: E) => T }): T {
    return handlers.Err(this.Err)
  }
}

/**
 * A type that represents either success (`Ok`) or failure (`Err`).
 * `Result<O, E>` is a union of two types, `OkImpl<O, E>` and `ErrImpl<O, E>`.
 * This is a TypeScript implementation of Rust's `Result` enum.
 *
 * @see {@link Ok}
 * @see {@link Err}
 */
export type Result<O = void, E = Error> = OkImpl<O, E> | ErrImpl<O, E>

/**
 * Creates a new `Ok` result.
 * @param value The value to wrap in the result.
 */
export function Ok<E = never>(): Result<void, E>
export function Ok<S, E = never>(value: S): Result<S, E>
export function Ok<S, E = never>(value?: S): Result<S | void, E> {
  return new OkImpl(arguments.length === 0 ? (undefined as any) : (value as S))
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

/**
 * Creates a new `Err` result.
 * @param error The error to wrap in the result.
 */
export function Err<E, S = never>(error: E | ErrImpl<any, E>): Result<S, E> {
  const newCallSite = getCallSite()
  let trace = newCallSite ? [newCallSite] : []

  if (error instanceof ErrImpl) {
    trace = [...error.trace(), ...trace]
    error = error.Err
  }

  if (
    error &&
    typeof error === "object" &&
    "cause" in error &&
    (error as any).cause
  ) {
    const cause = (error as any).cause
    if ((cause instanceof OkImpl || cause instanceof ErrImpl) && cause.isErr) {
      const previousTrace = (cause as any).trace ? (cause as any).trace() : []
      trace = newCallSite ? [newCallSite, ...previousTrace] : previousTrace
    }
  }

  return new ErrImpl(error, trace)
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
