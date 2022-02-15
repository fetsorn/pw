import { PWLibraryMock__factory } from "./../typechain/factories/PWLibraryMock__factory"
import { PWLibraryMock } from "./../typechain/PWLibraryMock.d"
import Big from "big.js"
import { expect, assert } from "chai"
import { BigNumberish } from "ethers"
import { ethers, waffle } from "hardhat"

import { preparePWPeggerEnvironment, PWPeggerConfig } from "./pegger"
import { valueToDecimaled } from "./utils"
import { TestCase, TestCaseValidator, TestContext } from "./unit"

import { ERC20PresetFixedSupply__factory } from "~/typechain/factories/ERC20PresetFixedSupply__factory"


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

  it("test computeXLP function", async () => {
    const context = await deploy()
    const { pwlibrary } = context

    // uint _g, uint _pRatio, uint _lps, uint decimals
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
        // console.log({ x, got })
        assert.equal(x.output, got, "expected output must match got values")
      },
    }

    for (const testcase of testContext.testCases) {
      const { input, output } = testcase
      const gotOutput = await pwlibrary.computeXLP(
        input.g,
        input.pRatio,
        input.LPs,
        input.d
      )

      testContext.validate(testcase, gotOutput)
    }
  })

  it("test computeXLPForDirection function", async () => {

  })

  it("test computePRatio function", async () => {})
})
