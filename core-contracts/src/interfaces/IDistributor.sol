// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CronLibrary} from "../libraries/CronLibrary.sol";

interface IDistributor {
    error Unauthorized();
    error InvalidRecurringPaymentId();
    error ZeroAddress();
    error ArrayLengthMismatch();
    error InvalidTimeRange();
    error DuplicateBeneficiary();
    error ZeroAmount();
    error CannotDistribute();
    error PaymentEnded();
    error NoPeriodsAvailable();
    error InsufficientBalance();
    error PaymentAlreadyRevoked();
    error EndTimeAlreadyPassed();
    error InvalidEndTime();
    error InvalidFeeRate();
    error FailedToSendEther();

    event NewRecurringPayment(
        uint256 indexed recurringPaymentId,
        uint256 startTime,
        uint256 endTime,
        CronLibrary.CronSchedule cronSchedule,
        address indexed tokenToDistribute,
        address indexed distributionFeeToken,
        uint256 distributionFeeAmount
    );

    event Distribution(uint256 indexed recurringPaymentId, uint256 periods, uint256 timestamp);
    event DistributionRevoked(uint256 indexed recurringPaymentId);
    event EndTimeSet(uint256 indexed recurringPaymentId, uint256 newEndTime);
    event FeeRateSet(uint256 indexed recurringPaymentId, uint96 newFeeRate);

    // Functions
    function createRecurringPayments(
        uint256[] memory _startTimes,
        uint256[] memory _endTimes,
        CronLibrary.CronSchedule[] memory _cronSchedules,
        address[][] memory _beneficiaries,
        uint256[][] memory _beneficiariesAmounts,
        address[] memory _tokensToDistribute,
        address[] memory _distributionFeeTokens,
        uint256[] memory _distributionFeeAmounts
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
            uint256,
            uint256,
            CronLibrary.CronSchedule memory,
            uint256,
            uint256,
            address,
            address[] memory,
            uint256[] memory,
            bool
        );

    function getDistributionFee(uint256 _recurringPaymentId) external view returns (uint96);

    function setEndTime(uint256 _recurringPaymentId, uint256 _newEndTime) external;

    function recurringPaymentCounter() external view returns (uint256);
}
