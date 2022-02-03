//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../../interfaces/dependencies/IUniswapV2Pair.sol";

contract UniswapV2PairMock is IUniswapV2Pair {
    address token0;
    address token1;
    uint8 decimals;
    uint totalSupply;
    uint112 reserve0;
    uint112 reserve1;

    constructor(
            address _token0, 
            address _token1, 
            uint8 _decimals, 
            uint _totalSupply, 
            uint112 _reserve0,
            uint112 _reserve1
            ) {
        token0 = _token0;
        token1 = _token1;
        decimals = _decimals;
        totalSupply = _totalSupply;

        reserve0 = _reserve0;
        reserve1 = _reserve1;


    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return(reserve0, reserve1, 0);
    }
    function token0() external view returns (address) {
        return(token0);
    }
    function token1() external view returns (address) {
        return(token1);
    }

    function decimals() external pure returns (uint8) {
        return(decimals);
    }
    function totalSupply() external view returns (uint) {
        return(totalSupply);
    }
}