//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./IERC20.sol";
import "./IWETH.sol";
import "./IUniswapV2Router02.sol";
import "./IUniswapV2Factory.sol";
import "./IUniswapV2Pair.sol";

interface ICalibrator {

  function getQuoteToken(IUniswapV2Pair pool) external view returns (IERC20 token);

  function getReserves(
    IUniswapV2Pair pool,
    address tokenA,
    address tokenB
  ) external view returns (uint256 reserveA, uint256 reserveB);

  function estimateRemove(
    uint256 reserveBaseBefore,
    uint256 reserveQuoteBefore,
    uint256 totalSupplyBefore,
    uint256 kLastBefore,
    uint256 amountToRemove
  )
    external
    view
    returns (
      uint256 reserveBaseAfter,
      uint256 reserveQuoteAfter,
      uint256 totalSupplyAfter,
      uint256 kLastAfter,
      uint256 amountBaseAfter,
      uint256 amountQuoteAfter
    );

  function calibrateDown(
    IUniswapV2Pair pool,
    uint256 liquidity,
    uint256 amountBuy,
    address to
  ) external;

  function calibrate(
    IUniswapV2Pair pool,
    uint256 liquidity,
    uint256 amountBuy,
    address to
  ) external;

  function getAmountOut(
    uint256 amountIn,
    uint256 reserveIn,
    uint256 reserveOut
  ) external view returns (uint256 amountOut);

  function estimateSell(
    uint256 reserveBaseBefore,
    uint256 reserveQuoteBefore,
    uint256 amountBaseSell
  )
    external
    view
    returns (
      uint256 reserveBaseAfter,
      uint256 reserveQuoteAfter,
      uint256 amountQuoteBuy
    );

  function estimateBuy(
    uint256 reserveBaseBefore,
    uint256 reserveQuoteBefore,
    uint256 amountBaseBuy
  )
    external
    view
    returns (
      uint256 reserveBaseAfter,
      uint256 reserveQuoteAfter,
      uint256 amountQuoteSell
    );

  function getRouter() external view returns (address rtr);
}
