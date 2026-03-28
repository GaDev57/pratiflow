/**
 * Slot computation engine.
 *
 * Computes available booking slots for a practitioner on a given date,
 * taking into account:
 * - Recurring availability rules (day_of_week + time range)
 * - Exceptions (blocked days/times)
 * - Existing appointments (occupied slots)
 */

export interface TimeSlot {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface AvailabilityRule {
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  is_active: boolean;
}

export interface AvailabilityException {
  date: string;         // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
}

export interface ExistingAppointment {
  start_at: string; // ISO 8601
  end_at: string;   // ISO 8601
  status: string;
}

/**
 * Get available slots for a specific date.
 *
 * @param date        - The target date "YYYY-MM-DD"
 * @param duration    - Session duration in minutes
 * @param rules       - Recurring availability rules
 * @param exceptions  - Blocked dates/times
 * @param appointments - Existing booked appointments
 * @param timezone    - Practitioner's timezone (e.g. "Europe/Paris")
 * @param bufferMin   - Buffer between slots in minutes (default 0)
 */
export function getAvailableSlots(
  date: string,
  duration: number,
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  appointments: ExistingAppointment[],
  timezone: string,
  bufferMin = 0
): TimeSlot[] {
  const dayOfWeek = new Date(date + "T12:00:00").getDay();

  // 1. Get active rules for this day of week
  const dayRules = rules.filter(
    (r) => r.is_active && r.day_of_week === dayOfWeek
  );

  if (dayRules.length === 0) return [];

  // 2. Check if the entire day is blocked
  const dayExceptions = exceptions.filter((e) => e.date === date);
  const fullDayBlocked = dayExceptions.some(
    (e) => e.start_time === null && e.end_time === null
  );
  if (fullDayBlocked) return [];

  // 3. Build blocked time ranges from exceptions
  const blockedRanges: { start: number; end: number }[] = dayExceptions
    .filter((e) => e.start_time !== null && e.end_time !== null)
    .map((e) => ({
      start: timeToMinutes(e.start_time!),
      end: timeToMinutes(e.end_time!),
    }));

  // 4. Build occupied ranges from existing appointments (non-cancelled)
  const occupiedRanges: { start: number; end: number }[] = appointments
    .filter((a) => a.status !== "cancelled")
    .filter((a) => {
      const aDate = a.start_at.substring(0, 10);
      return aDate === date;
    })
    .map((a) => {
      const startDate = new Date(a.start_at);
      const endDate = new Date(a.end_at);
      return {
        start: startDate.getHours() * 60 + startDate.getMinutes(),
        end: endDate.getHours() * 60 + endDate.getMinutes(),
      };
    });

  // 5. Generate slots from each rule
  const slots: TimeSlot[] = [];
  const step = duration + bufferMin;

  for (const rule of dayRules) {
    const ruleStart = timeToMinutes(rule.start_time);
    const ruleEnd = timeToMinutes(rule.end_time);

    for (let t = ruleStart; t + duration <= ruleEnd; t += step) {
      const slotStart = t;
      const slotEnd = t + duration;

      // Check overlap with blocked ranges
      const isBlocked = blockedRanges.some(
        (b) => slotStart < b.end && slotEnd > b.start
      );
      if (isBlocked) continue;

      // Check overlap with existing appointments
      const isOccupied = occupiedRanges.some(
        (o) => slotStart < o.end && slotEnd > o.start
      );
      if (isOccupied) continue;

      // Convert to ISO timestamps
      const startHour = String(Math.floor(slotStart / 60)).padStart(2, "0");
      const startMin = String(slotStart % 60).padStart(2, "0");
      const endHour = String(Math.floor(slotEnd / 60)).padStart(2, "0");
      const endMin = String(slotEnd % 60).padStart(2, "0");

      slots.push({
        start: `${date}T${startHour}:${startMin}:00`,
        end: `${date}T${endHour}:${endMin}:00`,
      });
    }
  }

  // 6. Filter out past slots (if date is today)
  const now = new Date();
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: timezone });

  if (date === todayStr) {
    const nowMinutes =
      parseInt(
        now.toLocaleTimeString("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", "").substring(0, 2)
      ) * 60 +
      parseInt(
        now.toLocaleTimeString("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).split(":")[1]
      );

    return slots.filter((s) => {
      const slotMinutes = timeToMinutes(s.start.substring(11, 16));
      return slotMinutes > nowMinutes;
    });
  }

  return slots;
}

/**
 * Get available dates for a month (dates that have at least one active rule).
 */
export function getAvailableDates(
  year: number,
  month: number, // 0-indexed
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[]
): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().substring(0, 10);
    const dow = d.getDay();

    const hasRule = rules.some((r) => r.is_active && r.day_of_week === dow);
    if (!hasRule) continue;

    const isFullBlocked = exceptions.some(
      (e) => e.date === dateStr && e.start_time === null && e.end_time === null
    );
    if (isFullBlocked) continue;

    // Skip past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) continue;

    dates.push(dateStr);
  }

  return dates;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
