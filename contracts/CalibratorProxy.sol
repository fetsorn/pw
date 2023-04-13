//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./interfaces/ICalibrator.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


// File: CalibratorProxy.sol


/// @title Proxy contract for interaction with Calibrator contract
/// @notice Just simplifies calculations

contract CalibratorProxy is Ownable {

  ICalibrator private calibrator;
  IERC20 private base;

  constructor(
    ICalibrator _calibrator,
    IERC20 _base
  ) {
    calibrator = _calibrator;
    base = _base;
  }

  function calibratePurelyViaPercentOfLPs_baseTokenP(
    IUniswapV2Pair pool,
    uint256 _liquidity,
    uint256 n,
    uint256 d,
    address to
  ) external {
    uint256 amountOfLPs = _liquidity * n / d;

    (uint256 reserveBase, uint256 reserveQuote) = calibrator.getReserves(
      pool,
      address(base),
      address(calibrator.tokenFromPool(pool))
    );
    (
      uint256 reserveBaseAfter,
      uint256 reserveQuoteAfter,
      ,
      ,
      ,
      uint256 amountQuoteAfter
    ) = calibrator.estimateRemove(
      reserveBase,
      reserveQuote,
      pool.totalSupply(),
      pool.kLast(),
      amountOfLPs
    );

    pool.transferFrom(msg.sender, address(this), amountOfLPs);
    pool.approve(address(calibrator), amountOfLPs);

    uint256 amountOut = calibrator.getAmountOut(amountQuoteAfter, reserveQuoteAfter, reserveBaseAfter);

    calibrator.calibrate(
      pool,
      amountOfLPs,
      amountOut,
      to
    );
  }

  function calibratePurelyViaPercentOfLPs_DOWN(
    IUniswapV2Pair pool,
    uint256 _liquidity,
    uint256 n,
    uint256 d,
    address to
  ) external {
    uint256 amountOfLPs = _liquidity * n / d;

    (uint256 reserveBase, uint256 reserveQuote) = calibrator.getReserves(
      pool,
      address(base),
      address(calibrator.tokenFromPool(pool))
    );
    (
      uint256 reserveBaseAfter,
      uint256 reserveQuoteAfter,
      ,
      ,
      uint256 amountBaseAfter,
      
    ) = calibrator.estimateRemove(
      reserveBase,
      reserveQuote,
      pool.totalSupply(),
      pool.kLast(),
      amountOfLPs
    );

    pool.transferFrom(msg.sender, address(this), amountOfLPs);
    pool.approve(address(calibrator), amountOfLPs);

    uint256 amountOut = calibrator.getAmountOut(amountBaseAfter, reserveBaseAfter, reserveQuoteAfter);

    calibrator.calibrateDown(
      pool,
      amountOfLPs,
      amountOut,
      to
    );
  }  
}

