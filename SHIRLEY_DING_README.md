# Shirley Ding: contributions

What I worked on, grouped by topic. From highest ownership to lowest.

## Authentication, session, and routing

- The backend was done entirely by me.  I implemented most of the frontend as well, but others have modified the styling and/or layout since.
- Own the Login, register, forgotPassword, resetPassword pages, plus the early Tailwind setup for them.
- Created `client/src/api/auth.js` and `server/routes/auth.js` along with the api endpoints required.
- Swapped out placeholder/hardcoded auth for `authUtils`, `useRequireAuth`, `useRequirePageVariant`, `useAppShellSession`, and `AppShellLayout`.
- Added logout and removed user id from URL paths.
- Small UI changes on `AuthShell` and auth navbar modifications.

---

## Courses Pages

- The backend was done entirely by me. I implemented most of the frontend as well, but others have made small changes to the styling and/or layout since.
- Courses backend: `server/routes/courses.js` and small db schema changes.
- Courses UI: `CourseSettingsModal`, `CreateCourseModal`, `CoursesListPage`, `CourseJoinPage`, `CourseDetailPage` and the CSS that goes with them.
- Implemented for all 3 possible views: professor, TA and student
- Implemented all features related to Courses

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
- Made dates/timezones behave the same way across appointments, availabilities, and heatmaps (`client` + `server` `dateTime.js` and the routes that use them).

---

## Search / booking discovery / heatmaps

- Fixed multiple backend and frontend bugs in `BookingDiscovery.jsx`, `BookingProfessor.jsx`, `client/src/api/users.js`, and `server/routes/users.js`.
  - Fixed wrong capacity behaviour on the booking page (`server/routes/availabilities.js`).
  - Fixed bug where TAs were being returned on the Search page.
  - Fixed bug where only professors with availabilities were being returned on the Search Page.
- **`BookingProfessor.jsx`**: Added **Contact** (reach the slot owner) and **copy booking page link** (share the page URL) buttons and their logic.
- **`BookingProfessor.jsx`**: Added professor **department** and **staff title** on the profile/header area.

---

## Bugfixes

- Fixed a bug where assigning a student as TA wasn't changing his user_type to course_admin in the db in `server/routes/courses.js`.
- Search page issues and the availability capacity bug mentioned above.

---

## Branding and landing

- Changed the public name to **DropIn** on the landing page and in `index.html`.
- Cleaned up camelCase in those same files.

---

## Database and App Design

- Jocelyne is the main owner of our database design, but I collaborated, reviewed and provided feedback on some design decisions when we had team meetings. I also actively added small changes to the schema (adding a new table column, etc) when necessary during development. 
- Contributed to the early discussions of the design of our website including which features to include and the big strokes of how everything would work together.

---

## File contribution percentages

Rough share of lines per file that are mine.

```
client/src/api/auth.js                                      94     94  100.0%
client/src/auth/authUtils.js                                32     32  100.0%
client/src/constants/config.js                               4      4  100.0%
client/src/hooks/useAppShellSession.js                      13     13  100.0%
client/src/layouts/AppShellLayout.jsx                       45     45  100.0%
client/src/pages/ResetPasswordPage.jsx                     161    161  100.0%
client/src/utils/dateTime.js                                34     34  100.0%
client/tailwind.config.js                                   25     25  100.0%
server/constants/auth.js                                     8      8  100.0%
server/constants/config.js                                  10     10  100.0%
server/lib/appointmentNotifications.js                     570    570  100.0%
server/utils/dateTime.js                                    14     14  100.0%
client/src/api/courses.js                                  103    104   99.0%
server/routes/courses.js                                   679    687   98.8%
client/src/pages/CoursesListPage.jsx                       282    290   97.2%
client/src/pages/CourseJoinPage.jsx                         91     94   96.8%
client/src/auth/authUi.js                                   23     24   95.8%
server/routes/auth.js                                      400    419   95.5%
client/src/hooks/useRequirePageVariant.js                   77     82   93.9%
client/src/components/CreateCourseModal.jsx                135    149   90.6%
client/src/hooks/useRequireAuth.js                          35     41   85.4%
client/src/styles/CourseSettingsModal.css                  258    331   77.9%
client/src/styles/CoursesListPage.css                      216    282   76.6%
client/src/styles/CourseDetailPage.css                     600    793   75.7%
server/lib/mailer.js                                       267    388   68.8%
client/src/components/AuthShell.jsx                         11     17   64.7%
client/src/components/calendar/Calendar.jsx                 19     32   59.4%
server/README.md                                           147    250   58.8%
client/src/components/CourseSettingsModal.jsx              262    446   58.7%
client/src/App.js                                           32     55   58.2%
client/src/api/users.js                                     21     38   55.3%
client/src/pages/CourseDetailPage.jsx                      446    904   49.3%
server/index.js                                             32     65   49.2%
client/src/pages/ForgotPasswordPage.jsx                     49    116   42.2%
client/src/components/CreateAppointmentModal.jsx            13     33   39.4%
server/routes/users.js                                      31     90   34.4%
client/src/pages/LoginPage.jsx                              49    166   29.5%
client/src/pages/RegisterPage.jsx                           73    296   24.7%
client/src/api/appointments.js                              35    168   20.8%
client/public/index.html                                     8     50   16.0%
client/src/index.css                                         5     33   15.2%
client/src/api/availabilities.js                             8     67   11.9%
client/src/components/dashboard/DashboardLayout.jsx         13    118   11.0%
server/routes/availabilities.js                             73   1086    6.7%
server/database/booking_schema.sql                          17    280    6.1%
server/routes/appointments.js                              105   2033    5.2%
README.md                                                    8    157    5.1%
client/src/pages/BookingProfessor.jsx                       23    453    5.1%
client/src/pages/ProfessorDashboard.jsx                     33    876    3.8%
client/src/components/CreateAvailabilityModal.jsx            2     54    3.7%
client/src/pages/BookingDiscovery.jsx                        6    172    3.5%
client/src/pages/landingPage.jsx                            11    320    3.4%
data-starter.sh                                              9    288    3.1%
server/routes/heatmaps.js                                   26    828    3.1%
client/src/components/Modals.jsx                            26    858    3.0%
client/src/api/heatmaps.js                                   3    109    2.8%
client/src/styles/Calendar.css                              15    542    2.8%
client/src/pages/StudentDashboard.jsx                       16    646    2.5%
client/src/utils/heatmapPageUtils.js                         4    158    2.5%
client/src/components/calendar/WeekView.jsx                  9    381    2.4%
client/src/components/Navbar.jsx                             2    140    1.4%
client/src/styles/Dashboard.css                             24   1974    1.2%
client/src/components/calendar/calendarUtils.jsx             3    314    1.0%
client/src/pages/ProfessorHeatmap.jsx                        8    963    0.8%
client/src/styles/LandingPage.css                            5    725    0.7%
client/src/pages/StudentHeatmap.jsx                          2    439    0.5%
```

---

## AI usage

In the early development phase, when our figma designs weren't done yet, I used generative AI for placeholder CSS and styling, though most of it has been replaced with manually written css since. Most noticeably in these files:

- `client/src/styles/CourseSettingsModal.css` -> 80%
- `client/src/styles/CoursesListPage.css` -> 75%
- `client/src/styles/CourseDetailPage.css` -> 75%
- `client/src/pages/LoginPage.jsx` -> 10%
- `client/src/pages/RegisterPage.jsx` -> 10%
- `client/src/pages/ResetPasswordPage.jsx` -> 10%

I also used AI to generate some helpers functions, utility files and hooks:

- `client/src/layouts/AppShellLayout.jsx` -> 100%
- `server/utils/dateTime.js` -> 100%
- `client/src/auth/authUi.js` -> 50%
- `client/src/hooks/useRequirePageVariant.js` -> 100%
- `client/src/hooks/useRequireAuth.js` -> 100%
- `client/src/auth/authUtils.js` -> 100%

For email notifications, I used AI in `server/lib/appointmentNotifications.js` to write some SQL queries so about 30% of the file.

I also used it to write comments in `server/routes/courses.js` as the file was getting big and I wanted to leave clear documentation on how to use each api route. 5% of the file.

In total, the percentage of my contributions being purely generated is around 20-25%. Any generated code's implementation and behaviour is designed by me first and I thoroughly review the code before being approved, sometimes having to modify the generated code to improve quality, correctness, and maintainability.

Other than that, I used Nodemailer as an SMTP/mail library (to connect and send emails), but didn't use any external template code for email services so the contribution of the library to our project is minimal.
