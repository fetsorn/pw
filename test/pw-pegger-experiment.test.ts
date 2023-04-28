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
  ProxyCalibrateInput
} from "./pool"

import { OGXRouter02 } from "~/typechain/OGXRouter02"

async function getPrice(
  router: OGXRouter02,
  ogxtToken: string,
  quoteToken: string
): Promise<string> {
  const amountsIn = "10000"
  let [amountOGXT, amountQuote] = await router.getAmountsOut(amountsIn, [
    ogxtToken,
    quoteToken
  ])
  return amountOGXT.div(amountQuote).toString()
}

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
      symbol: "OGXT"
    },
    quote: {
      name: "simTSLA",
      symbol: "simTSLA"
    },
    deployer: vault,
    feeGetter: feeGetter.address,
    ...overrideProxyCalibrateInput
  })

  const config: PWPeggerConfig = {
    admin: deployer.address,
    keeper: keeper.address,
    calibratorProxy: proxyContext.calibratorProxy.address,
    vault: vault.address,
    pool: proxyContext.builtPoolResponse.pair.address,
    quoteToken: proxyContext.quoteToken.address,
    /*
      uint emergencyth - 50% (0.5 * 10^6)
      uint volatilityth - 3% (0.03 * 10^6)
      uint frontrunth - 2% (0.02 * 10^6);
    */
    // emergencyth: new Big(0.5).mul(1e6).toFixed(),
    emergencyth: new Big(0.000804).mul(1e6).toFixed(),
    // volatilityth: new Big(0.03).mul(1e6).toFixed(),
    volatilityth: new Big(0.000002).mul(1e6).toFixed(),
    // frontrunth: new Big(0.02).mul(1e6).toFixed(),
    frontrunth: new Big(0.000001).mul(1e6).toFixed(),
    decimals: 6
  }

  const pwpeggerResp = await pwpeggerFactory.deploy(config)
  const pwpegger = await pwpeggerResp.deployed()

  return {
    pwpegger,
    pwpeggerConfig: config,
    proxyContext
  }
}

describe("PW Pegger - Debugging Test", () => {
  it("Change price", async () => {
    const [, keeper, , vault] = await ethers.getSigners()

    // GTON Testnet
    const ogxtMint = "1003000200000000000000000"
    const ogxtPoolLiq = "416217800006693611757452"

    const simTSLAMint = "1000000000000000000000000"
    const simTSLAPoolLiq = "518549398534971632240"

    const context = await updateContext({
      mintOGXT: ogxtMint,
      mintQuote: simTSLAMint,
      liqOGXT: ogxtPoolLiq,
      liqQuote: simTSLAPoolLiq
    })

    // Utility Info
    const [calibratorBaseAddr, token0Addr] = await Promise.all([
      context.proxyContext.calibrator.base(),
      context.proxyContext.builtPoolResponse.pair.token0()
    ])

    const ogxtAddr = context.proxyContext.ogxtToken.address
    const simTSLAAddr = context.proxyContext.quoteToken.address

    const ogxtTokenIdx = ogxtAddr === token0Addr ? 0 : 1
    const simTSLATokenIdx = simTSLAAddr === token0Addr ? 0 : 1

    // console.log({
    //   label: "Init Data for Tokens",
    //   ogxtAddr,
    //   ogxtTokenIdx,
    //   simTSLAAddr,
    //   simTSLATokenIdx
    // })

    // console.log({
    //   label: "Start Liquidity",
    //   ogxtPoolLiq,
    //   simTSLAPoolLiq
    // })

    // console.log({
    //   label: "Base address from Calibrator",
    //   calibratorBaseAddr
    // })

    // At this point in time the price of simTSLA in OGXT is about 803
    // Test Cases
    // const TEST_CASES = [176.09, 180.54, 181.23, 180.31, 200.57, 160.75, 192.3]
    // const TEST_CASES = [810, 807, 811, 800]
    const TEST_CASES = [810, 803]

    for (let i = 0; i < TEST_CASES.length; i += 1) {
      const newPrice = TEST_CASES[i]
      console.log(
        (
          await getPrice(
            context.proxyContext.builtPoolResponse.router,
            context.proxyContext.ogxtToken.address,
            context.proxyContext.quoteToken.address
          )
        ).toString()
      )
      const [
        a,
        b
      ] = await context.proxyContext.builtPoolResponse.pair.getReserves()
      console.log(a.toString(), b.toString())

      // Approve for Vault
      await context.proxyContext.builtPoolResponse.pair
        .connect(vault)
        .approve(
          context.pwpegger.address,
          await context.proxyContext.builtPoolResponse.pair.balanceOf(
            vault.address
          )
        )

      // Data Before
      const reservesBefore = await context.proxyContext.calibrator.getReserves(
        context.proxyContext.builtPoolResponse.pair.address,
        context.proxyContext.ogxtToken.address,
        context.proxyContext.quoteToken.address
      )

      // Output - 1
      // console.log("\n\n", {
      //   label: "Raw Data - 1",
      //   reservesBeforeOGXT: reservesBefore[ogxtTokenIdx].toString(),
      //   reservesBeforeSimTSLA: reservesBefore[simTSLATokenIdx].toString()
      // })

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
        reservesBeforeOGXT: reservesBefore[ogxtTokenIdx].toString(),
        reservesBeforeSimTSLA: reservesBefore[simTSLATokenIdx].toString(),
        reservesAfterOGXT: reservesAfter[ogxtTokenIdx].toString(),
        reservesAfterSimTSLA: reservesAfter[simTSLATokenIdx].toString(),
        diffOGXT: reservesBefore[ogxtTokenIdx]
          .sub(reservesAfter[ogxtTokenIdx])
          .toString(),
        diffSimTSLA: reservesBefore[simTSLATokenIdx]
          .sub(reservesAfter[simTSLATokenIdx])
          .toString()
      })

      // console.log({
      //   label: "Human-readable Data - 2",
      //   diffOGXT: remove18Decimals(
      //     reservesBefore[ogxtTokenIdx]
      //       .sub(reservesAfter[ogxtTokenIdx])
      //       .toString()
      //   ),
      //   diffSimTSLA: remove18Decimals(
      //     reservesBefore[simTSLATokenIdx]
      //       .sub(reservesAfter[simTSLATokenIdx])
      //       .toString()
      //   )
      // })
      // console.log(
      //   "=======================\n=======================\n======================="
      // )
    }
  })
})
