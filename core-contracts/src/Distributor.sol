// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "./libraries/DateTimeLibrary.sol";
import "./libraries/CronLibrary.sol";
import "./interfaces/IDistributor.sol";
import "./interfaces/ISessionKeyManager.sol";

/**
 * @title Distributor
 * @dev Singleton contract to manage recurring payments for all users
 */
contract Distributor is AccessControl, ReentrancyGuard, Pausable, IDistributor {
    using SafeERC20 for IERC20;
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    // Struct to group creation parameters and reduce stack depth
    struct CreatePaymentParams {
        address owner;
        uint256 paymentId;
        uint256 startTime;
        uint256 endTime;
        CronLibrary.CronSchedule cronSchedule;
        address[] beneficiaries;
        uint256[] beneficiariesAmounts;
        address tokenToDistribute;
    }

    mapping(uint256 => PaymentKey) private recurringPayments;
    mapping(address => uint256[]) private ownerToPaymentIds;

    uint256 public recurringPaymentCounter;

    uint256 private constant MAX_PERIODS_DEFAULT = 100;
    uint256 private constant SECONDS_PER_HOUR = 3600;
    uint96 public constant BASIS_POINTS = 10000;
    uint96 public constant DEFAULT_FEE_RATE = 250;
    uint96 public constant MAX_FEE_RATE = 1000; // 10%

    modifier onlyValidRecurringPaymentId(uint256 _recurringPaymentId) {
        if (_recurringPaymentId >= recurringPaymentCounter) {
            revert InvalidRecurringPaymentId();
        }
        _;
    }

    constructor(address _creator) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CREATOR_ROLE, _creator);
    }

    function createRecurringPayment(
        address owner,
        uint256 startTime,
        uint256 endTime,
        CronLibrary.CronSchedule calldata cronSchedule,
        address[] calldata beneficiaries,
        uint256[] calldata beneficiaryAmounts,
        address tokenToDistribute
    ) external whenNotPaused onlyRole(CREATOR_ROLE) returns (uint256 paymentId) {
        if (beneficiaries.length == 0) revert ZeroAmount();

        if (beneficiaries.length != beneficiaryAmounts.length) {
            revert ArrayLengthMismatch();
        }

        CreatePaymentParams memory params = CreatePaymentParams({
            owner: owner,
            paymentId: recurringPaymentCounter,
            startTime: startTime,
            endTime: endTime,
            cronSchedule: cronSchedule,
            beneficiaries: beneficiaries,
            beneficiariesAmounts: beneficiaryAmounts,
            tokenToDistribute: tokenToDistribute
        });

        _createRecurringPayment(params);
        recurringPaymentCounter++;
    }

    function batchCreateRecurringPayments(
        address[] calldata _owners,
        uint256[] calldata _startTimes,
        uint256[] calldata _endTimes,
        CronLibrary.CronSchedule[] calldata _cronSchedules,
        address[][] calldata _beneficiaries,
        uint256[][] calldata _beneficiariesAmounts,
        address[] calldata _tokensToDistribute
    ) external whenNotPaused onlyRole(CREATOR_ROLE) {
        uint256 length = _startTimes.length;
        if (length == 0) revert ZeroAmount();

        if (
            _endTimes.length != length ||
            _cronSchedules.length != length ||
            _beneficiaries.length != length ||
            _beneficiariesAmounts.length != length ||
            _tokensToDistribute.length != length
        ) {
            revert ArrayLengthMismatch();
        }

        uint256 currentCounter = recurringPaymentCounter;

        for (uint256 i = 0; i < length; ) {
            CreatePaymentParams memory params = CreatePaymentParams({
                owner: _owners[i],
                paymentId: currentCounter + i,
                startTime: _startTimes[i],
                endTime: _endTimes[i],
                cronSchedule: _cronSchedules[i],
                beneficiaries: _beneficiaries[i],
                beneficiariesAmounts: _beneficiariesAmounts[i],
                tokenToDistribute: _tokensToDistribute[i]
            });

            _createRecurringPayment(params);

            unchecked {
                ++i;
            }
        }

        recurringPaymentCounter = currentCounter + length;
    }

    function _createRecurringPayment(CreatePaymentParams memory params) internal {
        if (params.tokenToDistribute == address(0)) revert ZeroAddress();
        if (params.endTime != 0 && params.endTime <= params.startTime) revert InvalidTimeRange();
        if (params.beneficiaries.length != params.beneficiariesAmounts.length) revert ArrayLengthMismatch();

        CronLibrary.validateCronSchedule(params.cronSchedule);

        PaymentKey storage payment = recurringPayments[params.paymentId];

        payment.startTime = uint128(params.startTime);
        payment.endTime = uint128(params.endTime);
        payment.distributedUpToTime = 0;
        payment.lastDistributionTime = 0;
        payment.owner = params.owner;
        payment.tokenToDistribute = params.tokenToDistribute;
        payment.feeRate = DEFAULT_FEE_RATE;
        payment.revoked = false;
        payment.cronSchedule = params.cronSchedule;

        _setBeneficiaries(payment, params.beneficiaries, params.beneficiariesAmounts);

        ownerToPaymentIds[params.owner].push(params.paymentId);

        emit NewRecurringPayment(
            params.paymentId,
            params.startTime,
            params.endTime,
            params.cronSchedule,
            params.tokenToDistribute
        );
    }

    function _setBeneficiaries(
        PaymentKey storage payment,
        address[] memory beneficiaries,
        uint256[] memory beneficiaryAmounts
    ) internal {
        uint256 beneficiaryCount = beneficiaries.length;
        payment.beneficiaries = new address[](beneficiaryCount);
        payment.beneficiaryAmounts = new uint256[](beneficiaryCount);

        for (uint256 i = 0; i < beneficiaryCount; ) {
            address beneficiary = beneficiaries[i];
            uint256 amount = beneficiaryAmounts[i];

            if (beneficiary == address(0)) revert ZeroAddress();
            if (amount == 0) revert ZeroAmount();

            // Check for duplicates
            for (uint256 j; j < i; ) {
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
    }

    function distribute(
        uint256 _recurringPaymentId,
        uint256 _maxPeriods
    ) external nonReentrant onlyValidRecurringPaymentId(_recurringPaymentId) whenNotPaused {
        PaymentKey storage payment = recurringPayments[_recurringPaymentId];
        if (payment.revoked) revert PaymentAlreadyRevoked();

        if (!_canDistribute(_recurringPaymentId)) revert CannotDistribute();

        (uint256 periods, uint256 nextDistributionStartTime) = periodsToDistribute(_recurringPaymentId, _maxPeriods);

        payment.distributedUpToTime = uint128(nextDistributionStartTime);
        payment.lastDistributionTime = uint128(block.timestamp);

        _executeDistribution(payment, periods);

        emit Distribution(_recurringPaymentId, periods, block.timestamp);
    }

    function _executeDistribution(PaymentKey storage payment, uint256 periods) internal {
        ISessionKeyManager sessionManager = ISessionKeyManager(payment.owner);
        uint256 beneficiaryCount = payment.beneficiaries.length;
        uint256 totalDistributeAmount;

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
    }

    function revokeRecurringPayments(uint256[] calldata _recurringPaymentIds) external whenNotPaused {
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
        PaymentKey storage payment = recurringPayments[_recurringPaymentId];

        if (payment.revoked) revert PaymentAlreadyRevoked();
        if (payment.owner != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert Unauthorized();
        }

        payment.revoked = true;
        emit DistributionRevoked(_recurringPaymentId);
    }

    function withdrawFunds(
        address _token,
        uint256 _amount,
        address _beneficiary
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_beneficiary == address(0)) revert ZeroAddress();

        if (_token == address(0)) {
            if (_amount > address(this).balance) revert InsufficientBalance();
            (bool sent, ) = payable(_beneficiary).call{value: _amount}("");
            if (!sent) revert FailedToSendEther();
        } else {
            IERC20 token = IERC20(_token);
            if (_amount > token.balanceOf(address(this))) revert InsufficientBalance();
            token.safeTransfer(_beneficiary, _amount);
        }
    }

    function _canDistribute(
        uint256 _recurringPaymentId
    ) internal view onlyValidRecurringPaymentId(_recurringPaymentId) returns (bool) {
        PaymentKey storage payment = recurringPayments[_recurringPaymentId];

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
        uint256 distributorBalance = IERC20(payment.tokenToDistribute).balanceOf(payment.owner);
        uint256 totalRequired = _getTotalAmountToDistribute(_recurringPaymentId, periods);

        if (payment.feeRate > 0) {
            totalRequired += (totalRequired * payment.feeRate) / BASIS_POINTS;
        }

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
        PaymentKey storage payment = recurringPayments[_recurringPaymentId];
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
        uint256 periodCount;

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

    // Optimized Getters
    function getRecurringPayment(
        uint256 _recurringPaymentId
    )
        external
        view
        onlyValidRecurringPaymentId(_recurringPaymentId)
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
        )
    {
        PaymentKey memory recurringPayment = recurringPayments[_recurringPaymentId];

        return (
            recurringPayment.startTime,
            recurringPayment.endTime,
            recurringPayment.cronSchedule,
            recurringPayment.distributedUpToTime,
            recurringPayment.lastDistributionTime,
            recurringPayment.tokenToDistribute,
            recurringPayment.beneficiaries,
            recurringPayment.beneficiaryAmounts,
            recurringPayment.revoked
        );
    }

    function getOwnerPayments(address owner) external view returns (uint256[] memory) {
        return ownerToPaymentIds[owner];
    }

    function getDistributionFee(
        uint256 _recurringPaymentId
    ) external view onlyValidRecurringPaymentId(_recurringPaymentId) returns (uint96) {
        return recurringPayments[_recurringPaymentId].feeRate;
    }

    function canDistribute(uint256 _recurringPaymentId) external view returns (bool) {
        if (_recurringPaymentId >= recurringPaymentCounter) return false;
        return _canDistribute(_recurringPaymentId);
    }

    // Optimized Setters
    function setEndTime(
        uint256 _recurringPaymentId,
        uint256 _newEndTime
    ) external onlyRole(DEFAULT_ADMIN_ROLE) onlyValidRecurringPaymentId(_recurringPaymentId) {
        PaymentKey storage payment = recurringPayments[_recurringPaymentId];

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
        if (_newFeeRate > MAX_FEE_RATE) revert InvalidFeeRate();

        recurringPayments[_recurringPaymentId].feeRate = _newFeeRate;
        emit FeeRateSet(_recurringPaymentId, _newFeeRate);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    receive() external payable {}
}
