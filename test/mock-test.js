const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PWPeggerMock", function () {

    const [deployer, admin, keeper, other] = waffle.provider.getWallets()

    const dec = 18;
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
      emergencyth: 8*(10**dec),
      volatilityth: 4*(10**dec),
      frontrunth: 1*(10**dec),
      decimals: dec
    }

    it("Deploy PWPeggerMock and calls callIntervention and tests getPWConfig dec", async function () {

        const PWPeggerMock = await ethers.getContractFactory("PWPeggerMock");
        const pwpeggerMock = await PWPeggerMock.deploy(pwconfig);
        await pwpeggerMock.deployed();
    
        const currentConfig = await pwpeggerMock.getPWConfig();


        expect(parseInt(currentConfig['decimals'])).to.equal(parseInt(dec));

        await pwpeggerMock.connect(keeper).callIntervention(1*dec);

        const rnd = await pwpeggerMock.getLastRoundNumber();

        console.log(rnd);

        await expect(pwpeggerMock.connect(other).callIntervention(1*dec))
            .to.be.revertedWith("Error: must be admin or keeper EOA/multisig only");

        await expect(pwpeggerMock.connect(deployer).callIntervention(1*dec))
            .to.be.revertedWith("Error: must be admin or keeper EOA/multisig only");
        
    })

    it("Check pause on cases:", async function () {

        const PWPeggerMock = await ethers.getContractFactory("PWPeggerMock");
        const pwpeggerMock = await PWPeggerMock.deploy(pwconfig);
        await pwpeggerMock.deployed();

        await expect(pwpeggerMock.connect(deployer).setPauseOn())
            .to.be.revertedWith("Error: must be admin or keeper EOA/multisig only");

        await pwpeggerMock.connect(keeper).setPauseOn()

        expect(await pwpeggerMock.getPauseStatus()).to.equal(true);

        await expect(pwpeggerMock.connect(keeper).setPauseOff())
            .to.be.revertedWith("Error: must be admin EOA or multisig only");

        await expect(pwpeggerMock.connect(keeper).callIntervention(1*dec))
            .to.be.revertedWith("PWPeggerMock in on Pause now");

        await pwpeggerMock.connect(admin).setPauseOff()

        expect(await pwpeggerMock.getPauseStatus()).to.equal(false);

        await pwpeggerMock.connect(keeper).callIntervention(1*dec);

        const rnd = await pwpeggerMock.getLastRoundNumber();

        console.log(rnd);

    })

});
