// JOCELYNE LI (100% estimated contribution) => Feature implementation, integration work, and quality refinements
const NEVER_MAX_WEEKS_DEFAULT = 12; // safety cap for "never"

function toSqliteDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function parseDate(value) {
  if (typeof value !== 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const match = value.match(
    /^\s*(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?\s*$/
  );
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || '0')
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekdayCodeFromDate(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const codeMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return codeMap[dayOfWeek];
}

/**
 * Generate weekly recurring occurrences based on a weekly recurrence rule.
 * Returns an array of { start: Date, end: Date }.
 */
function generateWeeklyOccurrences({
  baseStartDate,
  baseEndDate,
  interval,
  byWeekdays,
  endType,
  until,
  count,
  maxOccurrences = 200,
  neverMaxWeeks = NEVER_MAX_WEEKS_DEFAULT,
}) {
  const occurrences = [];
  const baseDuration = baseEndDate.getTime() - baseStartDate.getTime();
  let occurrenceCount = 0;

  let weekStart = new Date(baseStartDate);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek); // back to Sunday
  weekStart.setHours(0, 0, 0, 0);

  while (occurrences.length < maxOccurrences) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + dayOffset);
      dayDate.setHours(
        baseStartDate.getHours(),
        baseStartDate.getMinutes(),
        baseStartDate.getSeconds()
      );

      if (dayDate < baseStartDate) continue;

      const dayWeekday = weekdayCodeFromDate(dayDate);
      if (!byWeekdays.includes(dayWeekday)) continue;

      const occStart = new Date(dayDate);
      const occEnd = new Date(occStart.getTime() + baseDuration);

      occurrences.push({ start: occStart, end: occEnd });
      occurrenceCount += 1;

      if (endType === 'after' && occurrenceCount >= count) {
        return occurrences;
      }

      if (endType === 'on') {
        const untilDate = parseDate(until);
        if (occEnd > untilDate) {
          occurrences.pop();
          return occurrences;
        }
      }
    }

    weekStart.setDate(weekStart.getDate() + 7 * interval);

    if (endType === 'never') {
      const weeksElapsed =
        (weekStart.getTime() - baseStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (weeksElapsed > neverMaxWeeks) break;
    }
  }

  return occurrences;
}

function error400(message) {
  const e = new Error(message);
  e.statusCode = 400;
  return e;
}

function normalizeRecurrenceRuleInput(recurrenceRuleInput) {
  if (!recurrenceRuleInput) return null;

  if (typeof recurrenceRuleInput === 'string') {
    try {
      return JSON.parse(recurrenceRuleInput);
    } catch {
      throw error400('recurrence_rule must be valid JSON if provided as string');
    }
  }

  if (typeof recurrenceRuleInput === 'object') {
    return recurrenceRuleInput;
  }

  throw error400('recurrence_rule must be an object or JSON string');
}

/**
 * Validates the weekly recurrence rule shape used by the existing availability flow.
 * Returns `{ rule, ruleForDb }` where rule is either null (not provided), or the parsed rule object.
 */
function parseAndValidateWeeklyRecurrenceRule(recurrenceRuleInput) {
  const parsed = normalizeRecurrenceRuleInput(recurrenceRuleInput);
  if (!parsed) return { rule: null, ruleForDb: null };

  if (!parsed.enabled) {
    return { rule: parsed, ruleForDb: null };
  }

  if (parsed.frequency !== 'weekly') {
    throw error400('Only weekly recurrence is supported');
  }

  if (!Number.isInteger(parsed.interval) || parsed.interval < 1) {
    throw error400('recurrence_rule.interval must be a positive integer');
  }

  if (!Array.isArray(parsed.byWeekdays) || parsed.byWeekdays.length === 0) {
    throw error400(
      'recurrence_rule.byWeekdays must be a non-empty array of weekday codes (MO, TU, WE, etc.)'
    );
  }

  const validWeekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  if (!parsed.byWeekdays.every((code) => validWeekdays.includes(code))) {
    throw error400('recurrence_rule.byWeekdays contains invalid weekday codes');
  }

  if (!['never', 'on', 'after'].includes(parsed.endType)) {
    throw error400('recurrence_rule.endType must be "never", "on", or "after"');
  }

  if (parsed.endType === 'on') {
    if (!parsed.until) {
      throw error400('recurrence_rule.until is required when endType is "on"');
    }
    const untilDate = parseDate(parsed.until);
    if (!untilDate) {
      throw error400('recurrence_rule.until must be a valid date');
    }
  }

  if (parsed.endType === 'after') {
    if (!Number.isInteger(parsed.count) || parsed.count < 1) {
      throw error400(
        'recurrence_rule.count must be a positive integer when endType is "after"'
      );
    }
  }

  return { rule: parsed, ruleForDb: JSON.stringify(parsed) };
}

/**
 * Expand a base start/end into an array of occurrences.
 * If rule is missing/disabled, returns a single occurrence [{start, end}].
 */
function expandOccurrences({ baseStartDate, baseEndDate, recurrenceRule }) {
  if (!recurrenceRule || !recurrenceRule.enabled) {
    return [{ start: baseStartDate, end: baseEndDate }];
  }

  if (recurrenceRule.frequency !== 'weekly') {
    throw error400('Only weekly recurrence is supported');
  }

  return generateWeeklyOccurrences({
    baseStartDate,
    baseEndDate,
    interval: recurrenceRule.interval,
    byWeekdays: recurrenceRule.byWeekdays,
    endType: recurrenceRule.endType,
    until: recurrenceRule.until,
    count: recurrenceRule.count,
  });
}

module.exports = {
  toSqliteDateTime,
  parseDate,
  weekdayCodeFromDate,
  generateWeeklyOccurrences,
  parseAndValidateWeeklyRecurrenceRule,
  expandOccurrences,
};

