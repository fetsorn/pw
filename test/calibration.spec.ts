import { ethers, waffle } from "hardhat"
import { BigNumber as BN } from "bignumber.js";
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers"
import { TestERC20 } from "../typechain/TestERC20"
import { WrappedNative } from "../typechain/WrappedNative"
import { OGXPair } from "../typechain/OGXPair"
import { OGXFactory } from "../typechain/OGXFactory"
import { OGXRouter02 } from "../typechain/OGXRouter02"
import { uniswapFixture } from "./shared/fixtures"
import { expect } from "./shared/expect"
import { expandTo18Decimals, ZERO_ADDR } from "./shared/utilities"

describe("OGX", () => {
    const [wallet, other] = waffle.provider.getWallets()

    let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

    before("create fixture loader", async () => {
        loadFixture = waffle.createFixtureLoader([wallet, other])
    })

    let tokenBase: TestERC20
    let tokenQuote: TestERC20
    let weth: WrappedNative
    let factory: OGXFactory
    let router: OGXRouter02
    let pair: OGXPair
    let startingBalance: BigNumber

    beforeEach("deploy test contracts", async () => {
        ;({ tokenBase,
            tokenQuote,
            weth,
            factory,
            router,
            pair } = await loadFixture(uniswapFixture))

        startingBalance = await wallet.provider.getBalance(wallet.address)
    })

    async function timestamp() {
        let block = await wallet.provider.getBlock("latest")

        let timestamp = block.timestamp + 3600

        return timestamp
    }

    async function state() {
        const [reserveBase, reserveToken] = await pair.getReserves();

        const liquidity = await pair.balanceOf(wallet.address)

        return [
            reserveBase.toString(),
            reserveToken.toString(),
            liquidity.toString()
        ]
    }

    async function calibrate(
        targetRatioBase: BN,
        targetRatioQuote: BN
    ) {
        const [reserveBaseInvariant] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        // remove all available liquidity
        const liquidity = await pair.balanceOf(wallet.address);

        await pair.approve(router.address, liquidity);

        // TODO: preserve minimum liquidity required for 3 decimal precision
        // define a range of available precise trades for given liquidity and quote
        await router.removeLiquidity(
            tokenBase.address,
            tokenQuote.address,
            liquidity.div(2),
            0,
            0,
            wallet.address,
            await timestamp()
        );

        // calibrate pool to target ratio
        const [reserveBaseBefore, reserveQuoteBefore] = (await pair.getReserves()).map((n) => new BN(n.toString()));

        const targetRatio = targetRatioBase.div(targetRatioQuote);

        const aToB = reserveBaseBefore.div(reserveQuoteBefore).lt(targetRatio);

        // TODO account for fees in swap
        const invariant = reserveBaseBefore.times(reserveQuoteBefore);

        const leftSide = aToB
            ? invariant.times(targetRatioBase).div(targetRatioQuote).sqrt()
            : invariant.times(targetRatioQuote).div(targetRatioBase).sqrt();

        const rightSide = aToB ? reserveBaseBefore : reserveQuoteBefore;

        expect(leftSide.gt(rightSide));

        const amountIn = leftSide.minus(rightSide).integerValue();

        if (aToB) {
            await tokenBase.approve(router.address, amountIn.toString());
        } else {
            await tokenQuote.approve(router.address, amountIn.toString());
        }

        const path = aToB
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
            reserveBaseAfter.div(reserveQuoteAfter).decimalPlaces(3).toString()
        ).to.equal(
            targetRatioBase.div(targetRatioQuote).decimalPlaces(3).toString()
        );

        // add liquidity such that amount of base is invariant
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

    describe("#calibrate", async () => {
        it("matches estimates", async () => {

            expect(await state()).to.deep.equal([
                "10000000000000000000",
                "49933035714285714285",
                "22321428571428570428"
            ]);

            await calibrate(new BN(4), new BN(10));

            expect(await state()).to.deep.equal([
                "10000000000000000000",
                "25021950698943729146",
                "15794213534512120611"
            ]);

            await calibrate(new BN(5), new BN(10));

            expect(await state()).to.deep.equal([
                "10000000000000000000",
                "20006359934794620302",
                "14120576275507200363"
            ]);

            await calibrate(new BN(4), new BN(10));

            expect(await state()).to.deep.equal([
                "10000000000000000000",
                "24992092704412095275",
                "15779782067642114128"
            ]);
        })
    })
})
