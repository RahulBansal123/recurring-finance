// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CronLibrary} from "../libraries/CronLibrary.sol";

interface IDistributor {
    struct PaymentKey {
        uint128 startTime;
        uint128 endTime;
        uint128 distributedUpToTime;
        uint128 lastDistributionTime;
        address owner;
        address tokenToDistribute;
        uint96 feeRate; // Packed with revoked flag
        bool revoked; // 1 byte
        CronLibrary.CronSchedule cronSchedule;
        address[] beneficiaries;
        uint256[] beneficiaryAmounts;
    }

    error InvalidRecurringPaymentId();
    error ArrayLengthMismatch();
    error ZeroAmount();
    error ZeroAddress();
    error InvalidTimeRange();
    error DuplicateBeneficiary();
    error PaymentAlreadyRevoked();
    error CannotDistribute();
    error Unauthorized();
    error FailedToSendEther();
    error EndTimeAlreadyPassed();
    error InvalidEndTime();
    error InvalidFeeRate();
    error InsufficientBalance();

    // Events
    event NewRecurringPayment(
        uint256 indexed paymentId,
        uint256 startTime,
        uint256 endTime,
        CronLibrary.CronSchedule cronSchedule,
        address tokenToDistribute
    );
    event Distribution(uint256 indexed paymentId, uint256 periods, uint256 timestamp);
    event DistributionRevoked(uint256 indexed paymentId);
    event EndTimeSet(uint256 indexed paymentId, uint256 newEndTime);
    event FeeRateSet(uint256 indexed paymentId, uint96 newFeeRate);

    // Functions
    function createRecurringPayment(
        uint256 startTime,
        uint256 endTime,
        CronLibrary.CronSchedule calldata cronSchedule,
        address[] calldata beneficiaries,
        uint256[] calldata beneficiaryAmounts,
        address tokenToDistribute
    ) external returns (uint256 paymentId);

    function batchCreateRecurringPayments(
        uint256[] calldata _startTimes,
        uint256[] calldata _endTimes,
        CronLibrary.CronSchedule[] calldata _cronSchedules,
        address[][] calldata _beneficiaries,
        uint256[][] calldata _beneficiariesAmounts,
        address[] calldata _tokensToDistribute
    ) external;

    function distribute(uint256 _recurringPaymentId, uint256 _maxPeriods) external;

    function revokeRecurringPayments(uint256[] memory _recurringPaymentIds) external;
    function withdrawFunds(address _token, uint256 _amount, address _beneficiary) external;

    function periodsToDistribute(
        uint256 _recurringPaymentId,
        uint256 _maxPeriodsToDistribute
    ) external view returns (uint256, uint256);

    function getRecurringPayment(
        uint256 _recurringPaymentId
    )
        external
        view
        returns (
            uint256, // 0: startTime
            uint256, // 1: endTime
            CronLibrary.CronSchedule memory, // 2: cronSchedule
            uint256, // 3: distributedUpToTime
            uint256, // 4: lastDistributionTime
            address, // 5: tokenToDistribute
            address[] memory, // 6: beneficiaries
            uint256[] memory, // 7: beneficiariesAmounts
            bool // 8: revoked
        );

    function getDistributionFee(uint256 _recurringPaymentId) external view returns (uint96);

    function setEndTime(uint256 _recurringPaymentId, uint256 _newEndTime) external;

    function recurringPaymentCounter() external view returns (uint256);
}
