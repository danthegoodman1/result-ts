import { describe, it, expect } from "vitest"
import { Ok, Err, type Result, match, trace, map, mapErr } from "./index.js"

describe("Result", () => {
  it("should chain errors", () => {
    function myfunc(): Result<number, Error> {
      return Ok(1)
    }

    const res = myfunc()
    if (res.isOk) {
      // Proper Ok type inference
      const val = res.Ok
    } else {
      // This now correctly discriminates to the error type
      const err = res.Err
    }

    const matched = match(res, {
      Ok: (value) => value,
      Err: (_error) => -1,
    })

    function inner(): Result<string, Error> {
      return Err(new Error("inner failure"))
    }

    function outer(): Result<number, Error> {
      const innerResult = inner()
      if (innerResult.isErr) {
        return Err(innerResult)
      }
      return Ok(123)
    }

    const chainedResult = outer()
    if (chainedResult.isErr) {
      const layer1 = Err(chainedResult)
      if (layer1.isOk) {
        throw new Error("Expected Err, got Ok")
      }
      const errorTrace = trace(layer1)
      console.log("Error:", layer1.Err.message)
      console.log("Trace:", errorTrace)
    }

    /////// Expected output: ///////
    //
    // Error: inner failure
    // Trace: [
    //   {
    //     functionName: 'inner',
    //     file: '/Users/dangoodman/code/result-ts/src/index.test.ts',
    //     line: 25
    //   },
    //   {
    //     functionName: 'outer',
    //     file: '/Users/dangoodman/code/result-ts/src/index.test.ts',
    //     line: 31
    //   },
    //   {
    //     functionName: undefined,
    //     file: '/Users/dangoodman/code/result-ts/src/index.test.ts',
    //     line: 38
    //   }
    // ]
  })

  it("should be JSON serializable", () => {
    const okResult = Ok(42)
    const errResult = Err(new Error("test error"))

    const okJson = JSON.stringify(okResult)
    const errJson = JSON.stringify(errResult)

    expect(JSON.parse(okJson)).toEqual({
      isOk: true,
      isErr: false,
      Ok: 42,
      Err: undefined,
    })

    const parsedErr = JSON.parse(errJson)
    expect(parsedErr.isOk).toBe(false)
    expect(parsedErr.isErr).toBe(true)
    expect(parsedErr.Ok).toBeUndefined()
    expect(parsedErr.Err).toBeDefined()
    expect(parsedErr._trace).toBeInstanceOf(Array)
  })

  it("should preserve and extend error chain across serialization", () => {
    interface AppError {
      code: string
      message: string
    }

    function serviceA(): Result<string, AppError> {
      return Err({ code: "SERVICE_A_ERROR", message: "Something went wrong in A" })
    }

    function serviceB(): Result<number, AppError> {
      const result = serviceA()
      if (result.isErr) {
        return Err(result)
      }
      return Ok(42)
    }

    const originalResult = serviceB()
    expect(originalResult.isErr).toBe(true)
    if (!originalResult.isErr) return

    const originalTrace = trace(originalResult)
    expect(originalTrace.length).toBe(2)

    // Simulate sending over the wire
    const serialized = JSON.stringify(originalResult)
    const deserialized = JSON.parse(serialized) as typeof originalResult

    // Verify structure is preserved
    expect(deserialized.isErr).toBe(true)
    expect(deserialized.Err).toEqual({ code: "SERVICE_A_ERROR", message: "Something went wrong in A" })
    expect(deserialized._trace).toEqual(originalTrace)

    // Continue the chain on the receiving side
    function handleRemoteError(): Result<string, AppError> {
      return Err(deserialized)
    }

    const continuedResult = handleRemoteError()
    expect(continuedResult.isErr).toBe(true)
    if (!continuedResult.isErr) return

    const continuedTrace = trace(continuedResult)
    console.log("Continued trace:", continuedTrace)

    // Should have original 2 call sites + 1 new one from handleRemoteError
    expect(continuedTrace.length).toBe(3)
    expect(continuedTrace[0]).toEqual(originalTrace[0])
    expect(continuedTrace[1]).toEqual(originalTrace[1])
    expect(continuedTrace[2].functionName).toBe("handleRemoteError")

    // Error value should be preserved
    expect(continuedResult.Err).toEqual({ code: "SERVICE_A_ERROR", message: "Something went wrong in A" })
  })

  it("map transforms Ok value", () => {
    const ok = Ok(5)
    const mapped = map(ok, (x) => Ok(x * 2))
    expect(mapped.isOk && mapped.Ok).toBe(10)

    const err = Err<Error, number>(new Error("fail"))
    const mappedErr = map(err, (x) => Ok(x * 2))
    expect(mappedErr.isErr).toBe(true)
  })

  it("mapErr transforms Err value", () => {
    const err = Err<string, number>("original error")
    const mapped = mapErr(err, () => Ok(42))
    expect(mapped.isOk && mapped.Ok).toBe(42)

    const ok = Ok<number, string>(5)
    const mappedOk = mapErr(ok, () => Err("new error"))
    expect(mappedOk.isOk && mappedOk.Ok).toBe(5)
  })
})
