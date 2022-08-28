// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20("", "") {
  mapping(address => bool) public auth;

  function mint(address to, uint256 value) external {
    super._mint(to, value);
  }

  function burn(address from, uint256 value) external {
    super._burn(from, value);
  }
}
