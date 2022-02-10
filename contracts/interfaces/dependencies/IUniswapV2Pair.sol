// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IUniswapV2Pair {
    // Pool balance interface
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    // LP token interface
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint);

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);
    function approve(address _spender, uint256 _value) public returns (bool success);

}