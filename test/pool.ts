import Big from "big.js"
import { expect } from "chai"
import { ethers } from "hardhat"
import {
  BigNumber,
  BigNumberish,
  ContractTransaction,
  Overrides,
  Wallet,
} from "ethers"
import { ERC20PresetFixedSupply } from "~/typechain/ERC20PresetFixedSupply"
import { ERC20PresetFixedSupply__factory } from "~/typechain/factories/ERC20PresetFixedSupply__factory"
import { QuickFactory__factory } from "~/typechain/factories/QuickFactory__factory"
import { QuickRouter01__factory } from "~/typechain/factories/QuickRouter01__factory"
import { QuickPair } from "~/typechain/QuickPair"
import { WrappedNative } from "~/typechain/WrappedNative"

import { WrappedNative__factory } from "~/typechain/factories/WrappedNative__factory"
// import { deferDeterminePricePush } from "./swap"

export const mapValue = (x: BigNumberish) =>
  new Big(x.toString()).div(1e18).toNumber()

export const defaultUniDeadline = () => 9999999999999

export async function buildPool(
  wallet: any,
  other: any,
  weth: WrappedNative,
  baseToken: ERC20PresetFixedSupply,
  quoteToken: ERC20PresetFixedSupply,
  baseTokenLiq: BigNumber,
  quoteTokenLiq: BigNumber
) {
  const factoryFactory = (await ethers.getContractFactory(
    "QuickFactory"
  )) as QuickFactory__factory
  const factory = await factoryFactory.deploy(wallet.address)

  await factory.setFeeTo(other.address)

  const routerFactory = (await ethers.getContractFactory(
    "QuickRouter01"
  )) as QuickRouter01__factory
  const router = await routerFactory.deploy(factory.address, weth.address)

  const pairFactory = await ethers.getContractFactory("QuickPair")

  const createPairResult = await factory.createPair(
    baseToken.address,
    quoteToken.address
  )
  const pairAddress = await factory.getPair(
    baseToken.address,
    quoteToken.address
  )

  console.log({ pairAddress, createPairResult })

  const pair = pairFactory.attach(pairAddress) as QuickPair

  // let liquidityGTON = baseTokenLiq
  // let liquidityWETH = quoteTokenLiq
  await baseToken.approve(router.address, baseTokenLiq)
  await quoteToken.approve(router.address, quoteTokenLiq)

  let block = await wallet.provider.getBlock("latest")
  let timestamp = block.timestamp

  console.log("addliq", [
    baseToken.address,
    quoteToken.address,
    baseTokenLiq,
    quoteTokenLiq,
    1,
    1,
    wallet.address,
    timestamp + 3600,
  ])

  await router.addLiquidity(
    baseToken.address,
    quoteToken.address,
    baseTokenLiq,
    quoteTokenLiq,
    1,
    1,
    wallet.address,
    timestamp + 3600
  )

  // await expect(
  //   router.addLiquidity(
  //     baseToken.address,
  //     quoteToken.address,
  //     baseTokenLiq,
  //     quoteTokenLiq,
  //     1,
  //     1,
  //     wallet.address,
  //     timestamp + 3600
  //   )
  // )
  // .to.emit(pair, "Sync")
  // .withArgs(baseTokenLiq.toString(), quoteTokenLiq.toString())
  // .to.emit(pair, "Mint")
  // .withArgs(router.address, baseTokenLiq.toString(), quoteTokenLiq.toString())

  // expect(await pair.token1()).to.eq(baseToken.address)
  // expect(await pair.token0()).to.eq(quoteToken.address)

  const lpOwnerHoldings = await pair.balanceOf(wallet.address)

  return { pair, factory, router, lpOwnerHoldings }
}

export const deployTokenFixedSupply = async (
  name: string,
  symbol: string,
  initialSupply: BigNumberish,
  owner: string
): Promise<ERC20PresetFixedSupply> => {
  const tokenFactory = (await ethers.getContractFactory(
    "ERC20PresetFixedSupply"
  )) as ERC20PresetFixedSupply__factory

  const token = await tokenFactory.deploy(name, symbol, initialSupply, owner)

  return token
}

export type CalibrateToken = {
  name: string
  symbol: string
}
export type CalibrateInput = {
  mintA: string
  mintB: string
  liqA: string
  liqB: string
  base: CalibrateToken
  quote: CalibrateToken
  targetPrice: number

  // (x: Big) => x.div(10)
  removalFn: (x: Big) => Big
}

export enum CalibrateDirection {
  Up,
  Down,
}

export type ProxyCalibrateInput = {
  mintA: string
  mintB: string
  liqA: string
  liqB: string
  base: CalibrateToken
  quote: CalibrateToken
  direction: CalibrateDirection
  percentageOfLPs: { n: number; d: number } // 0 to 1
}


export async function prepareTokensAndPoolsForProxy(cfg: ProxyCalibrateInput) {
  const [wallet] = await ethers.getSigners()
  const other = wallet

  const gtonToken = await deployTokenFixedSupply(
    cfg.base.name,
    cfg.base.symbol,
    cfg.mintA,
    wallet.address
  )
  const usdcToken = await deployTokenFixedSupply(
    cfg.quote.name,
    cfg.quote.symbol,
    cfg.mintB,
    wallet.address
  )

  const wethFactory = (await ethers.getContractFactory(
    "WrappedNative"
  )) as WrappedNative__factory

  const weth = await wethFactory.deploy()

  const { router, pair, factory, lpOwnerHoldings } = await buildPool(
    wallet,
    other,
    weth,
    gtonToken,
    usdcToken,
    BigNumber.from(cfg.liqA),
    BigNumber.from(cfg.liqB)
  )

  const calibratorFactory = (await ethers.getContractFactory(
    "Calibrator"
  )) as Calibrator__factory

  const calibrator = await calibratorFactory.deploy(
    gtonToken.address,
    router.address,
    "QUICK"
  )

  const calibratorProxyFactory = (await ethers.getContractFactory(
    "CalibratorProxy"
  )) as CalibratorProxy__factory

  const calibratorProxy = await calibratorProxyFactory.deploy(
    calibrator.address,
    gtonToken.address
  )

  const removalCoeff = cfg.percentageOfLPs
  const lpTotalSupply = await pair.totalSupply()
  const kLast = await pair.kLast()

  console.log({ totalSupplyLp: lpTotalSupply.toString() })
  console.log({ lpOwnerHoldings: lpOwnerHoldings.toString() })

  const liqudityToRemove = lpOwnerHoldings
    .mul(removalCoeff.n)
    .div(removalCoeff.d)

  console.log({ liqudityToRemove: mapValue(liqudityToRemove), removalCoeff })

  const reservesBefore = await pair.getReserves()

  console.log({
    reservesBefore: [
      reservesBefore[0].toString(),
      reservesBefore[1].toString(),
    ],
  })

  await pair.approve(calibratorProxy.address, lpTotalSupply)

  console.log({
    args: [
      pair.address,
      lpTotalSupply.toString(),
      removalCoeff.n.toString(),
      removalCoeff.d.toString(),
      wallet.address,
    ],
  })

  const [
    reserveBaseAfter,
    reserveQuoteAfter,
    totalSupplyAfter,
    kLastAfter,
    amountBaseAfter,
    amountQuoteAfter,
  ] = await calibrator[
    "estimateRemove(uint256,uint256,uint256,uint256,uint256)"
  ](
    reservesBefore[0],
    reservesBefore[1],
    lpTotalSupply,
    kLast,
    liqudityToRemove
  )

  // const calibratorEstimatedOut = await router.getAmountOut(
  //   amountQuoteAfter,
  //   reserveQuoteAfter,
  //   reserveBaseAfter,
  // )

  // console.log({ calibratorEstimatedOut: mapValue(calibratorEstimatedOut) })

  console.log({
    reservesBefore: reservesBefore.slice(0, 2).map(mapValue),
  })

  console.log({
    reserveBaseAfter: mapValue(reserveBaseAfter),
    reserveQuoteAfter: mapValue(reserveQuoteAfter),
    totalSupplyAfter: mapValue(totalSupplyAfter),
    kLastAfter: mapValue(kLastAfter),
    amountBaseAfter: mapValue(amountBaseAfter),
    amountQuoteAfter: mapValue(amountQuoteAfter),
  })

  // remove liquidity
  // const removeLiqAndSwap = async () => {
  //   await pair.approve(router.address, liqudityToRemove)

  //   await router.removeLiquidity(
  //     gtonToken.address,
  //     usdcToken.address,
  //     liqudityToRemove,
  //     1,
  //     1,
  //     wallet.address,
  //     defaultUniDeadline()
  //   )

  //   const reservesAfterRemoval = await pair.getReserves()

  //   const withdrawnBalances = {
  //     // gtonToken: mapValue(reservesBefore[0].sub(reservesAfterRemoval[0])),
  //     // usdcToken: mapValue(reservesBefore[1].sub(reservesAfterRemoval[1])),
  //     gtonToken: mapValue(await gtonToken.balanceOf(wallet.address)),
  //     usdcToken: mapValue(await usdcToken.balanceOf(wallet.address)),
  //   }

  //   console.log({
  //     userBalances_GTON: withdrawnBalances.gtonToken,
  //     userBalances_USDC: withdrawnBalances.usdcToken,
  //     reservesAfterRemoval: reservesAfterRemoval.slice(0, 2).map(mapValue),
  //   })

  //   const amountOut = await router.getAmountOut(
  //     reserveQuoteAfter,
  //     reservesAfterRemoval[1],
  //     reservesAfterRemoval[0]
  //   )

  //   console.log({ amountOut: mapValue(amountOut) })

  //   await usdcToken.approve(router.address, reserveQuoteAfter)

  //   await router.swapExactTokensForTokens(
  //     reserveQuoteAfter,
  //     amountOut,
  //     [usdcToken.address, gtonToken.address],
  //     wallet.address,
  //     defaultUniDeadline()
  //   )
  // }

  // await removeLiqAndSwap()

  // @ts-ignore
  let calibrateFn: (
    pool: string,
    _liquidity: BigNumberish,
    n: BigNumberish,
    d: BigNumberish,
    to: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ) => Promise<ContractTransaction> = () => {}

  // switch (cfg.direction) {
  //   case CalibrateDirection.Down:
  //     calibrateFn = calibratorProxy.calibratePurelyViaPercentOfLPs_DOWN
  //   case CalibrateDirection.Up:
  //     calibrateFn = calibratorProxy.calibratePurelyViaPercentOfLPs_UP
  // }
  if (cfg.direction === CalibrateDirection.Down) {
    calibrateFn = calibratorProxy.calibratePurelyViaPercentOfLPs_DOWN
  } else if (cfg.direction == CalibrateDirection.Up) {
    calibrateFn = calibratorProxy.calibratePurelyViaPercentOfLPs_UP
  }

  console.log({ dir: cfg.direction })
  await calibrateFn(
    pair.address,
    lpTotalSupply,
    removalCoeff.n,
    removalCoeff.d,
    wallet.address
  )

  // calibrator reserves
  console.log({
    tag: "calibrator reserves",
    gtonToken: mapValue(await gtonToken.balanceOf(calibrator.address)),
    usdcToken: mapValue(await usdcToken.balanceOf(calibrator.address)),
  })

  const reservesAfter = await pair.getReserves()
  console.log({
    reservesBefore: [reservesAfter[0].toString(), reservesAfter[1].toString()],
  })
}

export function inferPrice(a: number, b: number, target: number) {
  const a_c = -1 * target
  const b_c = -1 * b + a * target

  const d = Math.pow(b_c, 2) - 4 * a_c * 0

  const x1 = (-b_c - Math.sqrt(d)) / (2 * a_c)
  const x2 = (-b_c + Math.sqrt(d)) / (2 * a_c)

  const r = x1 === 0 ? x2 : x1

  console.log({ r, d })

  return r
}
