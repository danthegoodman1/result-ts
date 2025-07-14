import { describe, it, expect } from "vitest"
import { Ok, Err, type Result } from "./index.js"

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

    const matched = res.match({
      Ok: (value) => value,
      Err: (_error) => -1,
    })

    function inner(): Result<string> {
      return Err(new Error("inner failure"))
    }

    function outer(): Result<number> {
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
      const trace = layer1.trace()
      console.log("Error:", layer1.Err.message)
      console.log("Trace:", trace)
    }

    /////// Expected output: ///////
    //
    // Error: inner failure
    // Trace: [
    //   {
    //     functionName: 'inner',
    //     file: '/Users/dangoodman/tangiaCode/SeniorCare/webapp/src/packages/result/index.test.ts',
    //     line: 25
    //   },
    //   {
    //     functionName: 'outer',
    //     file: '/Users/dangoodman/tangiaCode/SeniorCare/webapp/src/packages/result/index.test.ts',
    //     line: 31
    //   },
    //   {
    //     functionName: undefined,
    //     file: '/Users/dangoodman/tangiaCode/SeniorCare/webapp/src/packages/result/index.test.ts',
    //     line: 38
    //   }
    // ]
  })
})
