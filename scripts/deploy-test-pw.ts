import { valueToDecimaled } from "../test/utils"
import { EACAggregatorProxyMock__factory } from "./../typechain/factories/EACAggregatorProxyMock__factory"
import { EACAggregatorProxy } from "./../typechain/EACAggregatorProxy.d"
import { EACAggregatorProxy__factory } from "./../typechain/factories/EACAggregatorProxy__factory"
import { CalibratorProxy } from "./../typechain/CalibratorProxy.d"
import { PWPegger } from "./../typechain/PWPegger.d"
import Big from "big.js"

import {
  prepareTokensAndPoolsForProxy,
  CalibrateDirection,
  ProxyCalibrateInput,
} from "../test/pool"
import { BigNumber } from "ethers"
import { ethers } from "hardhat"
import { Calibrator } from "~/typechain/Calibrator"
import { ERC20PresetFixedSupply } from "~/typechain/ERC20PresetFixedSupply"
import { QuickFactory } from "~/typechain/QuickFactory"
import { QuickPair } from "~/typechain/QuickPair"
import { QuickRouter01 } from "~/typechain/QuickRouter01"
import { PWPegger__factory } from "~/typechain/factories/PWPegger__factory"
import { PWPeggerConfig } from "../test/pegger"
import { EACAggregatorProxyMock } from "~/typechain/EACAggregatorProxyMock"

type Context = {
  pwpegger: PWPegger
  pwpeggerConfig: PWPeggerConfig
  pwpegdonRef: EACAggregatorProxyMock
  proxyContext: {
    calibratorProxy: CalibratorProxy
    calibrator: Calibrator
    builtPoolResponse: {
      pair: QuickPair
      factory: QuickFactory
      router: QuickRouter01
      lpOwnerHoldings: BigNumber
    }
    baseToken: ERC20PresetFixedSupply
    quoteToken: ERC20PresetFixedSupply
  }
}
let context: Context

const updateContext = async (
  {
    overrideProxyCalibrateInput,
    overridePWPeggerConfig,
  }: {
    overrideProxyCalibrateInput?: Partial<ProxyCalibrateInput>
    overridePWPeggerConfig?: Partial<PWPeggerConfig>
  } = {
    overrideProxyCalibrateInput: {},
    overridePWPeggerConfig: {},
  }
) => {
  const pwpeggerFactory = (await ethers.getContractFactory(
    "PWPegger"
  )) as PWPegger__factory
  const eacAggrProxyFactory = (await ethers.getContractFactory(
    "EACAggregatorProxyMock"
  )) as EACAggregatorProxyMock__factory

  const [deployer, keeper, pwpegdonRef_admin, vault, feegetter] =
    await ethers.getSigners()

  const proxyContext = await prepareTokensAndPoolsForProxy({
    direction: CalibrateDirection.Up,
    mintA: new Big(1_000_000_000).mul(1e18).toFixed(),
    mintB: new Big(1_000_000_000).mul(1e18).toFixed(),
    // Imitating Fantom
    liqA: new Big(100_000).mul(1e18).toFixed(),
    liqB: new Big(200_000).mul(1e18).toFixed(),
    base: {
      name: "Graviton",
      symbol: "GTON",
    },
    quote: {
      name: "USD Coin",
      symbol: "USDC",
    },
    deployer: vault,
    feeGetter: feegetter.address,
    ...overrideProxyCalibrateInput,
  })

  const pwpegdonRef = await eacAggrProxyFactory
    .connect(pwpegdonRef_admin)
    .deploy(pwpegdonRef_admin.address, 6)

  const config: PWPeggerConfig = {
    // admin: string
    admin: deployer.address,
    // keeper: string
    keeper: keeper.address,
    // pwpegdonRef: string
    pwpegdonRef: pwpegdonRef.address,
    // calibrator: string
    calibrator: proxyContext.calibratorProxy.address,
    // vault: string
    vault: vault.address,
    // pool: string
    pool: proxyContext.builtPoolResponse.pair.address,
    // token: string
    token: proxyContext.baseToken.address,
    /*
        uint emergencyth - 10% (0.1 * 10^6)
        uint volatilityth - 3% (0.03 * 10^6)
        uint frontrunth - 2% (0.02 * 10^6);
      */
    // emergencyth: BigNumberish
    emergencyth: new Big(0.1).mul(1e6).toFixed(),
    // volatilityth: BigNumberish
    volatilityth: new Big(0.03).mul(1e6).toFixed(),
    // frontrunth: BigNumberish
    frontrunth: new Big(0.02).mul(1e6).toFixed(),
    // decimals: BigNumberish
    decimals: 6,
    ...overridePWPeggerConfig,
  }

  const pwpeggerResp = await pwpeggerFactory.deploy(config)
  const pwpegger = await pwpeggerResp.deployed()

  return {
    pwpegger,
    pwpeggerConfig: config,
    proxyContext,
    pwpegdonRef,
  }
}

// beforeEach(async () => {
//   context = await updateContext()
// })

const priceToPWPegRepr = (price: number, dec = 6): string => {
  const str = valueToDecimaled(price, dec)
  return str.slice(0, str.indexOf("."))
}

const checkDiff = (a: number, b: number): number => {
  const max = Math.max(a, b)
  const min = Math.min(a, b)
  return min / max
}

async function main() {
  const [deployer, keeper, pwpegdonRef_admin, vault] = await ethers.getSigners()

  const innerContext = {
    pwPegPrices: [2.15, 2.1, 2, 1.95, 1.9],
  }

  //
  // I. Imitate current pool price 1.5
  //
  context = await updateContext({
    overrideProxyCalibrateInput: {
      liqA: new Big(100_000).mul(1e18).toFixed(),
      liqB: new Big(150_000).mul(1e18).toFixed(),
    },
    overridePWPeggerConfig: {
      emergencyth: new Big(3).mul(1e9).toFixed(),
      volatilityth: new Big(2).mul(1e9).toFixed(),
      frontrunth: new Big(1).mul(1e9).toFixed(),
    },
  })

  // console.log({ mockPrice: priceToPWPegRepr(innerContext.pwPegPrice) })
  //
  // II. Push peg price to EAC
  //

  for (const pwPegPrice of innerContext.pwPegPrices) {
    await context.pwpegdonRef
      .connect(pwpegdonRef_admin)
      .mockUpdatePrice(priceToPWPegRepr(pwPegPrice, 6 + 1))

    //
    // III. Call intervention from keeper
    //

    // give approve from vault
    await context.proxyContext.builtPoolResponse.pair
      .connect(vault)
      .approve(
        context.pwpegger.address,
        await context.proxyContext.builtPoolResponse.pair.balanceOf(
          vault.address
        )
      )

    const poolReserves_before =
      await context.proxyContext.builtPoolResponse.pair.getReserves()

    const LPs_supplyBefore =
      await context.proxyContext.builtPoolResponse.pair.totalSupply()

    await context.pwpegger
      .connect(keeper)
      .callIntervention(priceToPWPegRepr(pwPegPrice))

    const LPs_supplyAfter =
      await context.proxyContext.builtPoolResponse.pair.totalSupply()

    const poolReserves =
      await context.proxyContext.builtPoolResponse.pair.getReserves()

    const price_before =
      new Big(poolReserves_before[0].toString()).div(1e18).toNumber() /
      new Big(poolReserves_before[1].toString()).div(1e18).toNumber()

    const price_after =
      new Big(poolReserves[0].toString()).div(1e18).toNumber() /
      new Big(poolReserves[1].toString()).div(1e18).toNumber()

    console.log({
      tag: "resultsAfter",

      r0_before: new Big(poolReserves_before[0].toString())
        .div(1e18)
        .toNumber(),
      r1_before: new Big(poolReserves_before[1].toString())
        .div(1e18)
        .toNumber(),
      r0_after: new Big(poolReserves[0].toString()).div(1e18).toNumber(),
      r1_after: new Big(poolReserves[1].toString()).div(1e18).toNumber(),
      LPs_supplyBefore: new Big(LPs_supplyBefore.toString())
        .div(1e18)
        .toNumber(),
      LPs_supplyAfter: new Big(LPs_supplyAfter.toString()).div(1e18).toNumber(),

      price_peg: pwPegPrice,
      price_before,
      price_after,
      price_accuracy_with_peg: checkDiff(price_after, pwPegPrice),
      price_accuracy_with_peg_f: `${checkDiff(price_after, pwPegPrice) * 100}%`,
    })
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
