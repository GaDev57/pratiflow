import { describe, it, expect } from "vitest";
import {
  getAvailableSlots,
  getAvailableDates,
  type AvailabilityRule,
  type AvailabilityException,
  type ExistingAppointment,
} from "../slots";

// 2026-12-07 is a Monday (day_of_week = 1)
// 2026-12-08 is a Tuesday (day_of_week = 2)
// 2026-12-13 is a Sunday  (day_of_week = 0)
// 2026-12-09 is a Wednesday (day_of_week = 3)

const MONDAY = "2026-12-07";
const TUESDAY = "2026-12-08";
const TIMEZONE = "Europe/Paris";

const mondayRule: AvailabilityRule = {
  day_of_week: 1, // Monday
  start_time: "09:00",
  end_time: "12:00",
  is_active: true,
};

const afternoonRule: AvailabilityRule = {
  day_of_week: 1, // Monday
  start_time: "14:00",
  end_time: "16:00",
  is_active: true,
};

describe("getAvailableSlots", () => {
  describe("basic slot generation", () => {
    it("generates 6 slots of 30min from a single morning rule (09:00-12:00)", () => {
      const slots = getAvailableSlots(MONDAY, 30, [mondayRule], [], [], TIMEZONE);
      expect(slots).toHaveLength(6);
      expect(slots[0]).toEqual({
        start: `${MONDAY}T09:00:00`,
        end: `${MONDAY}T09:30:00`,
      });
      expect(slots[5]).toEqual({
        start: `${MONDAY}T11:30:00`,
        end: `${MONDAY}T12:00:00`,
      });
    });

    it("generates slots from multiple rules (morning + afternoon)", () => {
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule, afternoonRule],
        [],
        [],
        TIMEZONE
      );
      // morning: 09:00-12:00 = 6 slots, afternoon: 14:00-16:00 = 4 slots
      expect(slots).toHaveLength(10);
      // First slot from morning rule
      expect(slots[0].start).toBe(`${MONDAY}T09:00:00`);
      // First slot from afternoon rule
      expect(slots[6].start).toBe(`${MONDAY}T14:00:00`);
      expect(slots[9].start).toBe(`${MONDAY}T15:30:00`);
    });

    it("returns empty array for a day with no matching active rules", () => {
      // mondayRule has day_of_week=1; TUESDAY is day_of_week=2
      const slots = getAvailableSlots(TUESDAY, 30, [mondayRule], [], [], TIMEZONE);
      expect(slots).toEqual([]);
    });

    it("returns empty array when all rules for the day are inactive", () => {
      const inactiveRule: AvailabilityRule = {
        ...mondayRule,
        is_active: false,
      };
      const slots = getAvailableSlots(MONDAY, 30, [inactiveRule], [], [], TIMEZONE);
      expect(slots).toEqual([]);
    });
  });

  describe("exceptions — full-day blocks", () => {
    it("blocks the entire day when a full-day exception exists (null start/end)", () => {
      const fullDayException: AvailabilityException = {
        date: MONDAY,
        start_time: null,
        end_time: null,
      };
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [fullDayException],
        [],
        TIMEZONE
      );
      expect(slots).toEqual([]);
    });

    it("does not block a different date's full-day exception", () => {
      const otherDayException: AvailabilityException = {
        date: TUESDAY,
        start_time: null,
        end_time: null,
      };
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [otherDayException],
        [],
        TIMEZONE
      );
      expect(slots).toHaveLength(6);
    });
  });

  describe("exceptions — partial time-range blocks", () => {
    it("blocks slots overlapping the exception range (10:00-11:00)", () => {
      const partialException: AvailabilityException = {
        date: MONDAY,
        start_time: "10:00",
        end_time: "11:00",
      };
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [partialException],
        [],
        TIMEZONE
      );
      // 09:00-09:30 ✓, 09:30-10:00 ✓, 10:00-10:30 ✗, 10:30-11:00 ✗, 11:00-11:30 ✓, 11:30-12:00 ✓
      expect(slots).toHaveLength(4);
      const startTimes = slots.map((s) => s.start);
      expect(startTimes).toContain(`${MONDAY}T09:00:00`);
      expect(startTimes).toContain(`${MONDAY}T09:30:00`);
      expect(startTimes).not.toContain(`${MONDAY}T10:00:00`);
      expect(startTimes).not.toContain(`${MONDAY}T10:30:00`);
      expect(startTimes).toContain(`${MONDAY}T11:00:00`);
      expect(startTimes).toContain(`${MONDAY}T11:30:00`);
    });
  });

  describe("existing appointments", () => {
    it("excludes slots occupied by existing appointments", () => {
      const appointment: ExistingAppointment = {
        start_at: `${MONDAY}T09:00:00`,
        end_at: `${MONDAY}T09:30:00`,
        status: "confirmed",
      };
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [],
        [appointment],
        TIMEZONE
      );
      expect(slots).toHaveLength(5);
      const startTimes = slots.map((s) => s.start);
      expect(startTimes).not.toContain(`${MONDAY}T09:00:00`);
      expect(startTimes).toContain(`${MONDAY}T09:30:00`);
    });

    it("excludes slots that partially overlap an appointment", () => {
      // Appointment 09:15-09:45 overlaps 09:00-09:30 and 09:30-10:00
      const appointment: ExistingAppointment = {
        start_at: `${MONDAY}T09:15:00`,
        end_at: `${MONDAY}T09:45:00`,
        status: "confirmed",
      };
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [],
        [appointment],
        TIMEZONE
      );
      // 09:00-09:30 overlaps (slotEnd=570 > apptStart=555), 09:30-10:00 overlaps (slotStart=570 < apptEnd=585)
      expect(slots).toHaveLength(4);
      const startTimes = slots.map((s) => s.start);
      expect(startTimes).not.toContain(`${MONDAY}T09:00:00`);
      expect(startTimes).not.toContain(`${MONDAY}T09:30:00`);
      expect(startTimes).toContain(`${MONDAY}T10:00:00`);
    });

    it("ignores cancelled appointments (treats them as free)", () => {
      const cancelledAppointment: ExistingAppointment = {
        start_at: `${MONDAY}T09:00:00`,
        end_at: `${MONDAY}T09:30:00`,
        status: "cancelled",
      };
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [],
        [cancelledAppointment],
        TIMEZONE
      );
      // Cancelled appointment should be ignored — all 6 slots available
      expect(slots).toHaveLength(6);
      const startTimes = slots.map((s) => s.start);
      expect(startTimes).toContain(`${MONDAY}T09:00:00`);
    });

    it("ignores appointments on a different date", () => {
      const otherDayAppointment: ExistingAppointment = {
        start_at: `${TUESDAY}T09:00:00`,
        end_at: `${TUESDAY}T09:30:00`,
        status: "confirmed",
      };
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [],
        [otherDayAppointment],
        TIMEZONE
      );
      expect(slots).toHaveLength(6);
    });
  });

  describe("buffer between slots", () => {
    it("applies buffer so slots are spaced by (duration + buffer)", () => {
      // With 30min duration + 10min buffer, step = 40min
      // 09:00-09:30, 09:40-10:10, 10:20-10:50, 11:00-11:30 = 4 slots
      const slots = getAvailableSlots(
        MONDAY,
        30,
        [mondayRule],
        [],
        [],
        TIMEZONE,
        10 // 10-minute buffer
      );
      expect(slots).toHaveLength(4);
      expect(slots[0]).toEqual({
        start: `${MONDAY}T09:00:00`,
        end: `${MONDAY}T09:30:00`,
      });
      expect(slots[1]).toEqual({
        start: `${MONDAY}T09:40:00`,
        end: `${MONDAY}T10:10:00`,
      });
      expect(slots[2]).toEqual({
        start: `${MONDAY}T10:20:00`,
        end: `${MONDAY}T10:50:00`,
      });
      expect(slots[3]).toEqual({
        start: `${MONDAY}T11:00:00`,
        end: `${MONDAY}T11:30:00`,
      });
    });

    it("buffer=0 (default) produces slots with no gap", () => {
      const slots = getAvailableSlots(MONDAY, 30, [mondayRule], [], [], TIMEZONE, 0);
      expect(slots).toHaveLength(6);
      // Adjacent slots: first ends at 09:30, second starts at 09:30
      expect(slots[0].end).toBe(slots[1].start);
    });
  });
});

describe("getAvailableDates", () => {
  // After timezone fix: getAvailableDates now uses local date formatting
  // (YYYY-MM-DD from getFullYear/getMonth/getDate) instead of toISOString().
  // Dec 2026 Mondays (local): 7, 14, 21, 28
  // Dec 2026 Wednesdays (local): 2, 9, 16, 23, 30

  const mondayRuleDec: AvailabilityRule = {
    day_of_week: 1, // Monday
    start_time: "09:00",
    end_time: "12:00",
    is_active: true,
  };

  const wednesdayRule: AvailabilityRule = {
    day_of_week: 3, // Wednesday
    start_time: "14:00",
    end_time: "17:00",
    is_active: true,
  };

  it("returns only dates matching active rules (correct local dates)", () => {
    const dates = getAvailableDates(2026, 11, [mondayRuleDec], []);
    expect(dates).toHaveLength(4);
    expect(dates).toContain("2026-12-07");
    expect(dates).toContain("2026-12-14");
    expect(dates).toContain("2026-12-21");
    expect(dates).toContain("2026-12-28");
  });

  it("returns dates for multiple active rules", () => {
    const dates = getAvailableDates(2026, 11, [mondayRuleDec, wednesdayRule], []);
    // 4 Mondays + 5 Wednesdays = 9
    expect(dates).toHaveLength(9);
    expect(dates).toContain("2026-12-07"); // Monday
    expect(dates).toContain("2026-12-02"); // Wednesday
    expect(dates).toContain("2026-12-30"); // Wednesday
  });

  it("excludes full-day blocked dates", () => {
    const fullDayBlock: AvailabilityException = {
      date: "2026-12-07",
      start_time: null,
      end_time: null,
    };
    const dates = getAvailableDates(2026, 11, [mondayRuleDec], [fullDayBlock]);
    expect(dates).not.toContain("2026-12-07");
    expect(dates).toContain("2026-12-14");
    expect(dates).toContain("2026-12-21");
    expect(dates).toContain("2026-12-28");
  });

  it("does not exclude dates with partial-time exceptions", () => {
    const partialBlock: AvailabilityException = {
      date: "2026-12-07",
      start_time: "10:00",
      end_time: "11:00",
    };
    const dates = getAvailableDates(2026, 11, [mondayRuleDec], [partialBlock]);
    expect(dates).toContain("2026-12-07");
  });

  it("returns empty array when no active rules are provided", () => {
    const inactiveRule: AvailabilityRule = {
      ...mondayRuleDec,
      is_active: false,
    };
    const dates = getAvailableDates(2026, 11, [inactiveRule], []);
    expect(dates).toEqual([]);
  });

  it("returns empty array when all dates are full-day blocked", () => {
    const blocks: AvailabilityException[] = [
      { date: "2026-12-07", start_time: null, end_time: null },
      { date: "2026-12-14", start_time: null, end_time: null },
      { date: "2026-12-21", start_time: null, end_time: null },
      { date: "2026-12-28", start_time: null, end_time: null },
    ];
    const dates = getAvailableDates(2026, 11, [mondayRuleDec], blocks);
    expect(dates).toEqual([]);
  });
});
