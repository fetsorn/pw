// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./IUniswapV2Pair.sol";

interface ICalibratorProxy {
    function calibratePurelyViaPercentOfLPs_baseTokenP(
        IUniswapV2Pair pool,
        uint256 _liquidity,
        uint256 numerator,
        uint256 denominator,
        address to
    ) external; 

    function calibratePurelyViaPercentOfLPs_DOWN(
        IUniswapV2Pair pool,
        uint256 _liquidity,
        uint256 numerator,
        uint256 denominator,
        address to
    ) external; 
  }