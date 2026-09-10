// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * $FARM — ERC-20 on Robinhood Chain (chain ID 4663).
 *
 * AUDIT REQUIRED before mainnet deployment with real user funds.
 * Deploy + verify source on https://explorer.mainnet.chain.robinhood.com
 * Being on Robinhood Chain does NOT mean the token is listed in the
 * Robinhood brokerage app — that is a separate process.
 */
contract FarmToken is ERC20, Ownable {
    constructor(address initialOwner, uint256 initialSupply)
        ERC20("Pump Farm", "FARM")
        Ownable(initialOwner)
    {
        _mint(initialOwner, initialSupply);
    }
}
