// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

struct PWConfig { 
    address admin;
    address keeper;
    address pricedonRef;
    address pwpegdonRef;
    address correctorup;
    address correctordown;
    address vault;
    uint emergencyth;
    uint volatilityth;
    uint frontrunth;
    uint decimals;
}
