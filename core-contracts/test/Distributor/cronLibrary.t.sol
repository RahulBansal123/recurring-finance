// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/libraries/CronLibrary.sol";
import "../../src/libraries/DateTimeLibrary.sol";

contract CronLibraryTest is Test {
    using CronLibrary for CronLibrary.CronSchedule;

    CronLibrary.CronSchedule schedule;

    function setUp() public {
        // Empty set up; tests will configure `schedule` as needed
    }

    function testValidateValidSchedule() public {
        schedule = CronLibrary.CronSchedule({
            hrs: _array(0, 12),
            daysOfMonth: _array(1, 15),
            months: _array(1, 12),
            daysOfWeek: _array(0, 6)
        });

        schedule.validateCronSchedule();
    }

    function testRevertOnInvalidHour() public {
        schedule.hrs = _array(0, 24); // 24 is invalid (should be 0–23)
        vm.expectRevert(bytes('InvalidFieldValue("hours", 24)'));
        schedule.validateCronSchedule();
    }

    function testRevertOnInvalidMonth() public {
        schedule.months = _array(0, 13); // 13 is invalid (should be 1–12)
        vm.expectRevert(bytes('InvalidFieldValue("months", 13)'));
        schedule.validateCronSchedule();
    }

    function testRevertOnDuplicateDaysOfWeek() public {
        schedule.daysOfWeek = new uint8[](2);
        schedule.daysOfWeek[0] = 3;
        schedule.daysOfWeek[1] = 3; // duplicate

        vm.expectRevert(bytes('DuplicateValue("daysOfWeek", 3)'));
        schedule.validateCronSchedule();
    }

    function testMatchesWildcardSchedule() public {
        schedule = CronLibrary.CronSchedule({
            hrs: new uint8[](0),
            daysOfMonth: new uint8[](0),
            months: new uint8[](0),
            daysOfWeek: new uint8[](0)
        });

        uint timestamp = _toTimestamp(2025, 5, 29, 15, 0, 0);
        bool matchResult = CronLibrary.matchesCron(timestamp, schedule);
        assertTrue(matchResult);
    }

    function testMatchesSpecificSchedule() public {
        schedule.hrs = _singleArray(15);
        schedule.daysOfMonth = _singleArray(29);
        schedule.months = _singleArray(5);
        schedule.daysOfWeek = _singleArray(4); // Thursday

        uint timestamp = _toTimestamp(2025, 5, 29, 15, 0, 0); // Thursday, May 29, 15:00
        assertTrue(CronLibrary.matchesCron(timestamp, schedule));
    }

    function testDoesNotMatchWrongHour() public {
        schedule.hrs = _singleArray(10); // not matching 15
        uint timestamp = _toTimestamp(2025, 5, 29, 15, 0, 0);
        assertFalse(CronLibrary.matchesCron(timestamp, schedule));
    }

    function testGetMinIntervalForHourlySchedule() public {
        schedule.hrs = new uint8[](2);
        schedule.hrs[0] = 0;
        schedule.hrs[1] = 12;
        uint256 interval = CronLibrary.getMinCronInterval(schedule);
        assertEq(interval, 1 hours);
    }

    function testGetMinIntervalForDailySchedule() public {
        schedule.hrs = _singleArray(0);
        uint256 interval = CronLibrary.getMinCronInterval(schedule);
        assertEq(interval, 1 days);
    }

    // ---------- Helpers ----------

    function _toTimestamp(
        uint year,
        uint month,
        uint day,
        uint hour,
        uint minute,
        uint second
    ) internal pure returns (uint timestamp) {
        uint daysSinceEpoch = DateTime._daysFromDate(year, month, day);
        timestamp = daysSinceEpoch * 86400 + hour * 3600 + minute * 60 + second;
    }

    function _array(uint8 a, uint8 b) internal pure returns (uint8[] memory) {
        uint8[] memory arr = new uint8[](2);
        arr[0] = a;
        arr[1] = b;
        return arr;
    }

    function _singleArray(uint8 val) internal pure returns (uint8[] memory) {
        uint8[] memory arr = new uint8[](1);
        arr[0] = val;
        return arr;
    }
}
