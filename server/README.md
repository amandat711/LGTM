# Server API Endpoints

This file documents the currently implemented backend endpoints in `server/`.

## Base URL
- Default server port: `4000`
- Health check: `GET /api/health`

## Auth

Sessions use **express-session** with an HTTP-only cookie. For browser requests from the React dev app, use `fetch` with **`credentials: 'include'`**. CORS allows origins `http://localhost:3000` and `http://127.0.0.1:3000` with credentials.

### `POST /auth/register`
Create a new user (does not log them in).
- Body (JSON):
  - `name` (string, full name; split into `first_name` / `last_name` on the server)
  - `email`
  - `password` (minimum 8 characters)
- Email must be `@mail.mcgill.ca` or `@mcgill.ca` (normalized to lowercase).
- **`user_type` on self-registration:** `@mail.mcgill.ca` → `student`; `@mcgill.ca` → `general_admin` (faculty).
- **`course_admin`** is not set by this endpoint: it represents a student with extra admin rights in specific courses only, and would be assigned in the database (or a future admin API) after registration as `student`.

### `POST /auth/login`
Log in and attach the session cookie.
- Body: `email`, `password`
- Updates `last_login_at` for the user on success.

### `POST /auth/logout`
End the session.

### `GET /auth/me`
Return the current user from the session.

### Protecting other routes
`server/routes/auth.js` exports **`requireAuth`** (middleware). Use it on routes that should only run for a logged-in user (`req.session.userId`).

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
  - `app.use('/auth', authRouter)` and `app.use('/api/auth', authRouter)`
  - `app.use('/availabilities', availabilitiesRouter)`
  - `app.use('/appointments', appointmentsRouter)`
- Middleware order: CORS → `express.json()` → `express-session` → routes.
- The app uses SQLite via `server/config/db.js`.
- Session-based auth lives in `server/routes/auth.js`. Other routes may still accept `user_id` in the body or query until they are migrated to `requireAuth`.
