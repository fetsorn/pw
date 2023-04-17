// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

struct PWConfig { 
    address admin;
    address keeper;
    address calibratorProxy;
    address vault;
    address pool;
    address quoteToken;
    uint emergencyth;
    uint volatilityth;
    uint frontrunth;
    uint decimals;
}
