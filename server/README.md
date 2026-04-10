# Server API Endpoints

This file documents the currently implemented backend endpoints in `server/`.

## Base URL
- Default server port: `5000`
- Health check: `GET /api/health`

## Availabilities

### `POST /availabilities`
Create availability slots.
- Body required:
  - `created_by` (user id)
  - `start_time` (ISO datetime)
  - `end_time` (ISO datetime)
- Optional body:
  - `slot_duration_minutes` (default `30`)
  - `location`
  - `capacity` (default `1`)
  - `visibility` (`public` or `private`, default `private`)
  - `recurrence_rule`
  - `av_title`
  - `av_description`
- Notes:
  - Only `course_admin` and `general_admin` users may create availabilities.
  - Time range must divide evenly by `slot_duration_minutes`.
  - New generated slots cannot overlap existing availabilities for the same creator.

### `GET /availabilities`
List availabilities.
- Query params:
  - `created_by`
  - `visibility` (`public` or `private`)
  - `date`
  - `include_full=true`
  - `include_past=true`
  - `include_creator=true`
  - `search`
- Default behavior without `created_by`: only public, non-past availabilities are returned.

### `GET /availabilities/owners`
List public availability owners with at least one future, not-full public slot.
- Query params:
  - `search`

### `GET /availabilities/owner/:createdBy`
List all availabilities for a specific creator.
- Path param: `createdBy`

### `DELETE /availabilities/:id`
Delete an availability.
- Path param: `id`
- Body required:
  - `deleted_by` (user id)
- Notes:
  - Only availability owner or admin may delete.
  - Cannot delete if there are active booked appointments.

## Appointments

### `POST /appointments`
Book an appointment from an availability.
- Body required:
  - `availability_id`
  - `booked_by` (user id)
- Notes:
  - Only public availabilities can be booked.
  - The slot must be future-starting.
  - Booking is blocked when capacity is full.
  - Same user cannot book the same availability twice.

### `GET /appointments/my`
List all appointments for a user.
- Query params:
  - `user_id`
- Returns appointments plus participant details.

### `GET /appointments/hosting`
List appointments where the user is host.
- Query params:
  - `user_id`
- Returns appointments plus participant details.

### `GET /appointments/attending`
List appointments where the user is attendee.
- Query params:
  - `user_id`
- Returns appointments plus participant details.

### `PATCH /appointments/:id/cancel`
Cancel an appointment.
- Path param: `id`
- Body required:
  - `changed_by` (user id)
- Optional body:
  - `note`
- Notes:
  - Cannot cancel an appointment already marked `cancelled`.

## Notes
- The server is wired in `server/index.js` with:
  - `app.use('/availabilities', availabilitiesRouter)`
  - `app.use('/appointments', appointmentsRouter)`
- The app uses SQLite via `server/config/db.js`.
- No authentication middleware is implemented yet; user permission checks are done manually in routes.
