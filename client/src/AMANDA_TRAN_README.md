# Final Report: My Contributions to the LGTM / dropIn Scheduling Application

## Frontend Contributions

### 1. React Client Setup

I contributed to the initial React frontend setup of the application.

My work included:

- Creating the React client structure.
- Adding the initial React app files.
- Setting up `App.js`.
- Installing frontend dependencies.
- Adding React routing with `react-router-dom`.
- Organizing the frontend into folders such as pages, components, styles, assets, utils, and hooks.
- Setting up package and dependency files.

Relevant files I worked on included:

- `client/package.json`
- `client/package-lock.json`
- `client/src/App.js`
- `client/src/index.js`
- `client/src/App.css`
- `client/src/index.css`

### 2. Landing Page

I built and iterated on the main landing page for the application. This included the McGill/dropIn branding, the header image, the hero section, the "Find availabilities" flow, feature sections, the heatmap preview image, the accordion explanation, and the footer.

My work included:

- Creating the original landing page.
- Importing and organizing McGill/dropIn visual assets.
- Adding the header image.
- Adding logos.
- Building the hero section.
- Adding the "Find availabilities" call-to-action.
- Creating feature sections.
- Adding the heatmap preview section.
- Adding the "Learn more" accordion paragraph.
- Creating and adapting the footer based on McGill's website.
- Fixing footer logo alignment.
- Fixing landing page navbar behavior.
- Removing dead landing page code.
- Updating the page name and branding around dropIn/McGill Scheduling Hub.

Relevant files I worked on included:

- `client/src/pages/landingPage.jsx`
- `client/src/styles/LandingPage.css`
- `client/src/assets/header.png`
- `client/src/assets/logo1.png`
- `client/src/assets/logo2.png`
- `client/src/assets/LGTMLogo2.png`
- `client/src/assets/HeatmapPreview.png`

### 3. Navigation System

I worked on the reusable navigation system used across the application.
This included the navbar, sidebar, and related styling so that the landing page, dashboards, booking pages, and heatmap pages felt consistent.

Relevant files I worked on included:

- `client/src/components/Navbar.jsx`
- `client/src/components/Sidebar.jsx`
- `client/src/components/AppSidebar.jsx`
- `client/src/styles/Navbar.css`
- `client/src/styles/Sidebar.css`

### 4. Navbar

I worked on the shared navbar used across the app.

My work included:

- Creating and improving the navbar component.
- Adding logo support.
- Adding action buttons.
- Updating the navbar layout and styling.
- Fixing navbar CSS.
- Moving navbar styles into their own stylesheet.
- Using the navbar across landing, dashboard, booking, and heatmap pages.

Relevant files included:

- `client/src/components/Navbar.jsx`
- `client/src/styles/Navbar.css`

### 5. Sidebar

I worked on the dashboard/sidebar navigation.

My work included:

- Creating a sidebar component.
- Adding sidebar icons.
- Updating sidebar styling.
- Connecting sidebar navigation to dashboard, booking, and heatmap pages.
- Updating professor booking pages to use `AppSidebar`.

Relevant files included:

- `client/src/components/Sidebar.jsx`
- `client/src/components/AppSidebar.jsx`
- `client/src/styles/Sidebar.css`

### 6. Student Dashboard

I worked heavily on the student dashboard.

I built and improved the student dashboard in:

- `client/src/pages/StudentDashboard.jsx`
- `client/src/styles/Dashboard.css`

My work included:

- Creating the student dashboard page.
- Adding dashboard navigation.
- Showing student appointment information.
- Adding upcoming appointment logic.
- Connecting the dashboard to heatmap invitations.
- Displaying heatmap links only after a student opens the heatmap invite.
- Adding sidebar actions.
- Adding help/info modal access.
- Adding logout flow.
- Adding comments and readability improvements.
- Styling the student dashboard.

### 7. Professor Dashboard

I also worked heavily on the professor dashboard.

I built and improved the professor dashboard in:

- `client/src/pages/ProfessorDashboard.jsx`
- `client/src/styles/Dashboard.css`
- `client/src/components/dashboard/DashboardLayout.jsx`

My work included:

- Creating the professor dashboard.
- Adding navigation from the professor dashboard to heatmap creation.
- Showing professor-related scheduling tools.
- Showing hosted appointments.
- Showing availability blocks.
- Adding heatmap shortcuts.
- Adding upcoming appointments.
- Connecting the professor dashboard to heatmap management.
- Adding reusable dashboard layout elements.
- Adding sidebar tools.
- Adding help/info modal access.
- Adding logout flow.
- Styling and cleaning up the dashboard UI.

## Heatmap Scheduling Feature

### 8. Main Heatmap Feature

I created and expanded the main heatmap functionality, including professor availability selection, student availability submission, group heatmap results, heat intensity colors, and interactive selection behavior.

My work included:

- Creating the original heatmap page.
- Creating the heatmap grid.
- Allowing professors to select available slots.
- Allowing students to respond to professor availability.
- Showing student selections.
- Showing combined/group availability.
- Adding heatmap color gradients.
- Making availability intensity visually meaningful.
- Adding participant availability counts.
- Adding threshold-based visual feedback.
- Adding drag selection.
- Fixing scrolling issues.
- Improving multi-slot selection.
- Making professor participant labels vertical.
- Splitting the heatmap into separate professor and student pages.

Relevant files I worked on included:

- `client/src/pages/Heatmap.jsx`
- `client/src/pages/ProfessorHeatmap.jsx`
- `client/src/pages/StudentHeatmap.jsx`
- `client/src/components/HeatmapGrid.jsx`
- `client/src/styles/Heatmap.css`
- `client/src/hooks/useDragSelect.js`
- `client/src/utils/heatColor.js`
- `client/src/utils/heatmapPageUtils.js`
- `client/src/utils/generateDays.js`

### 9. Professor Heatmap Page

I worked on the professor-specific heatmap flow.

Relevant file:

- `client/src/pages/ProfessorHeatmap.jsx`

My work included:

- Creating a professor heatmap route/page.
- Letting professors create a heatmap.
- Letting professors define available slots.
- Supporting recurring slot expansion.
- Showing a group heatmap of student responses.
- Allowing professors to select final meeting slots.
- Supporting heatmap metadata such as title, description, and course association.
- Supporting heatmap edit/delete behavior.
- Connecting heatmap results to appointment creation.

### 10. Student Heatmap Page

I worked on the student-facing heatmap flow.

Relevant file:

- `client/src/pages/StudentHeatmap.jsx`

My work included:

- Creating the student heatmap route/page.
- Loading heatmap invite links.
- Showing professor availability to students.
- Letting students select only valid professor-provided slots.
- Saving student submissions.
- Showing heatmap intensity from other student responses.
- Registering student heatmap participation so it appears on their dashboard.
- Redirecting professor users away from student-only heatmap links.
- Adding role-aware behavior and route handling.

### 11. Heatmap Grid Components

I worked on the reusable heatmap grid component.

Relevant file:

- `client/src/components/HeatmapGrid.jsx`

My work included:

- Professor personal availability grid.
- Student-selectable professor availability grid.
- Group heatmap grid.
- Tooltips for selected/available slots.
- Heat intensity colors.
- Grid pagination.
- Heatmap legend.
- Date-specific slot keys.
- Participant availability counts.
- Paging and legend behavior.

### 12. Heatmap Utility Logic

I worked on utility/helper code for the heatmap logic.

Relevant files included:

- `client/src/utils/heatColor.js`
- `client/src/utils/heatmapPageUtils.js`
- `client/src/utils/generateDays.js`
- `client/src/hooks/useDragSelect.js`

My work included:

- Converting selected grid cells into real date/time slots.
- Generating days and time labels.
- Comparing dates.
- Expanding recurring availability.
- Mapping saved backend submissions back into grid cells.
- Computing heatmap color intensity.
- Supporting date/time grid generation.
- Supporting drag selection through a shared hook.

### 13. Drag Selection

I worked on the drag-select behavior used by the heatmap cells.

Relevant file:

- `client/src/hooks/useDragSelect.js`

My work included:

- Click-and-drag selection.
- Mouse enter behavior while dragging.
- Shared hook behavior for grid selection.

### 14. Reusable Booking Calendar

I added and improved a reusable booking calendar component and styling.

Relevant files included:

- `client/src/components/BookingCalendar.jsx`
- `client/src/styles/BookingCalendar.css`

My work included:

- Creating `BookingCalendar.jsx`.
- Adding `BookingCalendar.css`.
- Creating reusable calendar-style booking visuals.
- Improving how booking and heatmap management appeared in the UI.
- Connecting calendar-style booking visuals with dashboard and booking pages.

### 15. Booking Page Integration

I updated booking-related pages so they fit the shared application layout.

Relevant files included:

- `client/src/pages/BookingProfessor.jsx`
- `client/src/pages/BookingDiscovery.jsx`
- `client/src/components/AppSidebar.jsx`

My work included:

- Updating the professor booking page.
- Updating the booking discovery page.
- Integrating sidebar/app shell behavior.
- Removing dead user API-related code.
- Making booking pages visually consistent with the rest of the app.

### 16. Help Popup / Help Guide System

I added and expanded the help/info guide functionality.

Relevant file:

- `client/src/data/helpGuides.js`

My work included:

- Creating or expanding help guide data.
- Adding help popup behavior.
- Connecting info buttons to dashboard pages.
- Connecting info buttons to heatmap pages.
- Improving user guidance through help/info modals.

### 17. Modals

I worked on shared modal components.

Relevant file:

- `client/src/components/Modals.jsx`

My work included:

- Adding heatmap-related modals.
- Adding invite URL modal behavior.
- Adding slot detail modal behavior.
- Adding confirm/action modals.
- Updating modals used by dashboards.
- Updating modals used by heatmaps.

### 18. Styling and UI Consistency

I made many UI polish and styling changes across the app.

Relevant files included:

- `client/src/styles/Heatmap.css`
- `client/src/styles/LandingPage.css`
- `client/src/styles/Dashboard.css`
- `client/src/styles/Navbar.css`
- `client/src/styles/Sidebar.css`
- `client/src/styles/Calendar.css`
- `client/src/styles/BookingCalendar.css`

My work included:

- Dashboard styling.
- Heatmap styling.
- Landing page styling.
- Navbar styling.
- Sidebar styling.
- Calendar font/style consistency.
- Fixing inconsistent font family.
- Improving button consistency.
- Improving layout consistency.
- Updating sidebar icons.
- Fixing heatmap scroll behavior.
- Making professor labels vertical.
- Adding McGill red accents.
- Cleaning up dead CSS/code.
- General UI cleanup and polish.

### 19. Frontend API Helpers

I worked on frontend API helper files for heatmaps, users, and courses.

Relevant files included:

- `client/src/api/heatmaps.js`
- `client/src/api/users.js`
- `client/src/api/courses.js`

My work included:

- Creating heatmap API functions.
- Creating user API functions.
- Connecting frontend pages to backend routes.
- Adding heatmap invitation calls.
- Adding heatmap submission calls.
- Supporting course-related heatmap behavior.

## Backend Contributions

### 20. Heatmap Backend Routes / Heatmap API

I added and expanded the backend routes for heatmaps.

Relevant file:

- `server/routes/heatmaps.js`

My work included:

- Creating heatmaps.
- Listing heatmaps.
- Fetching one heatmap.
- Saving professor submissions.
- Saving student submissions.
- Supporting submitted time slots.
- Updating heatmap details.
- Updating submission status.
- Registering invitations.
- Deleting heatmaps.
- Creating appointments from heatmap selections.
- Supporting student invite/dashboard behavior.
- Supporting submitted time slots, participant roles, status handling, and appointment creation from selected group heatmap slots.

### 21. User Backend Routes / Users API

I added user routes for the backend.

Relevant file:

- `server/routes/users.js`

My work included:

- Listing users.
- Listing professors.
- Fetching users by ID.
- Supporting frontend user lookup needs.
- Filtering users by type.
- Searching users by name/email.

### 22. Server Route Registration

I updated the Express server to mount new backend routes.

Relevant file:

- `server/index.js`

My work included:

- Mounting heatmap routes.
- Mounting user routes.
- Mounting auth/API routes.
- Adjusting server/API setup.
- Updating server configuration for demo/auth behavior.

### 23. Appointment Route Integration

I touched appointment-related backend code while integrating heatmap and user route behavior.

Relevant file:

- `server/routes/appointments.js`

My work included:

- Connecting heatmap scheduling to appointment workflows.
- Supporting data needed by dashboards.
- Supporting data needed by heatmap appointment creation.
- Modifying appointment-related backend behavior so heatmaps, dashboards, bookings, and user appointments could work together.

### 24. Course ID / Heatmap-Course Connection

I worked on connecting heatmaps to courses.

Relevant files included:

- `server/routes/heatmaps.js`
- `client/src/pages/ProfessorHeatmap.jsx`
- `client/src/api/heatmaps.js`
- `client/src/api/courses.js`

My work included:

- Adding `course_id`-related behavior.
- Updating heatmap routes.
- Updating frontend heatmap pages.
- Ensuring heatmaps could be tied to a course context.
- Supporting course-linked heatmaps.

### 25. Heatmap Database Behavior

I added backend logic related to how heatmaps store and use data.

My work included:

- Heatmap submissions.
- Submitted time slots.
- Participant roles.
- Status handling.
- Course-linked heatmaps.
- Appointment creation from selected group heatmap slots.

### 27. Cancelled Appointment Dismiss Flow

I also worked on the cancelled-appointment dismiss flow.

This improved how cancelled appointments are displayed and managed by both students and professors. Instead of cancelled appointments disappearing immediately, they now remain visible with a clear Cancelled status, and each user can dismiss the cancelled appointment from their own dashboard.

My work included:

- Keeping cancelled appointments visible as Cancelled instead of making them disappear immediately.
- Allowing students and professors to dismiss cancelled appointments from their own dashboards.
- Making dismissal per-user, so one user dismissing an appointment does not remove it for the other user.
- Making the dismissal persist after refresh.
- Adding backend dismissal tracking through a new table.
- Adding a cancellation dismissal endpoint.
- Updating the dashboard right-panel button from Delete to Dismiss.
- Fixing the Dismiss button sizing and style.
- Improving the cancellation modal copy.
- Improving the cancelled appointment behavior across student and professor dashboards.

This contribution improved the user experience because cancelled appointments In short, I contributed heavily to the landing page, navigation/dashboard UI, student/professor heatmap system, heatmap frontend utilities/components, Appointment Cancellation behaviour and Dashboard block dismissal (cleanup for better view), and the backend heatmap that made the feature work end to end.

## Summary of AI/Template/Bootstrap Usage in My Personnel Code

- `client/src/api/heatmaps.js` — ChatGPT 10%, mainly comments/API explanation
- `client/src/components/BookingCalendar.jsx` — Inspired by Bootstrap/Colorlib calendar template
- `client/src/pages/BookingDiscovery.jsx` & `BookingProfessor` — Uses Bootstrap-style booking calendar UI reference from `BookingCalendar.jsx`
- `client/src/components/HeatmapGrid.jsx` — ChatGPT 10%, grid key/string-to-cell logic help
- `client/src/components/Modals.jsx` — ChatGPT 7% for my part; uses MUI components/icons
- `client/src/pages/StudentHeatmap.jsx` — ChatGPT 7%, final refactor / UX logic check
- `client/src/pages/landingPage.jsx` — McGill footer template adapted
- `client/src/styles/BookingCalendar.css` — Bootstrap/Colorlib calendar layout reference
- `client/src/styles/Dashboard.css` — Shared with Jocelyne Li
- `client/src/styles/Heatmap.css` — ChatGPT 15%, heatmap grid styling help
- `client/src/styles/LandingPage.css` — McGill-inspired layout
- `client/src/utils/generateDays.js` — ChatGPT 80%, date/time label helper logic
- `client/src/utils/heatmapPageUtils.js` — ChatGPT 5%, recurring event expansion logic
- `server/routes/heatmaps.js` — ChatGPT used to understand grid-to-backend datetime translation

I also used Cortex to help me extract my contribution percentages -> it analyzed my git log and the changes that I made throughout the application conception. I used Cortex once to commit a change that involved several diverging branches because I did not want to affect my peers work on our main branch.

## Entire Contribution List

- `client/src/App.js` — 41%
- `client/src/App.css` — 100%
- `client/src/index.js` — 100%
- `client/src/index.css` — 42%
- `client/src/api/heatmaps.js` — 90%
- `client/src/api/users.js` — 49%
- `client/src/components/AppSidebar.jsx` — 3%
- `client/src/components/BookingCalendar.jsx` — 100%
- `client/src/components/HeatmapGrid.jsx` — 90%
- `client/src/components/Modals.jsx` — 30%
- `client/src/components/Navbar.jsx` — 99%
- `client/src/components/Sidebar.jsx` — 84%
- `client/src/components/dashboard/DashboardLayout.jsx` — 100%
- `client/src/data/helpGuides.js` — 100%
- `client/src/hooks/useDragSelect.js` — 100%
- `client/src/pages/BookingDiscovery.jsx` — 9%
- `client/src/pages/BookingProfessor.jsx` — 34%
- `client/src/pages/ProfessorDashboard.jsx` — 40%
- `client/src/pages/ProfessorHeatmap.jsx` — 89%
- `client/src/pages/StudentDashboard.jsx` — 40%
- `client/src/pages/StudentHeatmap.jsx` — 93%
- `client/src/pages/landingPage.jsx` — 95%
- `client/src/styles/BookingCalendar.css` — 99%
- `client/src/styles/Dashboard.css` — 43%
- `client/src/styles/Heatmap.css` — 85%
- `client/src/styles/LandingPage.css` — 90%
- `client/src/styles/Navbar.css` — 83%
- `client/src/styles/Sidebar.css` — 70%
- `client/src/utils/generateDays.js` — 20%
- `client/src/utils/heatColor.js` — 100%
- `client/src/utils/heatmapPageUtils.js` — 95%
- `server/routes/heatmaps.js` — 93%
- `server/routes/users.js` — 62%
