// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IPWPegger {
    function greet() external view returns (string memory);
    function setGreeting(string memory _greeting) external;
}