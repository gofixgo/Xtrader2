//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./IERC20.sol";
import "./IUniswapV2Router02.sol";
import "./IUniswapV2Factory.sol";
import "./ISurge.sol";

contract PriceOracle {

    IUniswapV2Router02 router = IUniswapV2Router02(0x10ED43C718714eb63d5aA57B78B54704E256024E);

    mapping ( address => address ) underlyingAssets;
    mapping ( address => bool ) isApproved;

    constructor() {
        isApproved[msg.sender] = true;
        _addSurge(
            0x5B1d1BBDCc432213F83b15214B93Dc24D31855Ef, // SETH
            0x2170Ed0880ac9A755fd29B2688956BD959F933F8
        );
        _addSurge(
            0xb68c9D9BD82BdF4EeEcB22CAa7F3Ab94393108a1, // SBTC
            0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c
        );
        _addSurge(
            0xbF6bB9b8004942DFb3C1cDE3Cb950AF78ab8A5AF, // SADA 
            0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47
        );
        _addSurge(
            0x2e62e57d1D36517D4b0F329490AC1b78139967C0, // SUSLS
            0x2cd2664Ce5639e46c6a3125257361e01d0213657
        );
        _addSurge(
            0x254246331cacbC0b2ea12bEF6632E4C6075f60e2, // XUSD
            0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
        );
        _addSurge(
            0x14fEe7d23233AC941ADd278c123989b86eA7e1fF, // SUSD
            0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
        );
    }

    function approve(address user, bool isApproved_) external {
        require(isApproved[msg.sender], 'Not Approved');
        isApproved[user] = isApproved_;
    }

    function addSurge(address surge, address underlying) external {
        require(isApproved[msg.sender], 'Not Approved');
        _addSurge(surge, underlying);
    }

    function _addSurge(address surge, address underlyingAsset) internal {
        underlyingAssets[surge] = underlyingAsset;
    }
    
    function isSurge(address token) public view returns (bool) {
        return underlyingAssets[token] != address(0);
    }

    function LPStatsForSurge(address token, address underlying) external view returns (uint256, uint256, uint256) {
        (uint256 pr0, uint256 pr1) = _lpAmountsForToken(underlying);
        return (pr0, pr1, ISurge(token).calculatePrice());
    }

    function LPStatsForToken(address token) external view returns (uint256, uint256) {
        return _lpAmountsForToken(token);
    }

    /**
        Works For BNB, Regular Tokens And Surge Tokens
     */
    function priceOf(address token) public view returns (uint256) {
        if (token == 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c) return priceOfBNB();
        return isSurge(token) ? priceOfSurge(token, underlyingAssets[token]) : priceOfToken(token);
    }

    /**
        Takes An Array of Addresses and returns an equal sized array of prices
        Works For BNB, Regular Tokens And Surge Tokens
     */
    function pricesOf(address[] calldata tokens) external view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](tokens.length);
        for (uint i = 0; i < tokens.length; i++) {
            prices[i] = priceOf(tokens[i]);
        }
        return prices;
    }

    function priceOfToken(address token) public view returns (uint256) {
        (uint256 p0, uint256 p1) = _lpAmountsForToken(token);
        return( ( p1 * priceOfBNB()) / p0);
    }

    function priceOfSurge(address token, address underlying) public view returns (uint256) {
        (uint256 p0, uint256 p1) = _lpAmountsForToken(underlying);
        return( (p1 * priceOfBNB() * ISurge(token).calculatePrice() ) / (10**IERC20(underlying).decimals() * p0 ));
    }

    function priceOfBNB() public view returns (uint256) {
        address token = 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56;
        address LP = IUniswapV2Factory(router.factory()).getPair(token, router.WETH());
        uint256 amt0 = IERC20(token).balanceOf(LP);
        uint256 amt1 = IERC20(router.WETH()).balanceOf(LP);
        return ( amt0 * 10**18 / amt1);
    }

    function _lpAmountsForToken(address token) internal view returns (uint256, uint256) {
        address LP = IUniswapV2Factory(router.factory()).getPair(token, router.WETH());
        uint256 amt0 = IERC20(token).balanceOf(LP);
        uint256 amt1 = IERC20(router.WETH()).balanceOf(LP);
        return ( amt0 / 10**IERC20(token).decimals(), amt1 / 10**18);
    }
}