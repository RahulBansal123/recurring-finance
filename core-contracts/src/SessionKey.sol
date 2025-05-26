// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/ISessionKeyManager.sol";

contract SessionKeyManager is ReentrancyGuard, ISessionKeyManager {
    using SafeERC20 for IERC20;

    mapping(address => SessionKey) private sessionKeys;

    modifier onlyOwner() {
        require(msg.sender == address(this), "Only owner can call this function");
        _;
    }

    function isValidSessionKey(address sessionKey) public view returns (bool) {
        SessionKey storage key = sessionKeys[sessionKey];
        return key.active && block.timestamp <= key.validUntil;
    }

    /**
     * @notice Add a session key with spending limits
     * @param sessionKey Address of the session key
     * @param validUntil Timestamp when key expires
     * @param dailyLimit Daily spending limit in wei/tokens
     */
    function addSessionKey(address sessionKey, uint256 validUntil, uint256 dailyLimit) external onlyOwner {
        require(sessionKey != address(0), "Invalid session key");
        require(validUntil > block.timestamp, "Invalid expiry");

        sessionKeys[sessionKey] = SessionKey({
            validUntil: validUntil,
            dailyLimit: dailyLimit,
            dailySpent: 0,
            lastResetDay: getCurrentDay(),
            active: true
        });

        emit SessionKeyAdded(sessionKey, validUntil);
    }

    /**
     * @notice Revoke a session key
     * @param sessionKey Address of the session key to revoke
     */
    function revokeSessionKey(address sessionKey) external onlyOwner {
        sessionKeys[sessionKey].active = false;
        emit SessionKeyRevoked(sessionKey);
    }

    /**
     * @notice Modify a session key limit
     * @param sessionKey Address of the session key to check
     * @param dailyLimit Daily spending limit in wei/tokens
     */
    function modifySessionKeyLimit(address sessionKey, uint256 dailyLimit) external onlyOwner {
        require(sessionKey != address(0), "Invalid session key");
        require(sessionKeys[sessionKey].active, "Session key is not active");

        sessionKeys[sessionKey].dailyLimit = dailyLimit;
        emit SessionKeyLimitModified(sessionKey, dailyLimit);
    }

    /**
     * @notice Transfer tokens with session key limits
     * @param token Token address
     * @param to Recipient address
     * @param amount Transfer amount
     */
    function transferWithSessionKey(address token, address to, uint256 amount) external {
        require(isValidSessionKey(msg.sender), "Invalid session key");
        SessionKey storage key = sessionKeys[msg.sender];

        // Reset daily limit if new day
        uint256 currentDay = getCurrentDay();
        if (currentDay > key.lastResetDay) {
            key.dailySpent = 0;
            key.lastResetDay = currentDay;
        }

        // Check daily limit
        require(key.dailySpent + amount <= key.dailyLimit, "Daily limit exceeded");
        key.dailySpent += amount;

        // Execute transfer
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Get current day number (for daily limits)
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 86400; // seconds per day
    }

    function supportsEIP7702() external pure returns (bool) {
        return true;
    }

    receive() external payable {}

    fallback() external payable {}
}
