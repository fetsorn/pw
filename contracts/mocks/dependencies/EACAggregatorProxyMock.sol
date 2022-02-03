//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "../../interfaces/dependencies/IEACAggregatorProxy.sol";

contract EACAggregatorProxyMock is IEACAggregatorProxy {

    int256 answer;
    uint8 decimals;

    constructor(int256 _answer, uint8 _decimals){
        answer = _answer;
        decimals = _decimals;
    }
    function latestRoundData() external view override returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        return(1, answer, 1, 1, 1);
    }

    function decimals() external view override returns (uint8) {
        return(decimals);
    }

    // mock function to test price changes
    function mockUpdatePrice(int256 _answer) {
        console.log("EACAggregatorProxyMock: mockUpdatePrice old price : ", answer);
        answer = _answer;
        console.log("EACAggregatorProxyMock: mockUpdatePrice new price : ", _answer);
    }
}