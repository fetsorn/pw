import { ethers, waffle } from "hardhat"
import { BigNumber as BN } from "bignumber.js";
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { ERC20PresetFixedSupply } from "../typechain/ERC20PresetFixedSupply"
import { IOGXPair } from "../typechain/IOGXPair"
import { IOGXRouter02 } from "../typechain/IOGXRouter02"
import { uniswapFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { expandTo18Decimals } from "./shared/utilities"

describe("OGX", () => {
    const [wallet, other] = waffle.provider.getWallets()

    let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

    before("create fixture loader", async () => {
        loadFixture = waffle.createFixtureLoader([wallet, other])
    })

    let tokenBase: ERC20PresetFixedSupply
    let tokenQuote: ERC20PresetFixedSupply
    let router: IOGXRouter02
    let pair: IOGXPair

    beforeEach("deploy test contracts", async () => {
        ;({ tokenBase,
            tokenQuote,
            router,
            pair } = await loadFixture(uniswapFixture))
    })

    async function timestamp() {
        let block = await wallet.provider.getBlock("latest")

        let timestamp = block.timestamp + 3600

        return timestamp
    }

    async function calibrate(
        targetRatioBase: BN,
        targetRatioQuote: BN
    ) {
        const [reserveBaseInvariant] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        /* Remove liquidity */
        const availableLiquidity = await pair.balanceOf(wallet.address);

        const totalSupply = await pair.totalSupply();

        // preserve minimum liquidity required for 3 decimal precision
        const minimumLiquidity = totalSupply.mul(100000).div(reserveBaseInvariant.toString());

        expect(availableLiquidity).to.be.gte(minimumLiquidity);

        const liquidity = availableLiquidity.sub(minimumLiquidity);

        await pair.approve(router.address, liquidity);

        await router.removeLiquidity(
            tokenBase.address,
            tokenQuote.address,
            liquidity,
            0,
            0,
            wallet.address,
            await timestamp()
        );

        /* Swap to price */
        const [reserveBaseBefore, reserveQuoteBefore] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        const targetRatio = targetRatioBase.div(targetRatioQuote);

        const baseToQuote = reserveBaseBefore.div(reserveQuoteBefore).lt(targetRatio);

        const invariant = reserveBaseBefore.times(reserveQuoteBefore);

        const leftSide = baseToQuote
            ? invariant.times(1000).times(targetRatioBase).div(targetRatioQuote.times(997)).sqrt()
            : invariant.times(1000).times(targetRatioQuote).div(targetRatioBase.times(997)).sqrt();

        const rightSide = (baseToQuote ? reserveBaseBefore.times(1000) : reserveQuoteBefore.times(1000)).div(997);

        expect(leftSide.gt(rightSide));

        const amountIn = leftSide.minus(rightSide).integerValue();

        if (baseToQuote) {
            await tokenBase.approve(router.address, amountIn.toString());
        } else {
            await tokenQuote.approve(router.address, amountIn.toString());
        }

        const path = baseToQuote
            ? [tokenBase.address, tokenQuote.address]
            : [tokenQuote.address, tokenBase.address];

        await router.swapExactTokensForTokens(
            amountIn.toString(),
            0,
            path,
            wallet.address,
            await timestamp()
        );

        const [reserveBaseAfter, reserveQuoteAfter] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        // validate price calibration
        expect(
            reserveBaseAfter.div(reserveQuoteAfter).decimalPlaces(3).toNumber()
        ).to.be.within(
            targetRatioBase.div(targetRatioQuote).decimalPlaces(3).toNumber() - 0.002,
            targetRatioBase.div(targetRatioQuote).decimalPlaces(3).toNumber() + 0.002,
        );

        /* Add liquidity */
        const amountBaseDesired = reserveBaseInvariant.minus(reserveBaseAfter);

        // Library.quote()
        const amountQuoteDesired = amountBaseDesired.times(reserveQuoteAfter).div(reserveBaseAfter).integerValue();

        await tokenBase.approve(router.address, amountBaseDesired.toString());

        await tokenQuote.approve(router.address, amountQuoteDesired.toString());

        await router.addLiquidity(
            tokenBase.address,
            tokenQuote.address,
            amountBaseDesired.toString(),
            amountQuoteDesired.toString(),
            0,
            0,
            wallet.address,
            await timestamp()
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
          reserveQuote: "25053193364400984200",
          liquidityBalance: "15803893091560267185"
        },
        { targetRatioBase: 5,
          targetRatioQuote: 10,
          reserveBase: "10000000000000000000",
          reserveQuote: "20053867624313321125",
          liquidityBalance: "14137140215826058127"
        },
        { targetRatioBase: 4,
          targetRatioQuote: 10,
          reserveBase: "10000000000000000000",
          reserveQuote: "24932583523368831226",
          liquidityBalance: "15760732393118868969"
        },
        { targetRatioBase: 10,
          targetRatioQuote: 8,
          reserveBase: "10000000000000000000",
          reserveQuote: "8013680506685432793",
          liquidityBalance: "8929429978888105964"
        },
        { targetRatioBase: 1,
          targetRatioQuote: 12,
          reserveBase: "10000000000000000000",
          reserveQuote: "119903331804982423964",
          liquidityBalance: "34500993428091088712"
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
