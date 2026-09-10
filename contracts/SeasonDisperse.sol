// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Minimal multi-send for Season / Harvest Round payouts on Robinhood Chain.
 * Prefer an existing audited disperse if one is already on-chain;
 * otherwise audit this (or a hardened fork) before mainnet use.
 *
 * Ops wallet must hold ETH for gas + the payout asset (ETH or $FARM ERC-20).
 * Keep dry-run / idempotency in the off-chain scheduler — this contract only
 * executes a single batched transfer call.
 */
contract SeasonDisperse {
    error LengthMismatch();
    error TransferFailed();

    event Dispersed(address indexed token, uint256 recipients, uint256 total);

    /// @notice Disperse native ETH to many recipients in one tx.
    function disperseEther(address payable[] calldata recipients, uint256[] calldata values)
        external
        payable
    {
        if (recipients.length != values.length) revert LengthMismatch();
        uint256 total;
        for (uint256 i = 0; i < recipients.length; ) {
            total += values[i];
            (bool ok, ) = recipients[i].call{value: values[i]}("");
            if (!ok) revert TransferFailed();
            unchecked {
                ++i;
            }
        }
        emit Dispersed(address(0), recipients.length, total);
    }

    /// @notice Disperse an ERC-20 (e.g. $FARM) — caller must approve this contract first.
    function disperseToken(address token, address[] calldata recipients, uint256[] calldata values)
        external
    {
        if (recipients.length != values.length) revert LengthMismatch();
        uint256 total;
        for (uint256 i = 0; i < recipients.length; ) {
            total += values[i];
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, recipients[i], values[i])
            );
            if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
            unchecked {
                ++i;
            }
        }
        emit Dispersed(token, recipients.length, total);
    }
}
