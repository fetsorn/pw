import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"
import { ERC20PresetFixedSupply } from "../../typechain/ERC20PresetFixedSupply"
import { WrappedNative } from "../../typechain/WrappedNative"
import { IOGXPair } from "../../typechain/IOGXPair"
import { IOGXFactory } from "../../typechain/IOGXFactory"
import { IOGXRouter02 } from "../../typechain/IOGXRouter02"
import { Calibrator } from "../../typechain/Calibrator"
import {
  abi as OGXFactoryABI,
  bytecode as OGXFactoryBytecode
} from "@gton-capital/ogs-core/build/OGXFactory.json"
import {
  abi as OGXPairABI,
  bytecode as OGXPairBytecode
} from "@gton-capital/ogs-core/build/OGXPair.json"
import {
  abi as OGXRouter02ABI,
  bytecode as OGXRouter02Bytecode
} from "@gton-capital/ogs-periphery/build/OGXRouter02.json"

import { expandTo18Decimals } from "./utilities"

import { Fixture } from "ethereum-waffle"

interface TokensFixture {
  tokenBase: ERC20PresetFixedSupply
  tokenQuote: ERC20PresetFixedSupply
  weth: WrappedNative
}

export const tokensFixture: Fixture<TokensFixture> = async function(
  [wallet, other],
  provider
): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory("ERC20PresetFixedSupply")

  const tokenA = (await tokenFactory.deploy(
    "Base",
    "BASE",
    BigNumber.from(2).pow(255),
    wallet.address
  )) as ERC20PresetFixedSupply

  const tokenB = (await tokenFactory.deploy(
    "Quote",
    "QUOT",
    BigNumber.from(2).pow(255),
    wallet.address
  )) as ERC20PresetFixedSupply

  const [tokenBase, tokenQuote] = [
    tokenA,
    tokenB
  ].sort((tokenA, tokenB) =>
    tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
  )

  const weth = await ethers.getContractFactory(
    "WrappedNative"
  ).then((contract) => contract.deploy()) as WrappedNative

  return { tokenBase, tokenQuote, weth }
}

interface UniswapFixture extends TokensFixture {
  factory: IOGXFactory
  router: IOGXRouter02
  pair: IOGXPair
}

export const uniswapFixture: Fixture<UniswapFixture> = async function(
  [wallet, other],
  provider
): Promise<UniswapFixture> {
  const {
    tokenBase,
    tokenQuote,
    weth
  } = await tokensFixture([wallet, other], provider)

  const factory = await ethers.getContractFactory(
    OGXFactoryABI,
    OGXFactoryBytecode
  ).then((contract) => contract.deploy(wallet.address)) as IOGXFactory

  const router = await ethers.getContractFactory(
    OGXRouter02ABI,
    OGXRouter02Bytecode
  ).then((contract) => contract.deploy(
    factory.address,
    weth.address
  )) as IOGXRouter02

  await factory.createPair(tokenQuote.address, tokenBase.address)

  let pairAddress = await factory.getPair(
    tokenQuote.address,
    tokenBase.address
  )

  const pair = (await ethers.getContractFactory(
    OGXPairABI,
    OGXPairBytecode
  )).attach(pairAddress) as IOGXPair

  let block = await wallet.provider.getBlock("latest")

  let timestamp = block.timestamp

  // `wallet` account adds liquidity
  let liquidityBase = expandTo18Decimals(10)

  let liquidityQuote = expandTo18Decimals(50)

  await tokenBase.approve(router.address, liquidityBase)

  await tokenQuote.approve(router.address, liquidityQuote)

  await router.addLiquidity(
    tokenBase.address,
    tokenQuote.address,
    liquidityBase,
    liquidityQuote,
    liquidityBase,
    liquidityQuote,
    wallet.address,
    timestamp + 3600
  )

  // `other` account adds liquidity
  const liquidityBaseOther = BigNumber.from(1)

  const liquidityQuoteOther = BigNumber.from(5)

  await tokenBase.transfer(other.address, liquidityBaseOther)

  await tokenQuote.transfer(other.address, liquidityQuoteOther)

  await tokenBase.connect(other).approve(router.address, liquidityBaseOther)

  await tokenQuote.connect(other).approve(router.address, liquidityQuoteOther)

  block = await wallet.provider.getBlock("latest")

  timestamp = block.timestamp

  await router
    .connect(other)
    .addLiquidity(
      tokenBase.address,
      tokenQuote.address,
      liquidityBaseOther,
      liquidityQuoteOther,
      liquidityBaseOther,
      0,
      other.address,
      timestamp + 3600
    )

  // reapply liquidity
  // to ignore 10**3 lp that is lost on pool initialization
  // and liquidity of `other`
  // and to reset base reserve to a round number
  const liquidity = await pair.balanceOf(wallet.address);

  await pair.approve(router.address, liquidity);

  await router.removeLiquidity(
    tokenBase.address,
    tokenQuote.address,
    liquidity,
    0,
    0,
    wallet.address,
    timestamp + 3600
  );

  const [reserveBase, reserveQuote] = await pair.getReserves();

  liquidityBase = (liquidityBase).sub(reserveBase);

  // Library.quote()
  liquidityQuote = liquidityBase.mul(reserveQuote).div(reserveBase);

  await tokenBase.approve(router.address, liquidityBase);

  await tokenQuote.approve(router.address, liquidityQuote);

  await router.addLiquidity(
    tokenBase.address,
    tokenQuote.address,
    liquidityBase,
    liquidityQuote,
    liquidityBase,
    0,
    wallet.address,
    timestamp + 3600
  )

  return {
    tokenBase,
    tokenQuote,
    weth,
    factory,
    router,
    pair
  }
}

interface CalibratorFixture extends UniswapFixture {
  calibrator: Calibrator
}

export const calibratorFixture: Fixture<CalibratorFixture> = async function(
  [wallet, other],
  provider
): Promise<CalibratorFixture> {
  const {
    tokenBase,
    tokenQuote,
    weth,
    router,
    factory,
    pair
  } = await uniswapFixture([wallet, other], provider)


  const calibrator = await ethers.getContractFactory(
    "Calibrator"
  ).then((contract) => contract.deploy(
    router.address,
    pair.address,
    tokenBase.address,
    tokenQuote.address
  )) as Calibrator

  return {
    tokenBase,
    tokenQuote,
    weth,
    router,
    factory,
    pair,
    calibrator
  }
}
