// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
/// @dev Deliberately unrestricted synthetic token for local tests, never a production asset.
contract TestToken {
    string public constant name = "Velum Test USD";
    string public constant symbol = "vUSD";
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    bool public failTransfers;
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function setFailTransfers(bool fail) external { failTransfers = fail; }
    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransfers) return false;
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount; balanceOf[to] += amount; return true;
    }
}
