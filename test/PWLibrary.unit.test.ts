import { PWLibraryMock__factory } from "./../typechain/factories/PWLibraryMock__factory"
import { PWLibraryMock } from "./../typechain/PWLibraryMock.d"
import { assert } from "chai"
import { BigNumberish } from "ethers"
import { ethers } from "hardhat"

import { TestCase, TestContext } from "./unit"

describe("PW Library unit tests", () => {
  type Context = {
    pwlibrary: PWLibraryMock
  }

  async function deploy(): Promise<Context> {
    const factory = (await ethers.getContractFactory(
      "PWLibraryMock"
    )) as PWLibraryMock__factory

    const pwlibrary = await factory.deploy()

    return { pwlibrary }
  }

  /**
   *
   * General note:
   *
   * 1. Output must be encoded if it's anything rather that number
   * 2. If output is uint you have to expect output value as string (overflow prevent)
   * 3. `validate` fn in test case context can check for any behaviour (events emit, dependent contracts state change, etc.)
   *
   */

  it("test computeXLP function", async () => {
    const context = await deploy()
    const { pwlibrary } = context
    // (uint _g, uint _pRatio, uint _lps, uint decimals): uint
    type Input = {
      g: BigNumberish
      pRatio: BigNumberish
      LPs: BigNumberish
      d: BigNumberish
    }
    type Output = BigNumberish
    const testContext: TestContext<Input, Output> = {
      testCases: [
        {
          input: {
            g: 100,
            pRatio: 15,
            LPs: 159,
            d: 18,
          },
          output: "1192",
        },
        {
          input: {
            g: 582,
            pRatio: 55,
            LPs: 8523,
            d: 18,
          },
          output: "234382",
        },
        {
          input: {
            g: 100,
            pRatio: 515,
            LPs: 352,
            d: 18,
          },
          output: "90640",
        },
      ],
      validate: (x: TestCase<Input, Output>, got: Output) => {
        assert.equal(x.output, got, "expected output must match got values")
      },
    }

    for (const testcase of testContext.testCases) {
      const { input } = testcase
      const gotOutput = await pwlibrary.computeXLP(
        input.g,
        input.pRatio,
        input.LPs,
        input.d
      )

      testContext.validate(testcase, gotOutput)
    }
  })

  it("test computePRatio function", async () => {
    const context = await deploy()
    const { pwlibrary } = context
    // (uint n, uint p1, uint p2): uint
    type Input = {
      n: BigNumberish
      p1: BigNumberish
      p2: BigNumberish
    }
    type Output = BigNumberish
    const testContext: TestContext<Input, Output> = {
      testCases: [
        {
          input: {
            p1: 10,
            p2: 15,
            n: 100,
          },
          output: "0",
        },
        {
          input: {
            p1: 100000,
            p2: 152855,
            n: 9995238,
          },
          output: "0",
        },
      ],
      validate: (x: TestCase<Input, Output>, got: Output) => {
        assert.equal(x.output, got, "expected output must match got values")
      },
    }

    for (const testcase of testContext.testCases) {
      const { input } = testcase
      const gotOutput = await pwlibrary.computePRatio(
        input.p1,
        input.p2,
        input.n
      )

      testContext.validate(testcase, gotOutput)
    }
  })

  it("test computeXLPForDirection function", async () => {
    const context = await deploy()
    const { pwlibrary } = context
    // (uint _g, uint _u, uint _p1, uint _pG2, EAction _type, uint _lpsupply, uint decimals): uint
    enum EAction {
      Up,
      Down,
    }
    type Input = {
      g: BigNumberish
      u: BigNumberish
      p1: BigNumberish
      pG2: BigNumberish
      action: EAction
      lpSupply: BigNumberish
      decimals: BigNumberish
    }
    type Output = BigNumberish
    const testContext: TestContext<Input, Output> = {
      testCases: [
        {
          input: {
            g: 1,
            u: 1,
            p1: 10000,
            pG2: 423544,
            action: EAction.Up,
            lpSupply: 1000000,
            decimals: 18,
          },
          output: "1192",
        },
      ],
      validate: (x: TestCase<Input, Output>, got: Output) => {
        assert.equal(x.output, got, "expected output must match got values")
      },
    }

    for (const testcase of testContext.testCases) {
      const { input } = testcase
      const gotOutput = await pwlibrary.computeXLPForDirection(
        input.g,
        input.u,
        input.p1,
        input.pG2,
        input.action,
        input.lpSupply,
        input.decimals
      )

      testContext.validate(testcase, gotOutput)
    }
  })
})
