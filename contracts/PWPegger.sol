//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
// import "./interfaces/IPWPegger.sol";

contract PWPegger {
    string private greeting;

    constructor(string memory _greeting) {
        console.log("Deploying a PWPegger with greeting:", _greeting);
        greeting = _greeting;
    }

    function greet() external view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) external {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
    }
}
