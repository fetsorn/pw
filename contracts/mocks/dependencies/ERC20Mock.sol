//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../../interfaces/dependencies/IERC20.sol";

contract IERC20Mock is IERC20 {
    uint8 decimals;
    constructor(uint8 _decimals) {
        decimals = _decimals;
    }

    function decimals() external view override returns (uint8) {
        return(decimals);
    }
}