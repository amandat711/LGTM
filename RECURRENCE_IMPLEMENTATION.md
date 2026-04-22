# Weekly Recurrence Implementation Guide

# Frontend (CreateAvailabilityModal.jsx)

- ✅ Structured recurrence state management
- ✅ Google Calendar-style recurrence sub-modal (RecurrenceModal.jsx)
- ✅ Recurrence summary display with readable labels
- ✅ Frontend validation for recurrence rules
- ✅ Automatic state reset on modal close/submit
- ✅ Weekday selection initialization from base date

### Backend (availabilities.js routes)

- ✅ Recurrence rule validation and parsing
- ✅ Weekly occurrence generation with weekday selection
- ✅ Support for 'never', 'on date', and 'after count' end types
- ✅ Slot splitting for each occurrence (reuses buildSlots logic)
- ✅ Overlap detection on all generated slots
- ✅ JSON serialization of recurrence rules
- ✅ Safety limit for 'never' recurrence (12 weeks)
- ✅ Enhanced response metadata (created_count, recurrence_applied)

### Database

- ✅ Recurrence rule storage as JSON string in existing recurrence_rule column

---

## Test Cases

### Basic Functionality

**Case 1: No Recurrence**

```
Input: One-time availability
- Date: 2026-05-15
- Time: 10:00 - 12:00
- Recurrence: Does not repeat
- Slot duration: 30 min

Expected Output:
- 1 availability record created
- Contains 4 slots (10:00, 10:30, 11:00, 11:30)
- recurrence_rule: null
```

**Case 2: Weekly Single Weekday**

```
Input: Every Friday for 4 occurrences
- Base date: 2026-05-15 (Friday)
- Time: 10:00 - 11:00
- Recurrence: Every 1 week on Friday
- Ends: After 4 occurrences
- Slot duration: 60 min

Expected Output:
- 4 availability records created
- Dates: 2026-05-15, 2026-05-22, 2026-05-29, 2026-06-05
- Each with 1 slot
- recurrence_rule: {...enabled: true, byWeekdays: ["FR"], count: 4, endType: "after"}
```

**Case 3: Multiple Weekdays**

```
Input: Monday, Wednesday, Friday for 3 weeks
- Base date: 2026-05-15 (Friday)
- Time: 14:00 - 15:00
- Recurrence: Every 1 week on Mon, Wed, Fri
- Ends: After 9 occurrences (3 weeks × 3 days)
- Slot duration: 60 min

Expected Output:
- 9 availability records created
- Pattern: M, W, F, M, W, F, M, W, F
- recurrence_rule includes byWeekdays: ["MO", "WE", "FR"]
```

**Case 4: Ends on Date**

```
Input: Every week on Friday until June 26
- Base date: 2026-05-15 (Friday)
- Time: 10:00 - 11:00
- Recurrence: Every 1 week on Friday
- Ends: On 2026-06-26
- Slot duration: 60 min

Expected Output:
- Multiple availability records
- Last occurrence on or before 2026-06-26
- recurrence_rule: {...endType: "on", until: "2026-06-26"}
```

**Case 5: Multi-week Interval**

```
Input: Every 2 weeks on Tuesday
- Base date: 2026-05-19 (Tuesday)
- Time: 09:00 - 10:00
- Recurrence: Every 2 weeks on Tuesday
- Ends: After 4 occurrences
- Slot duration: 60 min

Expected Output:
- 4 availability records
- Dates: 2026-05-19, 2026-06-02, 2026-06-16, 2026-06-30
- recurrence_rule: {...interval: 2}
```

**Case 6: Slot Duration Splitting**

```
Input: Recurring slots with 30-min duration
- Base date: 2026-05-15
- Time: 10:00 - 12:00 (2 hours)
- Recurrence: Every 1 week on Friday
- Ends: After 2 occurrences
- Slot duration: 30 min

Expected Output:
- 2 availability records (one per Friday)
- Each with 4 slots (10:00, 10:30, 11:00, 11:30)
- Total: 8 slot records across 2 availabilities
```

### Edge Cases & Validation

**Case 7: Invalid Recurrence - No Weekdays Selected**

```
Input: Recurrence enabled with empty weekday list
Expected: 400 error
Error: "Select at least one weekday"
```

**Case 8: Invalid Recurrence - Bad Interval**

```
Input: Recurrence with interval: 0
Expected: 400 error
Error: "interval must be >= 1"
```

**Case 9: Invalid Recurrence - Missing End Date**

```
Input: endType: 'on' but until: '' or null
Expected: 400 error
Error: "Select an end date"
```

**Case 10: Invalid Recurrence - Bad Count**

```
Input: endType: 'after' with count: 0
Expected: 400 error
Error: "Occurrences must be at least 1"
```

**Case 11: Overlap Detection on Recurring Slots**

```
Setup: Create availability #1 Friday 10:00-11:00 (recurring)
Then: Try to create availability #2 Friday 10:30-11:30 (recurring)

Expected: 400 error
Error: "One or more generated slots overlap with an existing availability"
Note: Entire request rejected, no partial inserts
```

**Case 12: Non-Recurring Slot Cannot Overlap (existing behavior)**

```
Should work same as before
Expected: 400 error if overlap detected
```

### "Never" Recurrence Behavior

**Case 13: Never Ends - Safety Limit**

```
Input: endType: 'never', 12+ weeks of Friday slots
- Base date: 2026-05-15 (Friday)
- Recurrence: Every 1 week on Friday
- Ends: Never
- Slot duration: 60 min

Expected Output:
- Approximately 12 availability records (capped at NEVER_MAX_WEEKS)
- Last occurrence ~12 weeks from base date
- Implementation detail: NEVER_MAX_WEEKS = 12 prevents infinite generation
```

---

## Testing Checklist

### Unit Tests (Recommended)

- [ ] `weekdayCodeFromDate(date)` returns correct code for each day
- [ ] `generateWeeklyOccurrences()` with single weekday
- [ ] `generateWeeklyOccurrences()` with multiple weekdays
- [ ] `generateWeeklyOccurrences()` respects endType='on' boundary
- [ ] `generateWeeklyOccurrences()` respects endType='after' count
- [ ] `generateWeeklyOccurrences()` respects endType='never' safety limit
- [ ] Recurrence rule validation in POST route

### Integration Tests (Manual in UI)

- [ ] Create non-recurring availability
- [ ] Create recurring availability (single weekday)
- [ ] Create recurring availability (multiple weekdays)
- [ ] View recurring availabilities in calendar
- [ ] Verify slot count matches expected
- [ ] Verify date progression matches rule

---

## Future Work (Phase 2+)

### Data Model Enhancement

```sql
-- Proposed new columns for series operations (NOT implemented yet)
ALTER TABLE availabilities ADD COLUMN recurrence_group_id INTEGER;
ALTER TABLE availabilities ADD COLUMN recurrence_exception_dates TEXT; -- JSON array
ALTER TABLE availabilities ADD COLUMN series_start_date TEXT;
ALTER TABLE availabilities ADD COLUMN series_end_date TEXT;
```

### Series Operations

- [ ] **Edit whole series**: Apply changes to all future occurrences
- [ ] **Edit single occurrence**: Allow exceptions to the rule
- [ ] **Delete whole series**: Remove all occurrences in series
- [ ] **Delete single occurrence**: Mark as exception/cancelled
- [ ] **Recurrence exceptions**: Handle cancelled or moved dates

### Extended Recurrence Support

- [ ] **Monthly recurrence**: Same date each month, or Nth weekday
- [ ] **Custom intervals**: Every 1, 2, 3+ months
- [ ] **Yearly recurrence**: Specific date or pattern per year
- [ ] **Complex rules**: Combine multiple conditions (e.g., last Friday of every month)

### UI/UX Improvements

- [ ] **Preview**: Show first/last few occurrences in summary
- [ ] **Visual indication**: Flag recurring vs one-time in calendar view
- [ ] **Bulk operations**: UI for editing/deleting series
- [ ] **Recurrence templates**: Save and reuse common patterns

### Advanced Features

- [ ] **Working hours**: Avoid holidays/weekends
- [ ] **Timezone support**: Handle DST transitions
- [ ] **Invitation management**: Notify students of series changes
- [ ] **Analytics**: Track which occurrences got booked most

---

## Code Architecture Notes

### Helper Functions Added

```javascript
// Helper to get weekday code from date
function weekdayCodeFromDate(date) { ... }

// Main recurring generation engine
function generateWeeklyOccurrences({
  baseStartDate,
  baseEndDate,
  interval,
  byWeekdays,
  endType,
  until,
  count,
  maxOccurrences = 200
}) { ... }
```

### Validation Flow (Backend)

1. Parse recurrence_rule (object or JSON string)
2. If enabled:
   - Validate frequency === 'weekly'
   - Validate interval is positive integer
   - Validate byWeekdays is non-empty array
   - Validate weekday codes are valid
   - Validate endType is one of: 'never', 'on', 'after'
   - If endType='on': validate until is valid date
   - If endType='after': validate count is positive integer
3. Generate occurrences
4. Build slots for each occurrence
5. Check overlaps on full slot array
6. Insert all slots (atomic for single request)

### Storage Strategy

- Recurrence rule stored as **JSON string** in `recurrence_rule` column
- Each generated slot stored as **separate availability record**
- **No separate "series" table** in phase 1 (all slots independent)
- Future phase can use `recurrence_group_id` to link series together

### Safety Guarantees

- ✅ Overlap detection: Entire request fails if any slot overlaps
- ✅ Atomic insert: Either all slots created or none
- ✅ Bounds checking: 'Never' limited to 12 weeks
- ✅ Frontend validation: Catches user errors before backend
- ✅ Backend validation: All rules validated with clear errors

---

## API Contract

### Request Format (POST /availabilities)

```json
{
  "created_by": 42,
  "start_time": "2026-05-15T10:00:00",
  "end_time": "2026-05-15T12:00:00",
  "location": "Office 101",
  "capacity": 3,
  "visibility": "public",
  "av_title": "Office Hours",
  "av_description": "Drop-in available",
  "slot_duration_minutes": 30,
  "recurrence_rule": {
    "enabled": true,
    "frequency": "weekly",
    "interval": 1,
    "byWeekdays": ["MO", "WE", "FR"],
    "endType": "after",
    "until": null,
    "count": 13
  }
}
```

### Response Format

```json
{
  "message": "Availabilities created successfully",
  "created_count": 13,
  "slot_duration_minutes": 30,
  "recurrence_applied": true,
  "availabilities": [
    { "availability_id": 101, "start_time": "...", "end_time": "...", "recurrence_rule": "{...}" },
    { "availability_id": 102, "start_time": "...", "end_time": "...", "recurrence_rule": "{...}" },
    ...
  ]
}
```

- **Future**: Series operations, extended recurrence types, timezone support
