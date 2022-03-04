// https://etherscan.io/address/0xdc3ea94cd0ac27d9a86c180091e7f78c683d3699#code

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IEACAggregatorProxy {
    function latestRoundData() external view returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
    
    function decimals() external view returns (uint8);
}