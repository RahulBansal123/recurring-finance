pragma solidity ^0.8.20;

import "forge-std/Script.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        vm.stopBroadcast();
    }
}
