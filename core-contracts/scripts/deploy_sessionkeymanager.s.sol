pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {SessionKeyManager} from "../src/Sessionkey.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract Deploy is Script {
    MockUSDC usdc;
    SessionKeyManager ssnKey;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        usdc = new MockUSDC();
        ssnKey = new SessionKeyManager();
        console.log("MockUSDC: ", address(usdc));
        console.log("SessionKeyManager: ", address(ssnKey));

        vm.stopBroadcast();
    }
}
