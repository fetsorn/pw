//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


library PWLibrary {

  enum EAction {
    Up,
    Down
  }

  function computeXLP(uint _g, uint _pRatio, uint _lps, uint decimals) internal pure returns (uint _xlps) {
    require(_pRatio > 0 && _g > 0 && _lps > 0, "Error: computeLP2Calibrator wrong input args");
    // g*P1 + u = g’*P2 + u’, where P1 is a price of g in u; u == u' =>
    // => dg = g’ - g or dg = g*(P1/P2 - 1) => mdg = g*(1 - P1/P2)
    uint n = 10**decimals;
    uint mdg = _g / n * _pRatio;
    uint hasToBeExtractedG = mdg / 2;
    uint hasToBeExtractedLPShare = n * hasToBeExtractedG / _g;
    _xlps = _lps*hasToBeExtractedLPShare/n; //_lps has its own decimals
  }

  function computeXLPForDirection(uint _g, uint _u, uint _p1, uint _pG2, EAction _type, uint _lpsupply, uint decimals) internal view returns (uint _xlps) {
    uint n = 10**decimals;
    uint pRatio;

    if (_type == EAction.Up) {
      pRatio = computePRatio(n, _p1, _pG2);
    } else if (_type == EAction.Down) {
      // uint p1 = n * _g / _u;
      // uint p2 = n / _pG2;
      pRatio = computePRatio(n, _pG2, _p1);
    } else {
      revert("unknown type");
    }

    _xlps = computeXLP(_g, pRatio, _lpsupply, decimals);
  }

function computePRatio(uint n, uint p1, uint p2) internal pure returns (uint _ratio) {
    require(p1 > 0 && p2 > 0, "Error: computePRatio wrong input args");
    if (p1 >= p2) {
      return ( ( p1 * n / p2 ) - n );
    } else {
      return ( n - ( p1 * n / p2 ) );
    }
  }
}