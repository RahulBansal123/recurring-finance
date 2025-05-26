// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface ISessionKeyManager {
    struct SessionKey {
        uint256 validUntil;
        uint256 dailyLimit;
        uint256 dailySpent;
        uint256 lastResetDay;
        bool active;
    }

    event SessionKeyAdded(address indexed sessionKey, uint256 validUntil);
    event SessionKeyRevoked(address indexed sessionKey);
    event SessionKeyLimitModified(address indexed sessionKey, uint256 dailyLimit);

    function isValidSessionKey(address sessionKey) external view returns (bool);

    function addSessionKey(address sessionKey, uint256 validUntil, uint256 dailyLimit) external;

    function revokeSessionKey(address sessionKey) external;

    function modifySessionKeyLimit(address sessionKey, uint256 dailyLimit) external;

    function transferWithSessionKey(address token, address to, uint256 amount) external;

    function getCurrentDay() external view returns (uint256);

    function supportsEIP7702() external pure returns (bool);
}
