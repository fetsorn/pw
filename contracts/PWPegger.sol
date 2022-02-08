//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IPWPegger.sol";
import "./interfaces/lib/PWConfig.sol";
import "./interfaces/dependencies/IEACAggregatorProxy.sol";

enum EAction {
    Up,
    Down
}

contract PWPegger is IPWPegger {
    PWConfig private pwconfig;
    bool statusPause;
    uint round;

    modifier onlyAdmin() {
        require(msg.sender == pwconfig.admin, "Error: must be admin EOA or multisig only");
        _;
    }

    modifier onlyKeeper() {
        require(msg.sender == pwconfig.admin || msg.sender == pwconfig.keeper, 
            "Error: must be admin or keeper EOA/multisig only");
        _;
    }

    modifier onlyNotPaused() {
        require(!statusPause, "PWPeggerMock in on Pause now");
        _;
    }

    constructor(PWConfig memory _pwconfig) {
        uint _dec = _pwconfig.decimals;
        require(
            _dec > 0 && (
                _pwconfig.frontrunth % _dec +
                _pwconfig.volatilityth % _dec +
                _pwconfig.emergencyth % _dec == 0
            ) &&
            _pwconfig.frontrunth > 0 && 
            _pwconfig.volatilityth > _pwconfig.frontrunth &&
            _pwconfig.emergencyth > _pwconfig.volatilityth,
            "Error: wrong config parameters. Check th params and decimals"
            );
        require(msg.sender != _pwconfig.admin, "Error: deployer cannot be an admin");
        pwconfig = _pwconfig;
        statusPause = false;
        round = 0;
    }

    function updAdmin(address _newAdmin) external override onlyAdmin() {
        pwconfig.admin = _newAdmin;
    }

    function updKeeper(address _newKeeper) external override onlyAdmin() {
        pwconfig.keeper = _newKeeper;
    }

    function updCurrentDONRef(address _newPricedonRef) external override onlyAdmin() {
        pwconfig.pricedonRef = _newPricedonRef;
    }

    function updPathwayDONRef(address _newPwpegdonRef) external override onlyAdmin() {
        pwconfig.pwpegdonRef = _newPwpegdonRef;
    }

    function updCorrectorUpProxyRef(address _newCorrectorup) external override onlyAdmin() {
        pwconfig.correctorup = _newCorrectorup;
    }

    function updCorrectorDownProxyRef(address _newCorrectordown) external override onlyAdmin() {
        pwconfig.correctordown = _newCorrectordown;
    }

    function updVaultRef(address _newVault) external override onlyAdmin() {
        pwconfig.vault = _newVault;
    }

    function setPauseOn() external override onlyKeeper() onlyNotPaused() {
        statusPause = true;
    }

    function setPauseOff() external override onlyAdmin() {
        statusPause = false;
    }

    function getPauseStatus() external override view returns (bool) {
        return statusPause;
    }

    function updPoolRef(address _pool) external override onlyAdmin() {
        pwconfig.pool = _pool;
    }

    function updTokenRef(address _token) external override onlyAdmin() {
        pwconfig.token = _token;
    }

    function updEmergencyTh(uint _newEmergencyth) external override onlyAdmin() {
        pwconfig.emergencyth = _newEmergencyth;
    }

    function updVolatilityTh(uint _newVolatilityth) external override onlyAdmin() {
        pwconfig.volatilityth = _newVolatilityth;
    }

    function updFrontRunProtectionTh(uint _newFrontrunth) external override onlyAdmin() {
        pwconfig.frontrunth = _newFrontrunth;
    }

    function _checkThConditionsOrRaiseException(uint _currPrice, uint _pwPrice) view internal {
        if (_currPrice >= _pwPrice) {
            require(_currPrice - _pwPrice < pwconfig.emergencyth, 
                "Th Emergency Error: current price is much higher than pwPrice");
            require(_currPrice - _pwPrice >= pwconfig.volatilityth, 
                "Th Volatility Error: current price is not enough higher than pwPrice");
        } else {
            require(_pwPrice - _currPrice < pwconfig.emergencyth, 
                "Th Emergency Error: pwPrice price is much higher than current");
            require(_pwPrice - _currPrice >= pwconfig.volatilityth, 
                "Th Volatility Error: pwPrice price is not enough higher than current");
        }
    }

    function _checkThFrontrunOrRaiseException(uint _currPrice, uint _keeperPrice) view internal {
        // additional logic to prevent frontrun attack can be added here: VRF check as an example
        if (_currPrice >= _keeperPrice) {
            require(_currPrice - _keeperPrice <= pwconfig.frontrunth,
                "Th FrontRun Error: current price is much higher than keeperPrice");
        } else {
            require(_keeperPrice - _currPrice <= pwconfig.emergencyth, 
                "Th Emergency Error: current price is much higher than keeperPrice");
        }
    }

    // those functions are reading and convert data to the correct decimals for price data
    function _readDONPrice(address _refDON) view internal returns (uint) {
        IEACAggregatorProxy priceFeed = IEACAggregatorProxy(_refDON);
        (            
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        uint decimals = priceFeed.decimals();
        require(decimals >= 0 && answer > 0, 'DON Error: price data and decimals must be higher than 0');
        uint n = 10**pwconfig.decimals;
        uint d = 10**decimals;
        return (uint(answer)*n/d);
    }

    function callIntervention(uint _keeperCurrentPrice) external override onlyKeeper() onlyNotPaused() {
        require(_keeperCurrentPrice > 0, 'Call Error: _keeperCurrentPrice must be higher than 0');
        uint cPrice = _readDONPrice(pwconfig.pricedonRef);
        uint pPrice = _readDONPrice(pwconfig.pwpegdonRef);

        _checkThConditionsOrRaiseException(cPrice, pPrice);
        _checkThFrontrunOrRaiseException(cPrice, _keeperCurrentPrice);
        
        EAction act = pPrice > cPrice ? EAction.Up : EAction.Down;
        // what to do: up or down
        // how many LPs: g' = g*(1 - P1/P2), LP contains g/2 tokens rest will come with swap
        // execute:




        round = round + 1;
        console.log("callIntervention a PWPegger with _keeperCurrentPrice:", _keeperCurrentPrice);
    }

    function getPWConfig() external override view returns (PWConfig memory) {
        return pwconfig;
    }

    function getLastRoundNumber() external override view returns (uint) {
        return round;
    }
}
