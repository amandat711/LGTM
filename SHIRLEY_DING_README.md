# Shirley Ding: contributions

What I worked on, grouped by topic. From highest ownership to lowest.

## Authentication, session, and routing

- The backend was done entirely by me.  I implemented most of the frontend as well, but others have modified the styling and/or layout since.
- Login, register, forgotPassword, resetPassword pages, plus the early Tailwind setup for them.
- Created `client/src/api/auth.js` and `server/routes/auth.js` along with the api endpoints required.
- Swapped out placeholder/hardcoded auth for `authUtils`, `useRequireAuth`, `useRequirePageVariant`, `useAppShellSession`, and `AppShellLayout`.
- Added logout and removed user id from URL paths.
- Small UI changes on `AuthShell` and auth navbar modifications.

---

## Courses Pages

- The backend was done entirely by me. I implemented most of the frontend as well, but others have made small changes to the styling and/or layout since.
- Courses backend: `server/routes/courses.js`, small db schema changes.
- Courses UI: `CourseSettingsModal`, `CreateCourseModal`, `CoursesListPage`, `CourseJoinPage`, `CourseDetailPage` and the CSS that goes with them.
- Implemented for all 3 possible views: professor, TA and student

---

## Email Notifications

- I own the entire email notifications feature. It is backend only.
- Set up Nodemailer for mailing services and created `mailer.js`.
- Worked on all email notifications from in-app triggers. `server/lib/appointmentNotifications.js` decides what to send when.
- Updated the appointments, auth, availabilities, and heatmaps routes to include the corresponding email-sending functions.

---

## Online hosting

- Set up SOCS deploy config/env for online hosting.
- Emailed IT about reverse-proxy setup and forwarded headers (**X-Forwarded-Proto** / **Host**) for HTTPS and session cookies.
- Resolved any issues and bugs we ran into while trying to host.

---

## Email, config, dates, utils (code cleanup and organization)

- Added `server/lib/mailer.js` and shared `constants/config.js` (client + server) plus `server/constants/auth.js` for storing constants in one place. 
- `ResetPasswordPage.jsx` is basically all mine (see numbers below).
- Made dates/timezones behave the same way across appointments, availabilities, and heatmaps (`client` + `server` `dateTime.js` and the routes that use them).

---

## Search / booking discovery / heatmaps

- Fixed multiple backend and frontend bugs in `BookingDiscovery.jsx`, `BookingProfessor.jsx`, `client/src/api/users.js`, and `server/routes/users.js`.
  - Fixed wrong capacity behaviour on the booking page (`server/routes/availabilities.js`).
  - Fixed bug where TAs were being returned on the Search page.
  - Fixed bug where only professors with availabilities were being returned.
- **`BookingProfessor.jsx`**: **Contact** (reach the slot owner) and **copy booking page link** (share the page URL).
- **`BookingProfessor.jsx`**: professor **department** and **staff title** on the profile/header area.

---

## Bugfixes

- Course admin edge case in `server/routes/courses.js`.
- Search page issues and the availability capacity bug mentioned above.

---

## Branding and landing

- Changed the public name to **DropIn** on the landing page and in `index.html`.
- Cleaned up camelCase in those same files.

---

## File contribution percentages

Rough share of lines per file that got counted as mine (rerun your script if the repo moves on).

```
client/src/api/auth.js                                      94     94  100.0%
client/src/constants/config.js                               4      4  100.0%
client/src/pages/ResetPasswordPage.jsx                     161    161  100.0%
client/src/styles/CourseSettingsModal.css                  260    260  100.0%
client/src/utils/dateTime.js                                34     34  100.0%
server/constants/auth.js                                     8      8  100.0%
server/constants/config.js                                  10     10  100.0%
server/lib/appointmentNotifications.js                     570    570  100.0%
server/utils/dateTime.js                                    14     14  100.0%
client/src/api/courses.js                                  103    104   99.0%
server/routes/courses.js                                   678    687   98.7%
client/src/pages/CoursesListPage.jsx                       281    290   96.9%
client/src/pages/CourseJoinPage.jsx                         90     94   95.7%
client/src/layouts/AppShellLayout.jsx                       43     45   95.6%
client/src/components/CourseSettingsModal.jsx              425    446   95.3%
server/routes/auth.js                                      399    419   95.2%
client/src/hooks/useRequirePageVariant.js                   76     82   92.7%
client/src/hooks/useAppShellSession.js                      12     13   92.3%
client/src/styles/CourseDetailPage.css                     599    658   91.0%
client/src/components/CreateCourseModal.jsx                134    149   89.9%
client/src/auth/authUtils.js                                28     32   87.5%
client/src/auth/authUi.js                                   20     24   83.3%
client/src/hooks/useRequireAuth.js                          34     41   82.9%
client/src/styles/CoursesListPage.css                      216    267   80.9%
server/lib/mailer.js                                       266    388   68.6%
client/src/components/AuthShell.jsx                         10     17   58.8%
client/src/App.js                                           31     55   56.4%
client/src/components/calendar/Calendar.jsx                 18     32   56.2%
client/src/api/users.js                                     20     38   52.6%
client/src/pages/CourseDetailPage.jsx                      445    903   49.3%
server/index.js                                             31     65   47.7%
client/src/pages/ForgotPasswordPage.jsx                     48    116   41.4%
client/src/components/CreateAppointmentModal.jsx            12     33   36.4%
server/routes/users.js                                      30     90   33.3%
client/src/pages/LoginPage.jsx                              48    166   28.9%
client/src/pages/RegisterPage.jsx                           72    296   24.3%
client/src/api/appointments.js                              34    168   20.2%
client/src/index.css                                         5     33   15.2%
client/public/index.html                                     7     50   14.0%
client/src/api/availabilities.js                             7     67   10.4%
client/src/components/dashboard/DashboardLayout.jsx         12    118   10.2%
server/routes/availabilities.js                             72   1086    6.6%
server/database/booking_schema.sql                          16    280    5.7%
server/routes/appointments.js                              104   2033    5.1%
client/src/pages/BookingProfessor.jsx                       22    442    5.0%
client/src/pages/ProfessorDashboard.jsx                     32    871    3.7%
data-starter.sh                                              9    288    3.1%
server/routes/heatmaps.js                                   25    828    3.0%
client/src/components/Modals.jsx                            25    858    2.9%
client/src/pages/BookingDiscovery.jsx                        5    172    2.9%
client/src/pages/landingPage.jsx                             9    320    2.8%
client/src/styles/Calendar.css                              14    533    2.6%
client/src/pages/StudentDashboard.jsx                       15    644   2.3%
client/src/components/calendar/WeekView.jsx                  8    381   2.1%
client/src/utils/heatmapPageUtils.js                         3    158    1.9%
client/src/api/heatmaps.js                                   2    109    1.8%
client/src/styles/Dashboard.css                             24   1711    1.4%
client/src/pages/ProfessorHeatmap.jsx                        7    963    0.7%
client/src/components/calendar/calendarUtils.jsx             2    314    0.6%
client/src/styles/LandingPage.css                            4    725    0.6%
```

