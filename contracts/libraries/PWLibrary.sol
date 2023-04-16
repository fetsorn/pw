//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library PWLibrary {

  enum PriceDirection {
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

  function computeXLPForDirection(
    uint _quoteToken, 
    uint _baseToken, 
    uint _currentPrice, 
    uint _newPrice, 
    PriceDirection _type, 
    uint _lpTotalSupply, 
    uint decimals
  ) internal pure returns (uint _xlps) {
    // we have 2 formulas:
    // Up-Intervention: g*P1 + u = g’*P2 + u’, where g - withdrawable token, u - I-invariant (u = u'), P = u/g
    // Down-Intervention: g + u*Pu1 = g' + u'*Pu2, where u - withdrawable token, g - I-invariant, Pu = g/u = P^-1 = 1/P
    uint n = 10**decimals;
    uint pRatio;

    if (_type == PriceDirection.Up) {
      pRatio = computePRatio(n, _currentPrice, _newPrice); // basic case: P1 & P2
      _xlps = computeXLP(_quoteToken, pRatio, _lpTotalSupply, decimals); //withdrawable token is _quoteToken
    } else if (_type == PriceDirection.Down) {
      pRatio = computePRatio(n, n**2 / _currentPrice, n**2 / _newPrice); // reverse prices: Pu1 & Pu2
      _xlps = computeXLP(_baseToken, pRatio, _lpTotalSupply, decimals); //withdrawable token is _baseToken
    } else {
      revert("Error: unknown type");
    }
    return _xlps;
  }

function findDirection(uint p1, uint p2) internal pure returns (PriceDirection _type) {
  _type = p1 >= p2 ? PriceDirection.Down : PriceDirection.Up;
  return _type;
}

function computePRatio(uint n, uint pw1, uint pw2) internal pure returns (uint _ratio) {
  // w' - w < 0 always, where w - withdrawable token, pw - w token price
  require(pw2 > pw1, "Error: computePRatio must be pw2 > pw1");
  require(pw1 > 0, "Error: computePRatio pw1 must be higher than 0");
  return ( n - ( pw1 * n / pw2 ) ); // decimaled 1 - pw1/pw2
  }
}
