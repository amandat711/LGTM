# Final Report: Jocelyne Li Contributions to LGTM / dropIn

I worked primarily on the scheduling core of the project (calendar + booking flow), substantial backend/data logic, and final product polish across auth and dashboards. I also handled a large portion of integration work when features from different branches had to work together in `main`.

## Major Contributions

- **Architecture and setup**

  - Created early wireframes and the ER diagram used to align the booking/availability data model.
  - Implemented most of the base SQL schema and later extended it for recurrence and calendar interoperability.
- **Calendar and booking system (core ownership)**

  - Implemented the main calendar logic used for weekly scheduling, event rendering, recurrence behavior, and drag/create interactions.
  - Built and refined the booking flow backend: availability creation, overlap checks, booking creation, appointment state updates, cancellation handling, and recurring edit/delete scopes.
  - Connected frontend booking workflows to backend routes so student and professor flows stayed consistent end to end.
- **Calendar interoperability**

  - Added ICS export support and integration points so appointments/availability could be exported as calendar events.
  - Implemented calendar sync infrastructure with Cloudflare demo hosting (tokenized feed support, modal flow, and backend route integration).
- **UI/UX polish and integration**

  - Polished auth screens (including styling consistency and UX fixes), dashboard layouts, modals, and navigation/sidebar consistency.
  - Did major merge/integration passes to keep booking, courses, and dashboard features working together on `main`.

## Key Files I Worked On

### Backend and data

- `server/database/booking_schema.sql`Defined and extended the booking schema (appointments, availabilities, recurrence-related changes, and calendar sync table support).
- `server/routes/appointments.js`Implemented booking/appointment lifecycle behavior including create/update/cancel and recurrence-aware operations.
- `server/routes/availabilities.js`Added availability CRUD, overlap prevention, slot generation, and recurring availability handling.
- `server/utils/recurrence.js`Added recurrence parsing/validation utilities used across scheduling routes.
- `server/routes/calendarSync.js`Implemented sync feed endpoints and token-based calendar feed flow.
- `server/utils/calendarIcs.js`
  Implemented ICS event generation for export/sync behavior.

### Frontend scheduling and booking

- `client/src/components/calendar/WeekView.jsx`Refined weekly calendar rendering, event interactions, status display, and UX behavior.
- `client/src/pages/BookingDiscovery.jsx`Integrated booking search/discovery flow with backend scheduling logic and polished layout behavior.
- `client/src/pages/BookingProfessor.jsx`Implemented professor-side booking management and improved consistency with shared scheduling components.
- `client/src/components/ExportCalendarModal.jsx`Added export modal flow and standardized export UI behavior.
- `client/src/components/SyncCalendarModal.jsx`
  Added sync modal UX and wired it into backend calendar sync support.

### Frontend auth/dashboard polish

- `client/src/pages/LoginPage.jsx`Polished auth UI and improved interaction details (including password visibility and visual consistency).
- `client/src/pages/RegisterPage.jsx`Updated registration UI for consistency with auth shell and project design system.
- `client/src/pages/StudentDashboard.jsx`Improved scheduling/dashboard integration and recurring-event display behavior.
- `client/src/pages/ProfessorDashboard.jsx`Polished dashboard behavior and integration with booking/calendar tools.
- `client/src/components/AppSidebar.jsx`
  Standardized sidebar navigation/icons for consistency across major app pages.

## AI Usage Disclosure

I used AI as coding assistance for selected implementation chunks, mainly for scaffolding, query-shape drafting, and recurrence edge-case brainstorming. It was not used as full feature ownership. The percentages below are estimates relative to **my own contribution to each file area**, not the whole file.

### Where AI helped most

- `client/src/utils/generateDays.js` -> about 80% of my contribution.I used AI to quickly draft the initial date/time label generation logic, then adjusted it to match our grid format and scheduling flow.
- `client/src/components/BookingCalendar.jsx` -> template-inspired base structure.The visual structure was initially inspired by a Bootstrap/Colorlib calendar reference, but I manually adapted component behavior, project styling, and booking integration around it.
- `server/routes/appointments.js` -> about 30% of my contribution on this file.I used AI support when drafting parts of long endpoint structures (request parsing, status/update flow branches, and query organization), then manually integrated, debugged, and aligned behavior with our schema and frontend expectations.
- `server/routes/availabilities.js` -> about 30% of my contribution on this file.AI helped with first-pass endpoint scaffolding and overlap/validation branch structure, but final recurrence behavior, slot logic integration, and bug fixes were manually implemented and tested.
- `server/utils/recurrence.js` and recurrence logic used in routes -> about 35% of my contribution.
  AI was used for recurrence rule/expansion ideas and edge-case checks; I handled adaptation to our actual workflow, endpoint integration, and verification.

### Partial AI assistance (targeted sections)

- `server/routes/calendarSync.js` / `server/utils/calendarIcs.js` -> about 20% of my contribution across these files.AI helped with some formatting/query-shape ideas, while final token flow, ICS behavior, and route integration were done manually.
- `client/src/pages/BookingDiscovery.jsx` / `client/src/pages/BookingProfessor.jsx` -> about 15% of my contribution across these pages.
  AI was used for a few UX/structure suggestions, then refined manually to fit booking behavior and role-specific flows.

### Human-led work (majority of my contributions)

- Wireframes and ER diagram direction for scheduling data flow.
- Most schema/backend implementation for booking and recurrence (`server/database/booking_schema.sql`, `server/routes/appointments.js`, `server/routes/availabilities.js`, and related integration).
- Calendar export/sync integration and infrastructure (`server/utils/calendarIcs.js`, `server/routes/calendarSync.js`, modal/API wiring).
- Auth/dashboard polish, bug fixing, and branch integration/merge conflict resolution across features.

Across my total contributions, I estimate about 30-35% generated code, with final implementation decisions, integration, and verification done by me.

## Contribution Marking Summary

I contributed heavily to the project’s scheduling backbone: I owned large parts of calendar and booking logic, implemented significant backend route/schema work, and drove integration across frontend and backend as the project matured. I also delivered key UX polish in auth and dashboard areas and handled substantial merge/integration effort on `main` to keep features stable for demos and final delivery.
