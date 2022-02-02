// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./IUniswapV2Pair.sol";

interface ICalibratorProxy {
    function calibratePurelyViaPercentOfLPs(
        IUniswapV2Pair pool,
        uint256 _liquidity,
        uint256 n,
        uint256 d,
        address to
    ) external; 
  }