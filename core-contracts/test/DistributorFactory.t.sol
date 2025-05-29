// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/DistributorFactory.sol";
import "../src/Distributor.sol";

contract DistributorFactoryTest is Test {
    // event NewDistributor(address indexed distributor, address indexed owner);

    DistributorFactory public factory;
    address public owner;
    address public creator;
    address public user1;
    address public user2;
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        creator = address(0x3);
        factory = new DistributorFactory(creator);
    }

    function test_create_distributor() public {
        vm.prank(creator); // Set the creator as the sender
        address distributorAddress = factory.createDistributor(user1);

        assertTrue(distributorAddress != address(0), "Distributor address should not be zero");

        vm.prank(user1); // Set the user1 as the sender
        uint256[] memory distributors = factory.getOwnerDistributors(user1);
        assertEq(distributors.length, 1, "Should have one Distributor");

        (address distributor, , , ) = factory.distributorInfos(distributors[0]);
        assertEq(distributor, distributorAddress, "Distributor address mismatch");
    }

    function test_create_multiple_distributors() public {
        vm.startPrank(creator);

        address distributor1 = factory.createDistributor(user1);
        address distributor2 = factory.createDistributor(user1);
        address distributor3 = factory.createDistributor(user1);

        uint256[] memory distributors = factory.getOwnerDistributors(user1);
        assertEq(distributors.length, 3, "Should have three Distributors");

        (address distributor1Address, , , ) = factory.distributorInfos(distributors[0]);
        (address distributor2Address, , , ) = factory.distributorInfos(distributors[1]);
        (address distributor3Address, , , ) = factory.distributorInfos(distributors[2]);

        assertEq(distributor1Address, distributor1, "First Distributor address mismatch");
        assertEq(distributor2Address, distributor2, "Second Distributor address mismatch");
        assertEq(distributor3Address, distributor3, "Third Distributor address mismatch");

        vm.stopPrank();
    }

    function test_distributor_ownership() public {
        vm.prank(creator);
        address distributorAddress = factory.createDistributor(user1);

        Distributor distributor = Distributor(payable(distributorAddress));

        assertEq(distributor.hasRole(OPERATOR_ROLE, user1), true, "User1 should have OPERATOR_ROLE");
    }

    function test_get_distributors_for_different_users() public {
        vm.prank(creator);
        factory.createDistributor(user1);
        factory.createDistributor(user2);

        vm.prank(user1);
        uint256[] memory user1Distributors = factory.getOwnerDistributors(user1);
        assertEq(user1Distributors.length, 1, "User1 should have one Distributor");

        vm.prank(user2);
        uint256[] memory user2Distributors = factory.getOwnerDistributors(user2);
        assertEq(user2Distributors.length, 1, "User2 should have one Distributor");

        assertTrue(user1Distributors[0] != user2Distributors[0], "Users should have different Distributors");
    }
}
