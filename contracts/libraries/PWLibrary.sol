//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// import "./interfaces/IPWPegger.sol";
// import "./interfaces/ICalibratorProxy.sol";
// import "./interfaces/lib/PWConfig.sol";
// import "./interfaces/dependencies/IEACAggregatorProxy.sol";
// import "./interfaces/dependencies/IERC20.sol";
// import "./interfaces/dependencies/IUniswapV2Pair.sol";


library PWLibrary {

  function computeXLP(uint _g, uint _pRatio, uint _lps, uint decimals) internal pure returns (uint _xlps) {
    require(_pRatio > 0 && _g > 0 && _lps > 0, "Error: computeLP2Calibrator wrong input args");
    // g*P1 + u = g’*P2 + u’, where P1 is a price of g in u; u == u' =>
    // => dg = g’ - g or dg = g*(P1/P2 - 1) => mdg = g*(1 - P1/P2)
    uint n = 10**decimals;
    uint mdg = _g*_pRatio;
    uint hasToBeExtractedG = mdg/2;
    uint hasToBeExtractedLPShare = n*hasToBeExtractedG/_g;
    _xlps = _lps*hasToBeExtractedLPShare/n; //_lps has its own decimals
  }

  // function computeXLPForDirection(uint _g, uint _u, uint _p1, uint _pG2, uint8 _type, uint _lpsupply, uint decimals) internal pure returns (uint _xlps) {
  //   uint n = 10*decimals;
  //   uint pRatio;

  //   if (_type == 0) {
  //       pRatio = (n - _p1*n/_pG2)/n;
  //   } else if (_type == 1) {
  //       uint p1 = n*_g/_u;
  //       uint p2 = n/_pG2;
  //       pRatio = (n - p1*n/p2)/n;
  //   } else {
  //     revert("unknown type");
  //   }
  //   _xlps = computeXLP(_g, pRatio, _lpsupply, decimals);
  // }
}