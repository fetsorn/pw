// Note: It's a copy-paste from "PWPegger.behaviour.test.ts" for debugging
import Big from "big.js"
import BigNumber from "bignumber.js"
import { ethers } from "hardhat"

import { PWPegger } from "~/typechain"
import { PWPegger__factory } from "~/typechain/factories/PWPegger__factory"

import { PWPeggerConfig } from "./pegger"
import {
  prepareTokensAndPoolsForProxy,
  CalibrateDirection,
  ProxyCalibrateInput,
} from "./pool"

const remove18Decimals = (val: string): string => {
  const gtonDecimals = 18

  return new BigNumber(val).dividedBy(10 ** gtonDecimals).toString()
}

const interventionPriceWithDecimals = (newUSDPrice: number): string => {
  const pwDecimals = 6

  return new BigNumber(newUSDPrice).multipliedBy(10 ** pwDecimals).toString()
}

const updateContext = async (
  overrideProxyCalibrateInput: Partial<ProxyCalibrateInput>
) => {
  const [deployer, keeper, , vault, feeGetter] = await ethers.getSigners()

  const pwpeggerFactory = (await ethers.getContractFactory(
    "PWPegger"
  )) as PWPegger__factory

  const proxyContext = await prepareTokensAndPoolsForProxy({
    direction: CalibrateDirection.Up,
    mintOGXT: new Big(1_000_000_000).mul(1e18).toFixed(),
    mintQuote: new Big(1_000_000_000).mul(1e18).toFixed(),
    liqOGXT: new Big(100_000).mul(1e18).toFixed(),
    liqQuote: new Big(200_000).mul(1e18).toFixed(),
    base: {
      name: "OGXT",
      symbol: "OGXT",
    },
    quote: {
      name: "simTSLA",
      symbol: "simTSLA",
    },
    deployer: vault,
    feeGetter: feeGetter.address,
    ...overrideProxyCalibrateInput,
  })

  const config: PWPeggerConfig = {
    admin: deployer.address,
    keeper: keeper.address,
    calibrator: proxyContext.calibratorProxy.address,
    vault: vault.address,
    pool: proxyContext.builtPoolResponse.pair.address,
    token: proxyContext.ogxtToken.address,
    /*
	  uint emergencyth - 50% (0.5 * 10^6)
	  uint volatilityth - 3% (0.03 * 10^6)
	  uint frontrunth - 2% (0.02 * 10^6);
	*/
    // emergencyth: new Big(0.5).mul(1e6).toFixed(),
    // emergencyth: new Big(0.000003).mul(1e6).toFixed(),
    emergencyth: new Big(0.000804).mul(1e6).toFixed(),
    // volatilityth: new Big(0.03).mul(1e6).toFixed(),
    volatilityth: new Big(0.000002).mul(1e6).toFixed(),
    // frontrunth: new Big(0.02).mul(1e6).toFixed(),
    frontrunth: new Big(0.000001).mul(1e6).toFixed(),
    decimals: 6,
  }

  const pwpeggerResp = await pwpeggerFactory.deploy(config)
  const pwpegger = await pwpeggerResp.deployed()

  return {
    pwpegger,
    pwpeggerConfig: config,
    proxyContext,
  }
}

describe("PW Pegger - Debugging Test", () => {
  it("Change price", async () => {
    const [, keeper, , vault] = await ethers.getSigners()

    // GTON Testnet
    // A (base) = simTSLA, B (quote) = OGXT
    const context = await updateContext({
      mintOGXT: "1000000000000000000000000",
      mintQuote: "1000000000000000000000000",
      liqOGXT: "416217800006693611757452",
      liqQuote: "518549398534971632240",
    })

    // Approve for Vault
    await context.proxyContext.builtPoolResponse.pair
      .connect(vault)
      .approve(
        context.pwpegger.address,
        await context.proxyContext.builtPoolResponse.pair.balanceOf(
          vault.address
        )
      )

    // Test Cases
    const TEST_CASES = [176.09, 180.54, 181.23]//, 180.31, 200.57, 160.75, 192.3];
    // const TEST_CASES = [176.09]

    for (let i = 0; i < TEST_CASES.length; i += 1) {
      const newPrice = TEST_CASES[i]

      // Data Before
      const reservesBefore = await context.proxyContext.calibrator.getReserves(
        context.proxyContext.builtPoolResponse.pair.address,
        context.proxyContext.ogxtToken.address,
        context.proxyContext.quoteToken.address
      )

      // Output - 1
      console.log("\n\n", {
        label: "Raw Data - 1",
        reservesBeforeOGXT: reservesBefore[0].toString(),
        reservesBeforeSimTSLA: reservesBefore[1].toString(),
      })

      // Update
      const newVal = interventionPriceWithDecimals(newPrice)

      await context.pwpegger.connect(keeper).callIntervention(newVal)

      // Data After
      const reservesAfter = await context.proxyContext.calibrator.getReserves(
        context.proxyContext.builtPoolResponse.pair.address,
        context.proxyContext.ogxtToken.address,
        context.proxyContext.quoteToken.address
      )

      // Output - 2
      console.log({
        label: "Raw Data - 2",
        reservesBeforeOGXT: reservesBefore[0].toString(),
        reservesBeforeSimTSLA: reservesBefore[1].toString(),
        reservesAfterOGXT: reservesAfter[0].toString(),
        reservesAfterSimTSLA: reservesAfter[1].toString(),
        diffOGXT: reservesBefore[0].sub(reservesAfter[0]).toString(),
        diffSimTSLA: reservesBefore[1].sub(reservesAfter[1]).toString(),
      })

      console.log({
        label: "Human-readable Data - 2",
        diffOGXT: remove18Decimals(reservesBefore[0].sub(reservesAfter[0]).toString()),
        diffSimTSLA: remove18Decimals(
          reservesBefore[1].sub(reservesAfter[1]).toString()
        ),
      })
    }
  })
})
