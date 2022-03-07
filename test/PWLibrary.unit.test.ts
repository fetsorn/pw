import { valueToDecimaled } from './utils';
import { PWLibraryMock__factory } from "./../typechain/factories/PWLibraryMock__factory"
import { PWLibraryMock } from "./../typechain/PWLibraryMock.d"
import { assert } from "chai"
import { BigNumberish } from "ethers"
import { ethers } from "hardhat"

import Big from "big.js"

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
      //g and pRatio must be same decimaled (d), LPs - any decimals
      // //interv up 1 - p1/p2 or p1/p2 - 1 inerv down
      testCases: [
        {
          input: { // UP (+25%)
            g: 100000000, //10 in 6 decimals
            pRatio: 200000, // p1 = 2 p2 = 2.5 => 1 - 2/2.5 = 0.2 => 0.2*10^6 = 200k
            LPs: 100000, //any decimals let's set 3 decimal and 100 LPs
            d: 6,
          },
          output: "10000", //10 lps to out
        },
        {
          input: { // DOWN (-20%)
            g: 100000000, //10 in 6 decimals
            pRatio: 250000, // p1 = 2 p2 = 1.6 => 2/1.5 - 1 = 0.25 => 0.25*10^6 = 250k
            LPs: 100000, //any decimals let's set 3 decimal and 100 LPs
            d: 6,
          },
          output: "12500", //12.5 lps to out
        }
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
            n:  new Big(1).mul(1e6).toFixed(),
            p1: new Big(2).mul(1e6).toFixed(),
            p2: new Big(2.5).mul(1e6).toFixed(),
          },
          output: "200000",
        },
        {
          input: {
            n: new Big(1).mul(1e6).toFixed(),
            p1: new Big(2).mul(1e6).toFixed(),
            p2: new Big(1.6).mul(1e6).toFixed(),
          },
          output: "250000",
        },
      ],
      validate: (x: TestCase<Input, Output>, got: Output) => {
        assert.equal(x.output, got, "expected output must match got values")
      },
    }

    for (const testcase of testContext.testCases) {
      const { input } = testcase
      const gotOutput = await pwlibrary.computePRatio(
        input.n,
        input.p1,
        input.p2,
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
            p1: valueToDecimaled(10000, 18),
            pG2: valueToDecimaled(123123, 18),
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

    // for (const testcase of testContext.testCases) {
    //   const { input } = testcase
    //   const gotOutput = await pwlibrary.computeXLPForDirection(
    //     input.g,
    //     input.u,
    //     input.p1,
    //     input.pG2,
    //     input.action,
    //     input.lpSupply,
    //     input.decimals
    //   )

    //   testContext.validate(testcase, gotOutput)
    // }
  })
})
