// //SPDX-License-Identifier: Unlicense
// pragma solidity ^0.8.0;

// import "../../interfaces/IUniswapV2Pair.sol";

// contract UniswapV2PairMock is IUniswapV2Pair {
//     address vtoken0;
//     address vtoken1;
//     uint vtotalSupply;
//     uint112 reserve0;
//     uint112 reserve1;

//     constructor(
//             address _token0, 
//             address _token1,
//             uint _totalSupply, 
//             uint112 _reserve0,
//             uint112 _reserve1
//             ) {
//         vtoken0 = _token0;
//         vtoken1 = _token1;
//         vtotalSupply = _totalSupply;

//         reserve0 = _reserve0;
//         reserve1 = _reserve1;
//     }

//     function getReserves() external view override returns (uint112, uint112, uint32) {
//         return(reserve0, reserve1, 0);
//     }
//     function token0() external view override returns (address) {
//         return(vtoken0);
//     }
//     function token1() external view override returns (address) {
//         return(vtoken1);
//     }

//     function decimals() external pure override returns (uint8) {
//         uint8 _decimals = 18; //hardcoded because it's immutable const; for mock it's ok
//         return(_decimals);
//     }
    
//     function totalSupply() external view override returns (uint) {
//         return(vtotalSupply);
//     }

//     function transferFrom(address _from, address _to, uint256 _value) external override returns (bool success) {
//         return true;
//     }
//     function approve(address _spender, uint256 _value) external override returns (bool success) {
//         return true;
//     }
// }