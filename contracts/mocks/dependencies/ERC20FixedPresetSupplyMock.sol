//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../../erc20/ERC20PresetFixedSupply.sol";

contract ERC20FixedPresetSupplyMock is ERC20PresetFixedSupply {
    // Let's say we have 1_000_000
    constructor() ERC20PresetFixedSupply("PW Pegger ETH", "pwETH", 1000000, msg.sender) public {
        
    }
}