// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DateTimeLibrary.sol";

library CronLibrary {
    /**
     * @dev Cron schedule struct
     */
    struct CronSchedule {
        uint8[] hrs; // hours (0-23)
        uint8[] daysOfMonth; // days of the month (1-31)
        uint8[] months; // months (1-12)
        uint8[] daysOfWeek; // days of the week (0-6, where 0 is Sunday)
    }

    error ExcessiveArrayLength(string field);
    error InvalidFieldValue(string field, uint8 value);
    error DuplicateValue(string field, uint8 value);

    /**
     * @dev Validates the cron schedule
     * @param schedule The CronSchedule struct containing the cron configuration.
     */
    function validateCronSchedule(CronSchedule memory schedule) internal pure {
        if (schedule.hrs.length > 24) revert ExcessiveArrayLength("hours");
        if (schedule.daysOfMonth.length > 31) revert ExcessiveArrayLength("daysOfMonth");
        if (schedule.months.length > 12) revert ExcessiveArrayLength("months");
        if (schedule.daysOfWeek.length > 7) revert ExcessiveArrayLength("daysOfWeek");

        // Validate and check duplicates using bitmasks for O(n) complexity
        _validateHours(schedule.hrs);
        _validateDaysOfMonth(schedule.daysOfMonth);
        _validateMonths(schedule.months);
        _validateDaysOfWeek(schedule.daysOfWeek);
    }

    function _validateHours(uint8[] memory hrs) private pure {
        if (hrs.length == 0) return;

        uint256 seen = 0; // 24 bits needed for hours 0-23
        for (uint i = 0; i < hrs.length; i++) {
            uint8 value = hrs[i];
            if (value > 23) revert InvalidFieldValue("hours", value);

            uint256 bit = 1 << value;
            if (seen & bit != 0) revert DuplicateValue("hours", value);
            seen |= bit;
        }
    }

    function _validateMonths(uint8[] memory months) private pure {
        if (months.length == 0) return;

        uint256 seen = 0; // 12 bits needed for months 1-12
        for (uint i = 0; i < months.length; i++) {
            uint8 value = months[i];
            if (value == 0 || value > 12) revert InvalidFieldValue("months", value);

            // Use value directly since months 1-12 fit in positions 1-12
            uint256 bit = 1 << value;
            if (seen & bit != 0) revert DuplicateValue("months", value);
            seen |= bit;
        }
    }

    function _validateDaysOfWeek(uint8[] memory daysOfWeek) private pure {
        if (daysOfWeek.length == 0) return;

        uint256 seen = 0; // 7 bits needed for days 0-6
        for (uint i = 0; i < daysOfWeek.length; i++) {
            uint8 value = daysOfWeek[i];
            if (value > 6) revert InvalidFieldValue("daysOfWeek", value);

            uint256 bit = 1 << value;
            if (seen & bit != 0) revert DuplicateValue("daysOfWeek", value);
            seen |= bit;
        }
    }

    function _validateDaysOfMonth(uint8[] memory daysOfMonth) private pure {
        if (daysOfMonth.length == 0) return;

        uint256 seen = 0; // 31 bits needed for days 1-31
        for (uint i = 0; i < daysOfMonth.length; i++) {
            uint8 value = daysOfMonth[i];
            if (value == 0 || value > 31) revert InvalidFieldValue("daysOfMonth", value);

            uint256 bit = 1 << value;
            if (seen & bit != 0) revert DuplicateValue("daysOfMonth", value);
            seen |= bit;
        }
    }

    function getMinCronInterval(CronSchedule memory cronSchedule) internal pure returns (uint256) {
        // Determine the smallest interval specified in the cron schedule
        if (cronSchedule.hrs.length != 1 || cronSchedule.hrs[0] != 0) {
            // if cron schedule hours are not just 0, we need to check every hour
            return 1 hours;
        }

        // cron schedule hours set to 0 only (0 * * *)
        // we can check every day instead of every hour to save on gas
        return 1 days;
    }

    function matchesCron(uint256 timestamp, CronSchedule memory cronSchedule) internal pure returns (bool) {
        if (!matchesField(cronSchedule.hrs, DateTime.getHour(timestamp))) return false;
        if (!matchesField(cronSchedule.daysOfMonth, DateTime.getDay(timestamp))) return false;
        if (!matchesField(cronSchedule.months, DateTime.getMonth(timestamp))) return false;
        if (!matchesField(cronSchedule.daysOfWeek, DateTime.getDayOfWeek(timestamp))) return false;
        return true;
    }

    function matchesField(uint8[] memory field, uint256 value) internal pure returns (bool) {
        if (field.length == 0) return true; // Wildcard
        for (uint i = 0; i < field.length; i++) {
            if (field[i] == value) {
                return true;
            }
        }
        return false;
    }
}
