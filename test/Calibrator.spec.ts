import { ethers, waffle } from "hardhat"
import { BigNumber as BN } from "bignumber.js";
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { ERC20PresetFixedSupply } from "../typechain/ERC20PresetFixedSupply"
import { IOGXPair } from "../typechain/IOGXPair"
import { IOGXRouter02 } from "../typechain/IOGXRouter02"
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

    let tokenBase: ERC20PresetFixedSupply
    let tokenQuote: ERC20PresetFixedSupply
    let router: IOGXRouter02
    let pair: IOGXPair
    let calibrator: Calibrator

    beforeEach("deploy test contracts", async () => {
        ;({ tokenBase,
            tokenQuote,
            router,
            pair,
            calibrator} = await loadFixture(calibratorFixture))
    })

    async function calibrate(
        targetRatioBase: BN,
        targetRatioQuote: BN
    ) {
        const liquidityBalance = await pair.balanceOf(wallet.address);

        await pair.approve(calibrator.address, liquidityBalance);

        // TODO: calculate a guard for amount of Quote
        const quoteBalance = await tokenQuote.balanceOf(wallet.address);

        await tokenQuote.approve(calibrator.address, quoteBalance);

        await calibrator.calibrateUp(
            targetRatioBase.toString(),
            targetRatioQuote.toString()
        );
    }

    interface TestCase {
        targetRatioBase: number;
        targetRatioQuote: number;
        reserveBase: string;
        reserveQuote: string;
        liquidityBalance: string;
    }

    const testCases = [
        { targetRatioBase: 4,
          targetRatioQuote: 10,
          reserveBase: "10000000000000000000",
          reserveQuote: "25053581500282007896",
          liquidityBalance: "15804004512126338535"
        },
        { targetRatioBase: 5,
          targetRatioQuote: 10,
          reserveBase: "10000000000000000000",
          reserveQuote: "20053688888888888888",
          liquidityBalance: "14137066666666665664"
        },
        { targetRatioBase: 4,
          targetRatioQuote: 10,
          reserveBase: "10000000000000000000",
          reserveQuote: "24932472823078796466",
          liquidityBalance: "15760621692828834209"
        },
        { targetRatioBase: 10,
          targetRatioQuote: 8,
          reserveBase: "10000000000000000000",
          reserveQuote: "8013624208304011259",
          liquidityBalance: "8929373680506684430"
        },
        { targetRatioBase: 1,
          targetRatioQuote: 12,
          reserveBase: "10000000000000000000",
          reserveQuote: "119902567629527739569",
          liquidityBalance: "34500611340363746514"
        },
    ]

    async function test(testCase: TestCase) {
        const { targetRatioBase, targetRatioQuote } = testCase;

        await calibrate(
            new BN(targetRatioBase),
            new BN(targetRatioQuote)
        );

        const [reserveBase, reserveToken] = await pair.getReserves();

        const liquidityBalance = await pair.balanceOf(wallet.address)

        const result = {
            targetRatioBase,
            targetRatioQuote,
            reserveBase: reserveBase.toString(),
            reserveQuote: reserveToken.toString(),
            liquidityBalance: liquidityBalance.toString()
        };

        expect(result).to.deep.equal(testCase);
    }

    describe("#calibrate", async () => {
        it("matches estimates", async () => {
            for (const testCase of testCases) {
                await test(testCase);
            }
        })
    })
})
