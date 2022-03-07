//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


library PWLibrary {

  enum EAction {
    Up,
    Down
  }

  function computeXLP(uint _w, uint _pRatio, uint _lps, uint decimals) internal pure returns (uint _xlps) {
    require(_pRatio > 0 && _w > 0 && _lps > 0, "Error: computeLP2Calibrator wrong input args");
    // we have to compute how many w tokens must be extracted and how much its share in LP
    uint n = 10**decimals;
    uint mdg = (_w * _pRatio) / n; // abs of w' - w
    uint hasToBeExtractedW = mdg / 2;
    uint hasToBeExtractedLPShare = ( n * hasToBeExtractedW ) / _w;
    _xlps = ( _lps * hasToBeExtractedLPShare) / n; //_lps has its own decimals
  }

  function computeXLPForDirection(uint _g, uint _u, uint _pG1, uint _pG2, EAction _type, uint _lpsupply, uint decimals) internal pure returns (uint _xlps) {
    // we have 2 formulas:
    // Up-Intervention: g*P1 + u = g’*P2 + u’, where g - withdrawable token, u - I-invariant (u = u'), P = u/g
    // Down-Intervention: g + u*Pu1 = g' + u'*Pu2, where u - withdrawable token, g - I-invariant, Pu = g/u = P^-1 = 1/P
    uint n = 10**decimals;
    uint pRatio;

    if (_type == EAction.Up) {
      pRatio = computePRatio(n, _pG1, _pG2); // basic case: P1 & P2
      _xlps = computeXLP(_g, pRatio, _lpsupply, decimals); //withdrawable token is _g
    } else if (_type == EAction.Down) {
      pRatio = computePRatio(n, n / _pG1, n / _pG2); // reverse prices: Pu1 & Pu2
      _xlps = computeXLP(_u, pRatio, _lpsupply, decimals); //withdrawable token is _u
    } else {
      revert("Error: unknown type");
    }
    return _xlps;
  }

function findDirection(uint p1, uint p2) internal pure returns (EAction _type) {
  _type = p1 >= p2 ? EAction.Down : EAction.Up;
  return _type;
}

function computePRatio(uint n, uint pw1, uint pw2) internal pure returns (uint _ratio) {
  // w' - w < 0 always, where w - withdrawable token, pw - w token price
  require(pw2 > pw1, "Error: computePRatio must be pw2 > pw1");
  require(pw1 > 0, "Error: computePRatio pw1 must be higher than 0");
  return ( n - ( pw1 * n / pw2 ) ); // decimaled 1 - pw1/pw2
  }
}