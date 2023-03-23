// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

struct PWConfig { 
    address admin;
    address keeper;
    address calibrator;
    address vault;
    address pool;
    address token;
    uint emergencyth;
    uint volatilityth;
    uint frontrunth;
    uint decimals;
}
