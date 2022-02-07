const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PWPegger", function () {

  it("Deploy PWPeggerMock and calls callIntervention and tests getPWConfig dec", async function () {

    const [deployer, admin, keeper, other] = waffle.provider.getWallets()

    const PWPeggerMock = await ethers.getContractFactory("PWPegger");
    const dec = 8 //case from https://etherscan.io/address/0xdc3ea94cd0ac27d9a86c180091e7f78c683d3699#readContract
    const pwconfig = {
      admin: admin.address,
      keeper: keeper.address,
      pricedonRef: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      pwpegdonRef: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      correctorup: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      correctordown: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      vault: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      pool: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      token: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      emergencyth: parseInt(8*(10**dec)),
      volatilityth: parseInt(4*(10**dec)),
      frontrunth: parseInt(1*(10**dec)),
      decimals: dec
    }
    const pwpeggerMock = await PWPeggerMock.deploy(pwconfig);
    await pwpeggerMock.deployed();

    const currentConfig = await pwpeggerMock.getPWConfig();

    expect(await parseInt(currentConfig['decimals']))
      .to.equal(parseInt(dec));
  })
});
