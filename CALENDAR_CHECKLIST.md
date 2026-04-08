# Calendar & Events Implementation Checklist

## Goal

Implement the appointment/calendar flow in small phases so the booking system works early, then add recurring events and calendar export after.

## Important scope note

- Core booking/appointment functionality is required for the project.
- Exporting appointments to Google/Outlook calendars is a bonus feature for the regular project, but required for the competition version.

---

## Phase 0 - Before coding

- [X] Confirm what your team means by "calendar"
  - [X] Internal calendar view of appointments/slots in your app
  - [X] Recurring office hours
  - [X] Group meeting scheduling
  - [X] Export to Google/Outlook (`.ics`) later
- [X] Freeze the database schema for calendar-related tables
- [X] Decide naming conventions for statuses and scheduling modes
- [X] Make sure `app.db` can be initialized locally with `npm run init-db`

---

## Phase 1 - Database foundation

### Tables to have ready for scheduling core

- [X] `users`
- [X] `availabilities`
- [X] `appointments`
- [X] `appointment_participants`
- [X] `appointment_history`
- [X] `invitations`

---

## Phase 2 - Backend DB connection

- [X] Create `server/config/db.js` or equivalent
- [X] Connect to `database/app.db`
- [X] Enable foreign keys with `PRAGMA foreign_keys = ON`
- [X] Test DB connection with a simple query
- [X] Add a small script or route to verify tables exist

---

## Phase 3 - Core calendar logic first

### A. Owner creates available time slots

- [ ] Create route to add one availability slot
- [ ] Validate: end time is after start time
- [ ] Validate: only allowed users can create slots
- [ ] Save location / visibility / capacity
- [ ] Return created availability

### B. Users view available slots

- [ ] Create route to list public/active availabilities
- [ ] Filter out past slots
- [ ] Filter out full slots if capacity reached
- [ ] Optional: filter by owner/course/date

### C. User books a slot

- [ ] Create booking route
- [ ] Check slot exists
- [ ] Check slot is visible/public if required
- [ ] Check slot is not already full
- [ ] Create appointment from selected availability
- [ ] Insert participants (`host`, `attendee`)
- [ ] Mark/update availability if needed
- [ ] Add history record

### D. Dashboard events

- [ ] Route for "my appointments"
- [ ] Route for "appointments I host"
- [ ] Route for "appointments I attend"
- [ ] Sort by upcoming first
- [ ] Include status, time, location, participants

### E. Cancel appointment

- [ ] Create cancel route
- [ ] Update appointment status to `cancelled`
- [ ] Add history entry
- [ ] Decide whether slot becomes available again

---

## Phase 4 - Internal calendar view in the app

- [ ] Decide frontend calendar style
  - [ ] simple list grouped by date
  - [ ] week view
  - [ ] month view
- [ ] Create endpoint returning events in frontend-friendly format
- [ ] Map each appointment to:
  - [ ] `id`
  - [ ] `title`
  - [ ] `start`
  - [ ] `end`
  - [ ] `status`
  - [ ] `location`
- [ ] Show different labels/styles for host vs attendee
- [ ] Show cancelled vs confirmed clearly

---

## Phase 5 - Recurring office hours

- [ ] Decide recurrence format
  - [ ] simple custom fields
  - [ ] store recurrence rule string
- [ ] Start with the simplest version: generate repeated slots in backend
- [ ] Inputs:
  - [ ] start date
  - [ ] end date or number of weeks
  - [ ] day(s) of week
  - [ ] start/end time
- [ ] Generate repeated `availabilities`
- [ ] Prevent overlapping duplicate slots
- [ ] Test weekly repetition carefully

---

## Phase 6 - Request-a-meeting flow

- [ ] Route for user to request a meeting with message
- [ ] Save as invitation/request or pending appointment
- [ ] Owner dashboard shows pending requests
- [ ] Owner can accept/decline
- [ ] If accepted, create actual appointment
- [ ] Add participants and history

---

## Phase 7 - Group meetings (calendar method)

- [ ] Owner creates candidate times
- [ ] Owner invites users
- [ ] Invitees select one or more available times
- [ ] Count selected times per slot
- [ ] Owner finalizes one slot
- [ ] Create one shared appointment
- [ ] Add all final participants

---

## Phase 8 - Calendar export (`.ics`)

- [ ] Leave this until core booking works
- [ ] Decide export scope
  - [ ] one appointment
  - [ ] all my appointments
- [ ] Generate `.ics` file from appointment data
- [ ] Include title, start, end, location, description
- [ ] Test import into Google Calendar
- [ ] Test import into Outlook Calendar

---

## Phase 9 - Validation and edge cases

- [ ] Prevent end time before start time
- [ ] Prevent booking past events
- [ ] Prevent double booking if not allowed
- [ ] Prevent over-capacity bookings
- [ ] Handle cancelled appointments in UI
- [ ] Handle deleted/cancelled slot behavior consistently
- [ ] Decide timezone handling early

---

## Phase 10 - Testing checklist

### DB / backend

- [ ] Create availability works
- [ ] List availabilities works
- [ ] Book appointment works
- [ ] Cancel appointment works
- [ ] Dashboard returns correct appointments
- [ ] Recurring slot generation works
- [ ] History rows are created when changes happen

### Frontend

- [ ] Calendar/list displays events correctly
- [ ] Booking updates UI immediately
- [ ] Cancelling updates UI immediately
- [ ] Upcoming vs past appointments are separated

---

## Minimum viable version

If time gets tight, finish these first:

- [ ] create slot
- [ ] list slot
- [ ] book slot
- [ ] show my appointments
- [ ] cancel appointment
- [ ] basic calendar/list UI

Then do recurring and export after.
