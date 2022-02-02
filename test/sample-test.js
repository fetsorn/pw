const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PWPegger", function () {

  it("Deploy PWPeggerMock and calls callIntervention and tests getPWConfig dec", async function () {

    const [deployer, admin, keeper, other] = waffle.provider.getWallets()

    const PWPeggerMock = await ethers.getContractFactory("PWPegger");
    const dec = 10**6;
    const pwconfig = {
      admin: admin.address,
      keeper: keeper.address,
      pricedonRef: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      pwpegdonRef: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      correctorup: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      correctordown: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      vault: "0xbb652A9FAc95B5203f44aa3492200b6aE6aD84e0",
      emergencyth: 10*dec,
      volatilityth: 4*dec,
      frontrunth: 1*dec,
      decimals: dec
    }
    const pwpeggerMock = await PWPeggerMock.deploy(pwconfig);
    await pwpeggerMock.deployed();

    const currentConfig = await pwpeggerMock.getPWConfig();

    expect(await parseInt(currentConfig['decimals']))
      .to.equal(parseInt(dec));

    await pwpeggerMock.connect(keeper).callIntervention(1*dec);

    const rnd = await pwpeggerMock.getLastRoundNumber();

    console.log(rnd);

    await expect(pwpeggerMock.connect(other).callIntervention(1*dec))
      .to.be.revertedWith("Error: must be admin or keeper EOA/multisig only");

    await expect(pwpeggerMock.connect(deployer).callIntervention(1*dec))
      .to.be.revertedWith("Error: must be admin or keeper EOA/multisig only");

  });

});
