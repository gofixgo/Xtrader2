//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface ISurge {
    function calculatePrice() external view returns (uint256);
}