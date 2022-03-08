//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./../libraries/PWLibrary.sol";


contract PWLibraryMock {

  function computeXLP(uint _g, uint _pRatio, uint _lps, uint decimals) external view returns (uint) {
    return PWLibrary.computeXLP(_g, _pRatio, _lps, decimals);
  }

  function computeXLPForDirection(uint _g, uint _u, uint _p1, uint _pG2, PWLibrary.EAction _type, uint _lpsupply, uint decimals) external view returns (uint) {
    return PWLibrary.computeXLPForDirection(_g, _u, _p1, _pG2, _type, _lpsupply, decimals);
  }

  function computePRatio(uint n, uint p1, uint p2) external view returns (uint) {
    return PWLibrary.computePRatio(n, p1, p2);
  }

  function findDirection(uint p1, uint p2) external view returns (PWLibrary.EAction) {
    return PWLibrary.findDirection(p1, p2);
  }
}