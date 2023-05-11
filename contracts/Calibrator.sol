// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./libraries/Math.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IOGXPair.sol";
import "./interfaces/IOGXRouter02.sol";

contract Calibrator {
    IOGXRouter02 public router;
    IOGXPair public pair;
    IERC20 public tokenBase;
    IERC20 public tokenQuote;

    constructor(
        address _router,
        address _pair,
        address _tokenBase,
        address _tokenQuote
    ) {
        router = IOGXRouter02(_router);
        pair = IOGXPair(_pair);
        tokenBase = IERC20(_tokenBase);
        tokenQuote = IERC20(_tokenQuote);
    }

    function _removeLiquidity(uint256 reserveBaseInvariant) internal {
        uint256 availableLiquidity = pair.balanceOf(msg.sender);

        pair.transferFrom(msg.sender, address(this), availableLiquidity);

        uint256 totalSupply = pair.totalSupply();

        uint256 minimumLiquidity = Math.mulDiv(
            totalSupply,
            100000,
            reserveBaseInvariant
        );

        require(availableLiquidity >= minimumLiquidity, "E1");

        uint256 liquidity = availableLiquidity - minimumLiquidity;

        pair.approve(address(router), liquidity);

        router.removeLiquidity(
            address(tokenBase),
            address(tokenQuote),
            liquidity,
            0,
            0,
            address(this),
            block.timestamp + 3600
        );
    }

    function _swapToPrice(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) internal {
        (uint256 reserveBaseBefore, uint256 reserveQuoteBefore,) =
            pair.getReserves();

        uint256 targetRatio = targetRatioBase / targetRatioQuote;

        bool baseToQuote = Math.mulDiv(
            reserveBaseBefore,
            targetRatioQuote,
            reserveQuoteBefore
        ) < targetRatioBase;

        uint256 invariant = reserveBaseBefore * reserveQuoteBefore;

        uint256 leftSide = Math.sqrt(
            Math.mulDiv(
                invariant * 1000,
                baseToQuote ? targetRatioBase : targetRatioQuote,
                (baseToQuote ? targetRatioQuote : targetRatioBase) * 997
            )
        );

        uint256 rightSide = (
            baseToQuote ? reserveBaseBefore * 1000 : reserveQuoteBefore * 1000
        ) / 997;

        require(leftSide > rightSide, "E2");

        uint256 amountIn = leftSide - rightSide;

        if (baseToQuote) {
            // TODO: check if need to transfer additional funds
            // tokenBase.transferFrom(msg.sender, address(this), amountIn);

            tokenBase.approve(address(router), amountIn);
        } else {
            // tokenQuote.transferFrom(msg.sender, address(this), amountIn);

            tokenQuote.approve(address(router), amountIn);
        }

        address[] memory path = new address[](2);
        path[0] = baseToQuote ? address(tokenBase) : address(tokenQuote);
        path[1] = baseToQuote ? address(tokenQuote) : address(tokenBase);

        router.swapExactTokensForTokens(
            amountIn,
            0,
            path,
            address(this),
            block.timestamp + 3600
        );

        // TODO: validate price calibration
    }

    function _addLiquidity(uint256 reserveBaseInvariant) internal {
        (uint256 reserveBaseAfter, uint256 reserveQuoteAfter,) = pair
            .getReserves();

        uint256 amountBaseDesired = reserveBaseInvariant - reserveBaseAfter;

        // Library.quote()
        uint256 amountQuoteDesired = Math.mulDiv(
            amountBaseDesired,
            reserveQuoteAfter,
            reserveBaseAfter
        );

        tokenBase.approve(address(router), amountBaseDesired);

        // TODO: transfer only missing portion of tokens
        tokenQuote.transferFrom(msg.sender, address(this), amountQuoteDesired);

        tokenQuote.approve(address(router), amountQuoteDesired);

        router.addLiquidity(
            address(tokenBase),
            address(tokenQuote),
            amountBaseDesired,
            amountQuoteDesired,
            0,
            0,
            address(this),
            block.timestamp + 3600
        );
    }

    function _transfer() internal {
        // transfer liquidity to msg.sender
        pair.transfer(msg.sender, pair.balanceOf(address(this)));

        // transfer base tokens to msg.sender
        tokenBase.transfer(msg.sender, tokenBase.balanceOf(address(this)));

        // transfer quote tokens to msg.sender
        tokenQuote.transfer(msg.sender, tokenQuote.balanceOf(address(this)));

    }

    function _calibrate(
        uint256 targetRatioBase,
        uint256 targetRatioQuote,
        bool direction
    ) internal {
        (uint256 reserveBaseInvariant, uint256 reserveQuote,) = pair
            .getReserves();

        // TODO: check direction

        _removeLiquidity(reserveBaseInvariant);

        _swapToPrice(targetRatioBase, targetRatioQuote);

        _addLiquidity(reserveBaseInvariant);

        _transfer();
    }

    function calibrateUp(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) external {
        _calibrate(targetRatioBase, targetRatioQuote, true);
    }

    function calibrateDown(
        uint256 targetRatioBase,
        uint256 targetRatioQuote
    ) external {
        _calibrate(targetRatioBase, targetRatioQuote, false);
    }
}
