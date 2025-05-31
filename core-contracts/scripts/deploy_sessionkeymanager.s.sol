pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {SessionKeyManager} from "../src/Sessionkey.sol";
import {Distributor} from "../src/Distributor.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract Deploy is Script {
    MockUSDC usdc;
    SessionKeyManager ssnKey;
    Distributor distributor;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        usdc = new MockUSDC();
        ssnKey = new SessionKeyManager();
        distributor = new Distributor(owner);
        vm.stopBroadcast();

        console.log("MockUSDC: ", address(usdc));
        console.log("SessionKeyManager: ", address(ssnKey));
        console.log("Distributor: ", address(distributor));
    }
}
