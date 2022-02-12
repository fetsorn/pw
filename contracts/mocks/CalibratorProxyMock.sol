//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/ICalibratorProxy.sol";

contract CalibratorProxyMock is ICalibratorProxy {

    uint lps; //dummy var to check the logic in the TDD tests
    uint upOrDown;
    address vault;

    constructor() {
        lps = 0; // dummy constructor
        upOrDown = 0;
    }

    function calibratePurelyViaPercentOfLPs_UP(
        IUniswapV2Pair pool,
        uint256 _liquidity,
        uint256 n,
        uint256 d,
        address to
    ) external override {
        require(n == 1 && d == 1, "Error: wrong n and d params, must be 1");
        lps = _liquidity;
        upOrDown = 1; // 1 means Up
        vault = to;
    }

    function calibratePurelyViaPercentOfLPs_DOWN(
        IUniswapV2Pair pool,
        uint256 _liquidity,
        uint256 n,
        uint256 d,
        address to
    ) external override {
        require(n == 1 && d == 1, "Error: wrong n and d params, must be 1");
        lps = _liquidity;
        upOrDown = 2; // 2 means Down
        vault = to;
    }

    function mockCheckLPs() external view returns (uint) {
        return lps;
    }

    function mockCheckType() external view returns (uint) {
        return upOrDown;
    }

    function mockVault() external view returns (address) {
        return vault;
    }

}