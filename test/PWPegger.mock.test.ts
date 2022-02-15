import Big from "big.js"
import { expect } from "chai"
import { ethers, waffle } from "hardhat"

import { preparePWPeggerEnvironment, PWPeggerConfig } from "./pegger"
import { valueToDecimaled } from "./utils"

// actually rewrite of mock-test.js
describe("PW Pegger mock tests", () => {
  async function prepareMock(pwconfig: PWPeggerConfig) {
    const PWPeggerMock = await ethers.getContractFactory("PWPeggerMock")
    const pwpeggerMock = await PWPeggerMock.deploy(pwconfig)
    await pwpeggerMock.deployed()

    return {
      pwpeggerMock,
    }
  }

  const [deployer, admin, keeper, other] = waffle.provider.getWallets()

  const dec = 9
  const testCaseInputs = [
    {
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
    },
  ]

  const price = valueToDecimaled(2, dec)

  it("PW Pegger mock", async () => {
    console.log("PWPeggerMock deployed...")

    const config = testCaseInputs[0]
    const { pwpeggerMock } = await prepareMock(config)
    const currentConfig = await pwpeggerMock.getPWConfig()

    expect(parseInt(currentConfig["decimals"])).to.equal(dec)

    await pwpeggerMock.connect(keeper).callIntervention(price)

    const rnd = await pwpeggerMock.getLastRoundNumber()

    console.log(rnd)

    await expect(
      pwpeggerMock.connect(other).callIntervention(price)
    ).to.be.revertedWith("Error: must be admin or keeper EOA/multisig only")

    await expect(
      pwpeggerMock.connect(deployer).callIntervention(price)
    ).to.be.revertedWith("Error: must be admin or keeper EOA/multisig only")
  })
})
