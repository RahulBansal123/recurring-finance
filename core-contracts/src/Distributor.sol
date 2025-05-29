// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./libraries/DateTimeLibrary.sol";
import "./interfaces/IDistributor.sol";
import "./interfaces/ISessionKeyManager.sol";

/**
 * @title Distributor
 */
contract Distributor is ReentrancyGuard, AccessControl, IDistributor {
    using SafeERC20 for IERC20;
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct RecurringPayment {
        uint128 startTime; // Packed with endTime
        uint128 endTime;
        uint128 distributedUpToTime; // Packed with lastDistributionTime
        uint128 lastDistributionTime;
        address tokenToDistribute;
        uint96 feeRate; // Packed with revoked flag
        bool revoked; // 1 byte
        CronLibrary.CronSchedule cronSchedule;
        address[] beneficiaries; // Dynamic array more gas efficient than EnumerableSet
        uint256[] beneficiaryAmounts;
    }

    mapping(uint256 => RecurringPayment) private recurringPayments;
    uint256 public recurringPaymentCounter;

    address public immutable operator;

    uint256 private constant MAX_PERIODS_DEFAULT = 100;
    uint256 private constant SECONDS_PER_HOUR = 3600;
    uint96 public constant BASIS_POINTS = 10000;
    uint96 public constant MAX_FEE_RATE = 1000; // 10%

    modifier onlyValidRecurringPaymentId(uint256 _recurringPaymentId) {
        if (_recurringPaymentId >= recurringPaymentCounter) {
            revert InvalidRecurringPaymentId();
        }
        _;
    }

    constructor(address _admin, address _operator) {
        require(_admin != address(0) && _operator != address(0));
        operator = _operator;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _operator);
    }

    function createRecurringPayments(
        uint256[] calldata _startTimes,
        uint256[] calldata _endTimes,
        CronLibrary.CronSchedule[] calldata _cronSchedules,
        address[][] calldata _beneficiaries,
        uint256[][] calldata _beneficiariesAmounts,
        address[] calldata _tokensToDistribute,
        address[] calldata _distributionFeeTokens,
        uint256[] calldata _distributionFeeAmounts
    ) external onlyRole(OPERATOR_ROLE) {
        uint256 length = _startTimes.length;
        if (length == 0) revert ZeroAmount();

        if (
            _endTimes.length != length ||
            _cronSchedules.length != length ||
            _beneficiaries.length != length ||
            _beneficiariesAmounts.length != length ||
            _tokensToDistribute.length != length ||
            _distributionFeeTokens.length != length ||
            _distributionFeeAmounts.length != length
        ) {
            revert ArrayLengthMismatch();
        }

        uint256 currentCounter = recurringPaymentCounter;

        for (uint256 i = 0; i < length; ) {
            _createRecurringPayment(
                currentCounter + i,
                _startTimes[i],
                _endTimes[i],
                _cronSchedules[i],
                _beneficiaries[i],
                _beneficiariesAmounts[i],
                _tokensToDistribute[i],
                _distributionFeeTokens[i],
                _distributionFeeAmounts[i]
            );

            unchecked {
                ++i;
            }
        }

        recurringPaymentCounter = currentCounter + length;
    }

    function _createRecurringPayment(
        uint256 _paymentId,
        uint256 _startTime,
        uint256 _endTime,
        CronLibrary.CronSchedule calldata _cronSchedule,
        address[] calldata _beneficiaries,
        uint256[] calldata _beneficiariesAmounts,
        address _tokenToDistribute,
        address _distributionFeeToken,
        uint256 _distributionFeeAmount
    ) internal {
        if (_tokenToDistribute == address(0)) revert ZeroAddress();
        if (_endTime != 0 && _endTime <= _startTime) revert InvalidTimeRange();
        if (_beneficiaries.length != _beneficiariesAmounts.length) revert ArrayLengthMismatch();

        CronLibrary.validateCronSchedule(_cronSchedule);

        RecurringPayment storage payment = recurringPayments[_paymentId];

        // Pack time values into uint128
        payment.startTime = uint128(_startTime);
        payment.endTime = uint128(_endTime);
        payment.distributedUpToTime = 0;
        payment.lastDistributionTime = 0;

        payment.tokenToDistribute = _tokenToDistribute;
        payment.feeRate = uint96(250); // 2.5% platform fee (basis points)
        payment.revoked = false;
        payment.cronSchedule = _cronSchedule;

        uint256 beneficiaryCount = _beneficiaries.length;
        payment.beneficiaries = new address[](beneficiaryCount);
        payment.beneficiaryAmounts = new uint256[](beneficiaryCount);

        for (uint256 i = 0; i < beneficiaryCount; ) {
            address beneficiary = _beneficiaries[i];
            uint256 amount = _beneficiariesAmounts[i];

            if (beneficiary == address(0)) revert ZeroAddress();
            if (amount == 0) revert ZeroAmount();

            // Check for duplicates (O(n²) but acceptable for small arrays)
            for (uint256 j = 0; j < i; ) {
                if (payment.beneficiaries[j] == beneficiary) {
                    revert DuplicateBeneficiary();
                }
                unchecked {
                    ++j;
                }
            }

            payment.beneficiaries[i] = beneficiary;
            payment.beneficiaryAmounts[i] = amount;

            unchecked {
                ++i;
            }
        }

        emit NewRecurringPayment(
            _paymentId,
            _startTime,
            _endTime,
            _cronSchedule,
            _tokenToDistribute,
            _distributionFeeToken,
            _distributionFeeAmount
        );
    }

    function distribute(
        uint256 _recurringPaymentId,
        uint256 _maxPeriods
    ) external nonReentrant onlyValidRecurringPaymentId(_recurringPaymentId) {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];

        bool canDistribute = _canDistribute(_recurringPaymentId);
        if (!canDistribute) revert CannotDistribute();

        (uint256 periods, uint256 nextDistributionStartTime) = periodsToDistribute(_recurringPaymentId, _maxPeriods);

        payment.distributedUpToTime = uint128(nextDistributionStartTime);
        payment.lastDistributionTime = uint128(block.timestamp);

        ISessionKeyManager sessionManager = ISessionKeyManager(operator);

        uint256 beneficiaryCount = payment.beneficiaries.length;
        uint256 totalDistributeAmount = 0;
        for (uint256 i = 0; i < beneficiaryCount; ) {
            uint256 amount = payment.beneficiaryAmounts[i] * periods;
            totalDistributeAmount += amount;

            sessionManager.transferWithSessionKey(payment.tokenToDistribute, payment.beneficiaries[i], amount);
            unchecked {
                ++i;
            }
        }

        if (payment.feeRate > 0) {
            uint256 feeToSend = (totalDistributeAmount * payment.feeRate) / BASIS_POINTS;

            if (feeToSend > 0) {
                sessionManager.transferWithSessionKey(payment.tokenToDistribute, address(this), feeToSend);
            }
        }

        emit Distribution(_recurringPaymentId, periods, block.timestamp);
    }

    function revokeRecurringPayments(uint256[] calldata _recurringPaymentIds) external {
        if (!hasRole(OPERATOR_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert Unauthorized();
        }

        uint256 length = _recurringPaymentIds.length;
        for (uint256 i = 0; i < length; ) {
            _revokeRecurringPayment(_recurringPaymentIds[i]);
            unchecked {
                ++i;
            }
        }
    }

    function _revokeRecurringPayment(
        uint256 _recurringPaymentId
    ) internal onlyValidRecurringPaymentId(_recurringPaymentId) {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];
        if (payment.revoked) revert PaymentAlreadyRevoked();

        payment.revoked = true;
        emit DistributionRevoked(_recurringPaymentId);
    }

    function withdrawFunds(
        address _token,
        uint256 _amount,
        address _beneficiary
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_token == address(0)) {
            revert ZeroAddress();
        }

        if (_token == address(0)) {
            (bool sent, ) = payable(_beneficiary).call{value: _amount}("");
            if (!sent) {
                revert FailedToSendEther();
            }
            return;
        }
        IERC20(_token).transfer(_beneficiary, _amount);
    }

    function _canDistribute(
        uint256 _recurringPaymentId
    ) internal view onlyValidRecurringPaymentId(_recurringPaymentId) returns (bool) {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];

        if (block.timestamp < payment.startTime) return false;
        if (payment.revoked) return false;

        (uint256 periods, ) = periodsToDistribute(_recurringPaymentId, 1);
        if (periods == 0) {
            if (payment.endTime != 0 && block.timestamp > payment.endTime) {
                return false;
            }
            return false;
        }

        // Check balance
        uint256 distributorBalance = IERC20(payment.tokenToDistribute).balanceOf(operator);
        uint256 totalRequired = _getTotalAmountToDistribute(_recurringPaymentId, periods);

        return distributorBalance >= totalRequired;
    }

    function periodsToDistribute(
        uint256 _recurringPaymentId,
        uint256 _maxPeriodsToDistribute
    )
        public
        view
        onlyValidRecurringPaymentId(_recurringPaymentId)
        returns (uint256 periods, uint256 nextDistributionStartTime)
    {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];
        uint256 currentTime = block.timestamp;

        if (_maxPeriodsToDistribute == 0) {
            _maxPeriodsToDistribute = MAX_PERIODS_DEFAULT;
        }

        if (currentTime < payment.startTime || payment.revoked) {
            return (0, payment.distributedUpToTime);
        }

        uint256 fromTime = payment.distributedUpToTime > 0
            ? payment.distributedUpToTime + SECONDS_PER_HOUR
            : payment.startTime;

        uint256 toTime = payment.endTime > 0 && currentTime > payment.endTime ? payment.endTime : currentTime;

        uint256 timestamp = fromTime - (fromTime % SECONDS_PER_HOUR);

        // Special handling for midnight-only schedules
        if (payment.cronSchedule.hrs.length == 1 && payment.cronSchedule.hrs[0] == 0) {
            uint256 currentHour = DateTime.getHour(timestamp);
            if (currentHour != 0) {
                timestamp += ((24 - currentHour) * SECONDS_PER_HOUR);
            }
        }

        uint256 timeStep = CronLibrary.getMinCronInterval(payment.cronSchedule);
        uint256 periodCount = 0;

        while (timestamp <= currentTime && timestamp <= toTime && periodCount < _maxPeriodsToDistribute) {
            if (CronLibrary.matchesCron(timestamp, payment.cronSchedule)) {
                unchecked {
                    ++periodCount;
                }
            }
            timestamp += timeStep;
        }

        return (periodCount, timestamp - timeStep);
    }

    function _getTotalAmountToDistribute(
        uint256 _recurringPaymentId,
        uint256 _periodsToDistribute
    ) internal view returns (uint256 totalAmount) {
        uint256[] memory amounts = recurringPayments[_recurringPaymentId].beneficiaryAmounts;
        uint256 length = amounts.length;

        for (uint256 i = 0; i < length; ) {
            totalAmount += amounts[i];
            unchecked {
                ++i;
            }
        }

        return totalAmount * _periodsToDistribute;
    }

    /* Optimized Getters */
    function getRecurringPayment(
        uint256 _recurringPaymentId
    )
        external
        view
        onlyValidRecurringPaymentId(_recurringPaymentId)
        returns (
            uint256 startTime,
            uint256 endTime,
            CronLibrary.CronSchedule memory cronSchedule,
            uint256 distributedUpToTime,
            uint256 lastDistributionTime,
            address tokenToDistribute,
            address[] memory beneficiaries,
            uint256[] memory beneficiariesAmounts,
            bool revoked
        )
    {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];

        return (
            payment.startTime,
            payment.endTime,
            payment.cronSchedule,
            payment.distributedUpToTime,
            payment.lastDistributionTime,
            payment.tokenToDistribute,
            payment.beneficiaries,
            payment.beneficiaryAmounts,
            payment.revoked
        );
    }

    function getDistributionFee(
        uint256 _recurringPaymentId
    ) external view onlyValidRecurringPaymentId(_recurringPaymentId) returns (uint96) {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];
        return (payment.feeRate);
    }

    /**Optimized Setters */
    function setEndTime(
        uint256 _recurringPaymentId,
        uint256 _newEndTime
    ) external onlyRole(DEFAULT_ADMIN_ROLE) onlyValidRecurringPaymentId(_recurringPaymentId) {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];

        if (payment.endTime != 0 && payment.endTime <= block.timestamp) {
            revert EndTimeAlreadyPassed();
        }
        if (_newEndTime <= block.timestamp) revert InvalidEndTime();

        payment.endTime = uint128(_newEndTime);
        emit EndTimeSet(_recurringPaymentId, _newEndTime);
    }

    function setFeeRate(
        uint256 _recurringPaymentId,
        uint96 _newFeeRate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) onlyValidRecurringPaymentId(_recurringPaymentId) {
        RecurringPayment storage payment = recurringPayments[_recurringPaymentId];

        if (_newFeeRate > MAX_FEE_RATE) {
            revert InvalidFeeRate();
        }

        payment.feeRate = _newFeeRate;
        emit FeeRateSet(_recurringPaymentId, _newFeeRate);
    }

    receive() external payable {}
}
