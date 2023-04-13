// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../libraries/PWConfig.sol";

interface IPWPegger {
    // admin (permissioned) - EOA or multisig account who is able to chnage configuration of the PW
    function updateAdmin(address) external; // admin only

    // keeper (permissioned) - EOA or multisig oracle account who is able to call sc invocation
    function updateKeeper(address) external; // admin only

    // admin only is able to update Corrector SCs refference: CalibratorProxy
    // increasing/decreasing gov token price on AMM during pw-intervention call
    function updateCalibratorProxyRef(address) external; // admin only

    // admin only is able to update vault account associated with pw as funds and LP ops storage
    function updateVaultRef(address) external; // admin only

    // admin and keeper oracle are able to pause sc, but only admin can activate it back
    function setPauseOn() external; // keeper and admin
    function setPauseOff() external; // admin only
    function getPauseStatus() external view returns(bool);

    // amm pool data
    function updatePoolRef(address) external; // admin only
    function updateTokenRef(address) external; // admin only

    // admin only is able to update threshold parameters in %*BASE_DECIMALS: 0.1% => 100 if BASE_DECIMALS == 10^3
    // emergency threshold used to set pause on if price and peg DONs are far from each other
    function updateEmergencyTh(uint) external; // admin only
    // volatility threshold used to succefully do or don't pw intervention
    function updateVolatilityTh(uint) external; // admin only
    // volatility threshold used to prevent front run attack during an intervention call
    function updateFrontRunProtectionTh(uint) external; // admin only
    // threasholds values must be: E > V > F > 0

    // callIntervention is a main function initializing pw-intervention, called by keeper oracle
    // intervention is comparing keeperCurrentPrice with currentPrice to prevent frontrun
    function callIntervention(uint _keeperCurrentPrice) external; // keeper and admin

    function getPWConfig() external view returns (PWConfig memory);

    // counting how many times intervention succesfully happened
    function getLastRoundNumber() external view returns (uint);
}