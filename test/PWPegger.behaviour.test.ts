import { EACAggregatorProxy__factory } from "./../typechain/factories/EACAggregatorProxy__factory"
import { CalibratorProxy } from "./../typechain/CalibratorProxy.d"
import { PWPegger } from "./../typechain/PWPegger.d"
import Big from "big.js"

import { prepareTokensAndPoolsForProxy, CalibrateDirection } from "./pool"
import { BigNumber } from "ethers"
import { ethers } from "hardhat"
import { Calibrator } from "~/typechain/Calibrator"
import { ERC20PresetFixedSupply } from "~/typechain/ERC20PresetFixedSupply"
import { QuickFactory } from "~/typechain/QuickFactory"
import { QuickPair } from "~/typechain/QuickPair"
import { QuickRouter01 } from "~/typechain/QuickRouter01"
import { PWPegger__factory } from "~/typechain/factories/PWPegger__factory"
import { PWPeggerConfig } from "./pegger"

describe("PW Pegger behavioural tests", () => {
  type Context = {
    pwpegger: PWPegger
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

  beforeEach(async () => {
    const pwpeggerFactory = (await ethers.getContractFactory(
      "PWPegger"
    )) as PWPegger__factory
    const eacAggrProxyFactory = (await ethers.getContractFactory(
      "EACAggregatorProxy"
    )) as EACAggregatorProxy__factory

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
      percentageOfLPs: { n: 1, d: 10 },
    })

    const [deployer, keeper, pwpegdonRef_admin, vault] =
      await ethers.getSigners()

    const pwpegdonRef = await eacAggrProxyFactory
      .connect(pwpegdonRef_admin)
      .deploy(pwpegdonRef_admin.address, pwpegdonRef_admin.address)

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
    }

    const pwpeggerResp = await pwpeggerFactory.deploy(config)
    const pwpegger = await pwpeggerResp.deployed()

    context = {
      pwpegger,
      proxyContext,
    }
  })

  it("behaviour test with PW Pegger", async () => {})
})
