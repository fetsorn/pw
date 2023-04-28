import { ethers, waffle } from "hardhat"
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { OGXPair } from "../typechain/OGXPair"
import { OGXFactory } from "../typechain/OGXFactory"
import { OGXRouter02 } from "../typechain/OGXRouter02"
import { Calibrator } from "../typechain/Calibrator"
import { RelayLock } from "../typechain/RelayLock"
import { Relay } from "../typechain/Relay"
import { tokensFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { expandTo18Decimals, ZERO_ADDR } from "./shared/utilities"

describe("OGX", () => {
  const [wallet, other] = waffle.provider.getWallets()

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before("create fixture loader", async () => {
    loadFixture = waffle.createFixtureLoader([wallet, other])
  })

  let gton: TestERC20
  let usdc: TestERC20
  let usdt: TestERC20
  let weth: WrappedNative
  let factory: OGXFactory
  let router: OGXRouter02
  let pair: OGXPair
  let calibrator: Calibrator
  let startingBalance: BigNumber

  beforeEach("deploy test contracts", async () => {
    ;({
      token0: gton,
      token1: usdt,
      token2: usdc,
      weth: weth
    } = await loadFixture(tokensFixture))
    startingBalance = await wallet.provider.getBalance(wallet.address)
  })

  async function nextAddress() {
    const wethFactory = await ethers.getContractFactory("WrappedNative")
    await wethFactory.deploy()
  }

  async function getPrice(): Promise<BigNumber> {
    let amountsIn = BigNumber.from("10000")
    let [amountGTON, amountUSDC] = await router.getAmountsOut(amountsIn, [
      gton.address,
      usdc.address
    ])
    return amountUSDC.div(amountGTON)
  }

  describe("#calibrate", async () => {
    it("matches estimates", async () => {
      const factoryFactory = await ethers.getContractFactory("OGXFactory")
      const factory = (await factoryFactory.deploy(
        wallet.address
      )) as OGXFactory

      await factory.setFeeTo(other.address)

      const routerFactory = await ethers.getContractFactory("OGXRouter02")
      const router = (await routerFactory.deploy(
        factory.address,
        weth.address
      )) as OGXRouter02

      const pairFactory = await ethers.getContractFactory("OGXPair")
      // log pairV2 bytecode for init code hash in the router
      let bytecode = pairFactory.bytecode
      console.log(ethers.utils.solidityKeccak256(["bytes"], [bytecode]))

      await factory.createPair(weth.address, gton.address)
      const pairAddress = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress)

      const pair = pairFactory.attach(pairAddress) as OGXPair

      // https://etherscan.io/tx/0xa097d91a43bf824ca0e44a045dd682fdce07efb66e5d2eaacc64cb5ad1a61d3f
      let liquidityGTON = BigNumber.from("16000000000000000000000")
      let liquidityWETH = BigNumber.from("40000000000000000000")
      await gton.approve(router.address, liquidityGTON)
      let block = await wallet.provider.getBlock("latest")
      let timestamp = block.timestamp
      await expect(
        router.addLiquidityETH(
          gton.address,
          liquidityGTON,
          liquidityGTON,
          liquidityWETH,
          wallet.address,
          timestamp + 3600,
          { value: liquidityWETH }
        )
      )
        .to.emit(gton, "Transfer")
        .withArgs(wallet.address, pair.address, liquidityGTON)
        .to.emit(weth, "Transfer")
        .withArgs(router.address, pair.address, liquidityWETH)
        .to.emit(pair, "Transfer")
        .withArgs(ZERO_ADDR, ZERO_ADDR, "1000")
        .to.emit(pair, "Transfer")
        .withArgs(ZERO_ADDR, wallet.address, "799999999999999999000")
        .to.emit(pair, "Sync")
        .withArgs(liquidityWETH, liquidityGTON)
        .to.emit(pair, "Mint")
        .withArgs(router.address, liquidityWETH, liquidityGTON)

      const pairAddress2 = await factory.getPair(weth.address, gton.address)
      // console.log(pairAddress2)
      expect(pairAddress2).to.eq(pairAddress)

      expect(await pair.token1()).to.eq(gton.address)
      expect(await pair.token0()).to.eq(weth.address)

      const calibratorFactory = await ethers.getContractFactory("Calibrator")
      const calibrator = (await calibratorFactory.deploy(
        gton.address,
        router.address,
        "SUSHI"
      )) as Calibrator

      // console.log("TOTAL SUPPLY: ", (await pair.totalSupply()).toString())
      await pair.approve(calibrator.address, "700000000000000000000")

      let reserves = await calibrator.getReserves(
        pair.address,
        gton.address,
        weth.address
      )
      let reserveGTONBefore = reserves[0].toString()
      let reserveTokenBefore = reserves[1].toString()
      // console.log("gton before", reserveGTONBefore)
      // console.log("token before", reserveTokenBefore)

      let estimates = await calibrator.estimateNow(
        pair.address,
        "700000000000000000000",
        "5192222000000"
      )
      let reserveGTONEstimated = estimates[0] //"15999999916799459813447"
      let reserveTokenEstimated = estimates[1] //"40000000000000000000"
      let amountGTONEstimated = estimates[2] //"83200540186553"
      let liquidityEstimated = estimates[3] //"699999997917317471752"
      // console.log(
      //   estimates[0].toString(),
      //   estimates[1].toString(),
      //   estimates[2].toString(),
      //   estimates[3].toString()
      // )

      // let tx: ContractTransaction = await calibrator.calibrateUp(
      //   pair.address,
      //   "35878177829171549240",
      //   "5192222000000",
      //   wallet.address
      // )
      // let receipt: ContractReceipt = await tx.wait();
      // console.log(receipt.events);
      // sync topic0 is 0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1
      // find one with the latest log index, get Sync arguments from data
      // 0x0000000000000000000000000000000000000000000000022b1c8c1227a00000
      // 0x0000000000000000000000000000000000000000000003635c9ad276c391464a

      console.log(
        "OO",
        pair.address,
        gton.address,
        weth.address,
        calibrator.address,
        router.address
      )
      console.log(
        "BBB",
        (await wallet.provider.getBalance(wallet.address)).toString()
      )
      console.log("BBB", (await gton.balanceOf(wallet.address)).toString())
      await pair.approve(calibrator.address, "14000000000000000000000")
      await gton.approve(calibrator.address, "14000000000000000000000")
      await weth.approve(calibrator.address, "14000000000000000000000")
      // console.log("LP FEE BEFORE", (await pair.balanceOf(other.address)).toString())
      console.log("mmm", (await gton.balanceOf(calibrator.address)).toString())
      await expect(
        calibrator.calibrateUp(
          pair.address,
          "700000000000000000000",
          "5192222000000",
          wallet.address
        )
      )
        .to.emit(pair, "Sync")
        .withArgs("40000000000000000000", "15999999916799459813447")
      // console.log("LP FEE AFTER", (await pair.balanceOf(other.address)).toString())

      reserves = await calibrator.getReserves(
        pair.address,
        gton.address,
        weth.address
      )
      let reserveGTONAfter = reserves[0].toString()
      let reserveTokenAfter = reserves[1].toString()
      // console.log("gton after", reserveGTONAfter)
      // console.log("token after", reserveTokenAfter)

      expect(reserveGTONEstimated).to.eq("15999999916799459813447")
      expect(reserveTokenEstimated).to.eq("40000000000000000000")
    })
  })
})
