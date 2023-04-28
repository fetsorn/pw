import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"

import { TestERC20 } from "../../typechain/TestERC20"
import { WrappedNative } from "../../typechain/WrappedNative"
import { SushiPair } from "../../typechain/SushiPair"
import { keccak256 } from "@ethersproject/solidity"
import { SushiFactory } from "../../typechain/SushiFactory"
import { SushiRouter02 } from "../../typechain/SushiRouter02"
import { Calibrator } from "../../typechain/Calibrator"

import { expandTo18Decimals } from "./utilities"

import { Fixture } from "ethereum-waffle"

interface TokensFixture {
  token0: TestERC20
  token1: TestERC20
  token2: TestERC20
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
  const tokenC = (await tokenFactory.deploy(
    BigNumber.from(2).pow(255)
  )) as TestERC20

  const [token0, token1, token2] = [
    tokenA,
    tokenB,
    tokenC
  ].sort((tokenA, tokenB) =>
    tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
  )

  const wethFactory = await ethers.getContractFactory("WrappedNative")
  let weth = (await wethFactory.deploy()) as WrappedNative
  while (weth.address.toLowerCase() > token0.address.toLowerCase()) {
    weth = (await wethFactory.deploy()) as WrappedNative
  }

  return { token0, token1, token2, weth }
}

interface UniswapFixture extends TokensFixture {
  uniswapV2Factory: SushiFactory
  uniswapV2Router02: SushiRouter02
  uniswapV2PairGTON_WETH: SushiPair
  uniswapV2PairGTON_USDC: SushiPair
}

const uniswapFixture: Fixture<UniswapFixture> = async function(
  [wallet, other],
  provider
): Promise<UniswapFixture> {
  const {
    token0: gton,
    token1: usdt,
    token2: usdc,
    weth: weth
  } = await tokensFixture([wallet, other], provider)

  const uniswapV2FactoryFactory = await ethers.getContractFactory(
    "SushiFactory"
  )
  const uniswapV2Factory = (await uniswapV2FactoryFactory.deploy(
    wallet.address
  )) as SushiFactory

  await uniswapV2Factory.setFeeTo(other.address)

  const uniswapV2Router02Factory = await ethers.getContractFactory(
    "SushiRouter02"
  )
  const uniswapV2Router02 = (await uniswapV2Router02Factory.deploy(
    uniswapV2Factory.address,
    weth.address
  )) as SushiRouter02

  await uniswapV2Factory.createPair(weth.address, gton.address)

  const uniswapV2PairFactory = await ethers.getContractFactory("SushiPair")
  // log pairV2 bytecode for init code hash in the router
  let bytecode = uniswapV2PairFactory.bytecode
  console.log(ethers.utils.solidityKeccak256(["bytes"], [bytecode]))

  let pairAddressGTON_WETH = await uniswapV2Factory.getPair(
    weth.address,
    gton.address
  )
  const uniswapV2PairGTON_WETH = uniswapV2PairFactory.attach(
    pairAddressGTON_WETH
  ) as SushiPair

  console.log(weth.address, gton.address, pairAddressGTON_WETH)
  let liquidityGTON
  let block
  let timestamp

  liquidityGTON = expandTo18Decimals(10)
  let liquidityWETH = expandTo18Decimals(20)
  await gton.approve(uniswapV2Router02.address, liquidityGTON)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  // let k = await uniswapV2PairGTON_WETH.kLast()
  // console.log(k.toString())
  await uniswapV2Router02.addLiquidityETH(
    gton.address,
    liquidityGTON,
    liquidityGTON,
    liquidityWETH,
    wallet.address,
    timestamp + 3600,
    { value: liquidityWETH }
  )
  // k = await uniswapV2PairGTON_WETH.kLast()
  // console.log(k.toString())

  await uniswapV2Factory.createPair(usdc.address, gton.address)

  let pairAddressGTON_USDC = await uniswapV2Factory.getPair(
    usdc.address,
    gton.address
  )
  const uniswapV2PairGTON_USDC = uniswapV2PairFactory.attach(
    pairAddressGTON_USDC
  ) as SushiPair

  liquidityGTON = expandTo18Decimals(10)
  let liquidityUSDC = expandTo18Decimals(50)
  await gton.approve(uniswapV2Router02.address, liquidityGTON)
  await usdc.approve(uniswapV2Router02.address, liquidityUSDC)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  let k = await uniswapV2PairGTON_USDC.kLast()
  // console.log(k.toString())
  await uniswapV2Router02.addLiquidity(
    gton.address,
    usdc.address,
    liquidityGTON,
    liquidityUSDC,
    liquidityGTON,
    liquidityUSDC,
    wallet.address,
    timestamp + 3600
  )

  k = await uniswapV2PairGTON_USDC.kLast()
  // console.log(k.toString())
  liquidityGTON = BigNumber.from(1)
  liquidityUSDC = BigNumber.from(5)
  await gton.transfer(other.address, liquidityGTON)
  await usdc.transfer(other.address, liquidityUSDC)
  await gton.connect(other).approve(uniswapV2Router02.address, liquidityGTON)
  await usdc.connect(other).approve(uniswapV2Router02.address, liquidityUSDC)
  block = await wallet.provider.getBlock("latest")
  timestamp = block.timestamp
  await uniswapV2Router02
    .connect(other)
    .addLiquidity(
      gton.address,
      usdc.address,
      liquidityGTON,
      liquidityUSDC,
      liquidityGTON,
      liquidityUSDC,
      wallet.address,
      timestamp + 3600
    )

  return {
    token0: gton,
    token1: usdt,
    token2: usdc,
    weth,
    uniswapV2Factory,
    uniswapV2Router02,
    uniswapV2PairGTON_WETH,
    uniswapV2PairGTON_USDC
  }
}

interface CalibratorFixture extends UniswapFixture {
  calibrator: Calibrator
}

export const calibratorFixture: Fixture<CalibratorFixture> = async function(
  [wallet, other, nebula],
  provider
): Promise<CalibratorFixture> {
  const {
    token0: gton,
    token1: usdt,
    token2: usdc,
    weth,
    uniswapV2Factory,
    uniswapV2Router02,
    uniswapV2PairGTON_WETH,
    uniswapV2PairGTON_USDC
  } = await uniswapFixture([wallet, other], provider)

  const calibratorFactory = await ethers.getContractFactory("Calibrator")
  const calibrator = (await calibratorFactory.deploy(
    gton.address,
    uniswapV2Router02.address,
    "Sushi"
  )) as Calibrator

  return {
    token0: gton,
    token1: usdt,
    token2: usdc,
    weth,
    uniswapV2Factory,
    uniswapV2Router02,
    uniswapV2PairGTON_WETH,
    uniswapV2PairGTON_USDC,
    calibrator
  }
}
