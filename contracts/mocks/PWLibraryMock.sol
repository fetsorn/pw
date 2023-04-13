//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./../libraries/PWLibrary.sol";


contract PWLibraryMock {

  function computeXLP(uint _quoteToken, uint _pRatio, uint _lps, uint decimals) external view returns (uint) {
    return PWLibrary.computeXLP(_quoteToken, _pRatio, _lps, decimals);
  }

  function computeXLPForDirection(uint _quoteToken, uint _baseToken, uint _p1, uint _pG2, PWLibrary.EAction _type, uint _lpTotalSupply, uint decimals) external view returns (uint) {
    return PWLibrary.computeXLPForDirection(_quoteToken, _baseToken, _p1, _pG2, _type, _lpTotalSupply, decimals);
  }

  function computePRatio(uint n, uint p1, uint p2) external view returns (uint) {
    return PWLibrary.computePRatio(n, p1, p2);
  }

  function findDirection(uint p1, uint p2) external view returns (PWLibrary.EAction) {
    return PWLibrary.findDirection(p1, p2);
  }
}