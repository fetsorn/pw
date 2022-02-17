import { PWPegger } from "~/typechain/PWPegger"
import { PWPegger__factory } from "./../typechain/factories/PWPegger__factory"
import { preparePWPeggerEnvironment, PWPeggerConfig } from "./pegger"
import { ethers } from "ethers"
import { PWLibraryMock__factory } from "~/typechain/factories/PWLibraryMock__factory"
import { PWLibraryMock } from "~/typechain/PWLibraryMock"
import { waffle } from "hardhat"
import { valueToDecimaled } from "./utils"

describe("PW Pegger integrational tests", () => {
  type Context = {
    pwPegger?: PWPegger
    // calibratorProxy: Cal
  }
  const context: Context = {}

  const [deployer, admin, keeper, other] = waffle.provider.getWallets()

  beforeEach(async () => {
    const dec = 8 //case from https://etherscan.io/address/0xdc3ea94cd0ac27d9a86c180091e7f78c683d3699#readContract
    const pwconfig = {
      admin: admin.address,
      keeper: keeper.address,
      pwpegdonRef: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      calibrator: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      vault: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      pool: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      token: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      emergencyth: valueToDecimaled(8, dec),
      volatilityth: valueToDecimaled(4, dec),
      frontrunth: valueToDecimaled(1, dec),
      decimals: dec,
    }
    context.pwPegger = (
      await preparePWPeggerEnvironment(pwconfig)
    ).pwPeggerContract
  })

  it("", async () => {

  })
})
