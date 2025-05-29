// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IDistributorFactory {
    struct DistributorInfo {
        address distributor;
        address owner;
        uint32 createdAt;
        bool isActive;
    }

    event DistributorCreated(uint256 indexed distributorId, address indexed distributor, address indexed owner);
    event DistributorDeactivated(uint256 indexed distributorId);

    // Functions
    function createDistributor(address owner) external returns (address distributor);

    function getOwnerDistributors(address owner) external view returns (uint256[] memory);

    function deactivateDistributor(uint256 distributorId) external;
}
