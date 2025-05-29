// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./Distributor.sol";
import "./interfaces/IDistributorFactory.sol";

/**
 * @title DistributorFactory
 * @dev Factory contract for creating optimized distributor instances
 */
contract DistributorFactory is AccessControl, IDistributorFactory {
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    address private immutable admin;

    mapping(address => uint256[]) private ownerToDistributorIds;
    mapping(uint256 => DistributorInfo) public distributorInfos;

    uint256 public distributorCounter;

    constructor(address creator) {
        admin = msg.sender;

        _grantRole(CREATOR_ROLE, creator);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function createDistributor(address owner) external onlyRole(CREATOR_ROLE) returns (address distributor) {
        uint256 distributorId = distributorCounter++;
        distributor = address(new Distributor(admin, owner));

        distributorInfos[distributorId] = DistributorInfo({
            distributor: distributor,
            owner: owner,
            createdAt: uint32(block.timestamp),
            isActive: true
        });

        ownerToDistributorIds[owner].push(distributorId);
        emit DistributorCreated(distributorId, distributor, owner);
    }

    function getOwnerDistributors(address owner) external view returns (uint256[] memory) {
        return ownerToDistributorIds[owner];
    }

    function deactivateDistributor(uint256 distributorId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        distributorInfos[distributorId].isActive = false;
        emit DistributorDeactivated(distributorId);
    }
}
