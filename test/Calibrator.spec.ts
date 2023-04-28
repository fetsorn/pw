import { ethers, waffle } from "hardhat"
import { BigNumber } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { SushiPair } from "../typechain/SushiPair"
import { SushiFactory } from "../typechain/SushiFactory"
import { SushiRouter02 } from "../typechain/SushiRouter02"
import { Calibrator } from "../typechain/Calibrator"
import { calibratorFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { expandTo18Decimals } from "./shared/utilities"

describe("Calibrator", () => {
  const [wallet, other] = waffle.provider.getWallets()

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader([wallet, other])
  })

  let gton: TestERC20
  let usdc: TestERC20
  let usdt: TestERC20
  let weth: WrappedNative
  let uniswapV2Factory: SushiFactory
  let uniswapV2Router02: SushiRouter02
  let uniswapV2PairGTON_WETH: SushiPair
  let uniswapV2PairGTON_USDC: SushiPair
  let calibrator: Calibrator
  let startingBalance: BigNumber

  beforeEach("deploy test contracts", async () => {
    ;({
      token0: gton,
      token1: usdt,
      token2: usdc,
      weth,
      uniswapV2Factory,
      uniswapV2Router02,
      uniswapV2PairGTON_WETH,
      uniswapV2PairGTON_USDC,
      calibrator
    } = await loadFixture(calibratorFixture))
    startingBalance = await wallet.provider.getBalance(wallet.address)
  })

  async function getPrice(): Promise<BigNumber> {
    let amountsIn = BigNumber.from("10000")
    let [
      amountGTON,
      amountUSDC
    ] = await uniswapV2Router02.getAmountsOut(amountsIn, [
      gton.address,
      usdc.address
    ])
    return amountUSDC.div(amountGTON)
  }

  it("constructor initializes variables", async () => {
    // lp balance of gton_weth
    // lp balance of gton_usdc
    expect(await uniswapV2PairGTON_USDC.balanceOf(wallet.address)).to.eq(
      "22360679774997895966"
    )
    // price on gton-usdc
    expect(await getPrice()).to.be.eq("4")
    // price on gton-weth
  })

  describe("#calibrate", async () => {
    it("fails if lp is not approved", async () => {
      let liquidity = expandTo18Decimals(1)
      let buyback = expandTo18Decimals(10)
      await expect(
        calibrator.calibrateUp(
          uniswapV2PairGTON_USDC.address,
          liquidity,
          buyback,
          wallet.address
        )
      ).to.be.revertedWith("ds-math-sub-underflow")
    })

    it("transfers lp and gton to account after calibrate", async () => {
      let startingGton = await gton.balanceOf(other.address)
      let liquidity = expandTo18Decimals(10)
      let buyback = expandTo18Decimals(1)
      await uniswapV2PairGTON_USDC.approve(calibrator.address, liquidity)
      await calibrator.calibrateUp(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback,
        other.address
      )
      let gtonGained = (await gton.balanceOf(other.address)).sub(startingGton)
      expect(gtonGained).to.be.eq("3294429837562624227")
      expect(await uniswapV2PairGTON_USDC.balanceOf(other.address)).to.be.gt(0)
      expect(await uniswapV2PairGTON_USDC.balanceOf(other.address)).to.be.eq(
        "5945780645661822055"
      )
    })

    it("sets price from 4 to 7", async () => {
      let liquidity = expandTo18Decimals(10)
      let buyback = expandTo18Decimals(1)
      await uniswapV2PairGTON_USDC.approve(calibrator.address, liquidity)
      await calibrator.calibrateUp(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback,
        other.address
      )
      expect(await getPrice()).to.be.eq(7)
    })
  })

  describe("#estimate", async () => {
    it("estimates price change from 4 to 7", async () => {
      let liquidity = expandTo18Decimals(10)
      let buyback = expandTo18Decimals(1)
      let result = await calibrator.estimateNow(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback
      )
      let reserveGton = result[0]
      let reserveToken = result[1]
      expect(reserveToken.div(reserveGton)).to.be.eq("7")
    })

    it("univ2 estimates are equal to results", async () => {
      let liquidity = expandTo18Decimals(10)
      let buyback = expandTo18Decimals(1)
      let result = await calibrator.estimateNow(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback
      )
      let reserveGton = result[0]
      let reserveToken = result[1]

      await uniswapV2PairGTON_USDC.approve(calibrator.address, liquidity)
      await calibrator.calibrateUp(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback,
        other.address
      )
      let reserves = await uniswapV2PairGTON_USDC.getReserves()
      let reserveGton2 = reserves[0]
      let reserveToken2 = reserves[1]
      expect(reserveGton).to.eq(reserveGton2)
      expect(reserveToken).to.eq(reserveToken2)
    })

    it("univ2 estimates are equal to results", async () => {
      let liquidity = expandTo18Decimals(10)
      let buyback = expandTo18Decimals(1)
      let result = await calibrator.estimateNow(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback
      )
      let reserveGton = result[0]
      let reserveToken = result[1]

      await uniswapV2PairGTON_USDC.approve(calibrator.address, liquidity)
      await calibrator.calibrateUp(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback,
        other.address
      )
      let k = await uniswapV2PairGTON_USDC.kLast()
      // console.log(k.toString())
      // console.log((await uniswapV2PairGTON_USDC.balanceOf(other.address)).toString())
      let reserves = await uniswapV2PairGTON_USDC.getReserves()
      let reserveGton2 = reserves[0]
      let reserveToken2 = reserves[1]
      expect(reserveGton).to.eq(reserveGton2)
      expect(reserveToken).to.eq(reserveToken2)

      liquidity = expandTo18Decimals(10)
      buyback = expandTo18Decimals(1)
      result = await calibrator.estimateNow(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback
      )
      reserveGton = result[0]
      reserveToken = result[1]

      await uniswapV2PairGTON_USDC.approve(calibrator.address, liquidity)
      await calibrator.calibrateUp(
        uniswapV2PairGTON_USDC.address,
        liquidity,
        buyback,
        other.address
      )
      k = await uniswapV2PairGTON_USDC.kLast()
      // console.log(k.toString())
      // console.log((await uniswapV2PairGTON_USDC.balanceOf(other.address)).toString())
      reserves = await uniswapV2PairGTON_USDC.getReserves()
      reserveGton2 = reserves[0]
      reserveToken2 = reserves[1]
      expect(reserveGton).to.eq(reserveGton2)
      expect(reserveToken).to.eq(reserveToken2)
    })
  })

  describe("#pickBuy", async () => {
    it("picks first buyback that matches price", async () => {
      let start = 0
      let end = expandTo18Decimals(10)
      let price = 1234
      let reserves = await uniswapV2PairGTON_USDC.getReserves()
      let reserveGton = reserves[0]
      let reserveToken = reserves[1]
      // console.log(reserveGton.toString(), reserveToken.toString())
      let results = await calibrator.pickBuy(
        reserveGton,
        reserveToken,
        price,
        start,
        end
      )
      // console.log(
      //   results[0].toString(),
      //   results[1].toString(),
      //   results[2].toString()
      // )
      expect(results[2]).to.eq("3632812499999999999")
    })
  })

  describe("#pickSell", async () => {
    it("picks first sell amount that matches price", async () => {
      let end = expandTo18Decimals(10)
      let start = 0
      let price = 427
      let reserves = await uniswapV2PairGTON_USDC.getReserves()
      let reserveGton = reserves[0]
      let reserveToken = reserves[1]
      // console.log(reserveGton.toString(), reserveToken.toString())
      let results = await calibrator.pickSell(
        reserveGton,
        reserveToken,
        price,
        start,
        end
      )
      // console.log(
      //   results[0].toString(),
      //   results[1].toString(),
      //   results[2].toString()
      // )
      expect(results[2]).to.eq("820312499999999999")
    })
  })
})
