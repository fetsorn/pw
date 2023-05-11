import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"
import { TestERC20 } from "../../typechain/TestERC20"
import { WrappedNative } from "../../typechain/WrappedNative"
import { OGXPair } from "../../typechain/OGXPair"
import { OGXFactory } from "../../typechain/OGXFactory"
import { OGXRouter02 } from "../../typechain/OGXRouter02"
import {
  abi as OGXFactoryABI,
  bytecode as OGXFactoryBytecode
} from "@gton-capital/ogs-core/build/OGXFactory.json"
import {
  abi as OGXPairABI,
  bytecode as OGXPairBytecode
} from "@gton-capital/ogs-core/build/OGXPair.json"

import { expandTo18Decimals } from "./utilities"

import { Fixture } from "ethereum-waffle"

interface TokensFixture {
  tokenBase: TestERC20
  tokenQuote: TestERC20
  weth: WrappedNative
}

export const tokensFixture: Fixture<TokensFixture> = async function(
  [wallet, other],
  provider
): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory("TestERC20")

  const tokenA = (await tokenFactory.deploy(
    BigNumber.from(2).pow(255)
  )) as TestERC20

  const tokenB = (await tokenFactory.deploy(
    BigNumber.from(2).pow(255)
  )) as TestERC20

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
  factory: OGXFactory
  router: OGXRouter02
  pair: OGXPair
}

export const uniswapFixture: Fixture<UniswapFixture> = async function(
  [wallet, other],
  provider
): Promise<UniswapFixture> {
  const {
    tokenBase,
    tokenQuote,
    weth: weth
  } = await tokensFixture([wallet, other], provider)

  const factory = await ethers.getContractFactory(
    OGXFactoryABI,
    OGXFactoryBytecode
  ).then((contract) => contract.deploy(wallet.address)) as OGXFactory

  // await uniswapV2Factory.setFeeTo(other.address)

  const router = await ethers.getContractFactory(
    "OGXRouter02"
  ).then((contract) => contract.deploy(
    factory.address,
    weth.address
  )) as OGXRouter02

  await factory.createPair(tokenQuote.address, tokenBase.address)

  let pairAddress = await factory.getPair(
    tokenQuote.address,
    tokenBase.address
  )

  const pair = (await ethers.getContractFactory(
    OGXPairABI,
    OGXPairBytecode
  )).attach(pairAddress) as OGXPair

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

  const liquidity = await pair.balanceOf(wallet.address);

  await pair.approve(router.address, liquidity);

  // reapply liquidity to ignore 10**3 lp that is lost on pool initialization
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

  // `other` account adds liquidity
  // liquidityBase = BigNumber.from(1)

  // liquidityQuote = BigNumber.from(5)

  // await tokenBase.transfer(other.address, liquidityBase)

  // await tokenQuote.transfer(other.address, liquidityQuote)

  // await tokenBase.connect(other).approve(router.address, liquidityBase)

  // await tokenQuote.connect(other).approve(router.address, liquidityQuote)

  // block = await wallet.provider.getBlock("latest")

  // timestamp = block.timestamp

  // await router
  //   .connect(other)
  //   .addLiquidity(
  //     tokenBase.address,
  //     tokenQuote.address,
  //     liquidityBase,
  //     liquidityQuote,
  //     liquidityBase,
  //     liquidityQuote,
  //     other.address,
  //     timestamp + 3600
  //   )

  return {
    tokenBase,
    tokenQuote,
    weth,
    factory,
    router,
    pair
  }
}
