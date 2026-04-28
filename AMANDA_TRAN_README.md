# Final Report: My Contributions to the LGTM / dropIn Scheduling Application

## Frontend Contributions

### 1. React Client Setup

My work included:

- Creating the React client structure.
- Adding the initial React app files.
- Setting up `App.js`.
- Installing frontend dependencies.
- Adding React routing with `react-router-dom`.
- Organizing the frontend into folders such as pages, components, styles, assets, utils, and hooks.
- Setting up package and dependency files.

### 2. Landing Page
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


### 3. Navigation System

I worked on the reusable navigation system used across the application.
This included the navbar, sidebar, and related styling so that the landing page, dashboards, booking pages, and heatmap pages felt consistent.

Relevant files I worked on included:


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



### 5. Sidebar

I worked on the dashboard/sidebar navigation.

My work included:

- Creating a sidebar component.
- Adding sidebar icons.
- Updating sidebar styling.
- Connecting sidebar navigation to dashboard, booking, and heatmap pages.
- Updating professor booking pages to use `AppSidebar`.


### 6. Student Dashboard


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


### 9. Professor Heatmap Page

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


My work included:

- Click-and-drag selection.
- Mouse enter behavior while dragging.
- Shared hook behavior for grid selection.

### 14. Reusable Booking Calendar


My work included:

- Creating `BookingCalendar.jsx`.
- Adding `BookingCalendar.css`.
- Creating reusable calendar-style booking visuals.
- Improving how booking and heatmap management appeared in the UI.
- Connecting calendar-style booking visuals with dashboard and booking pages.

### 15. Booking Page Integration


My work included:

- Updating the professor booking page.
- Updating the booking discovery page.
- Integrating sidebar/app shell behavior.
- Removing dead user API-related code.
- Making booking pages visually consistent with the rest of the app.

### 16. Help Popup / Help Guide System

My work included:

- Creating or expanding help guide data.
- Adding help popup behavior.
- Connecting info buttons to dashboard pages.
- Connecting info buttons to heatmap pages.
- Improving user guidance through help/info modals.

### 17. Modals


My work included:

- Adding heatmap-related modals.
- Adding invite URL modal behavior.
- Adding slot detail modal behavior.
- Adding confirm/action modals.
- Updating modals used by dashboards.
- Updating modals used by heatmaps.

### 18. Styling and UI Consistency


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

My work included:

- Creating heatmap API functions.
- Creating user API functions.
- Connecting frontend pages to backend routes.
- Adding heatmap invitation calls.
- Adding heatmap submission calls.
- Supporting course-related heatmap behavior.

## Backend Contributions

### 20. Heatmap Backend Routes / Heatmap API


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

My work included:

- Listing users.
- Listing professors.
- Fetching users by ID.
- Supporting frontend user lookup needs.
- Filtering users by type.
- Searching users by name/email.

### 22. Server Route Registration


My work included:

- Mounting heatmap routes.
- Mounting user routes.
- Mounting auth/API routes.
- Adjusting server/API setup.
- Updating server configuration for demo/auth behavior.

### 23. Appointment Route Integration


My work included:

- Connecting heatmap scheduling to appointment workflows.
- Supporting data needed by dashboards.
- Supporting data needed by heatmap appointment creation.
- Modifying appointment-related backend behavior so heatmaps, dashboards, bookings, and user appointments could work together.

### 24. Course ID / Heatmap-Course Connection

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



IF ANY of THE PERCENTAGES NEXT TO AMANDA TRAN COMMENTS ARE DIFFERENT FROM THE ONES BELLOW. IT'S BECAUSE ANOTHER TEAMATE HAS OVERWRITTEN MY CHANGES ( I MIGHT HAVE CREATED THE FILE AND WORKED ON IT FIRST BUT THE MIGHT WAS MODIFIED BY MY TEAMATE) - I WILL PROVIDE YOU (IF YOU TRULY NEED IT VIA EMAIL) WITH A CHART THAT DETAILED THE # OF MODIFICATIONS AND COMMITS MADE FOR EACH PERSON IF THERE IS ANY DOUBT IN MY CONTRIBUTIONS. THE CHART SHOWS THE NUMBER OF COMMITS AND MODIFICATIONS DONE BY EACH TEAMATE AS OF APRIL 25TH (AFTER OUR FIRST DEMO).

## Summary of AI/Template/Bootstrap Usage in My Personnel Code

- `client/src/api/heatmaps.js` — ChatGPT 10%, understand how translates between the visual heatmap grid and the real date/time data saved in the backend. 
- `client/src/components/BookingCalendar.jsx` — Inspired by Bootstrap/Colorlib calendar template
- `client/src/pages/BookingDiscovery.jsx` & `BookingProfessor` — Uses Bootstrap-style booking calendar UI reference from `BookingCalendar.jsx`
This calendar page was reference from the Bootstrap calendar example at <Colorlib>
Colorlib. (2025). Calendar V04. Colorlib. https://colorlib.com/wp/template/calendar-04/</Colorlib>
- `client/src/components/HeatmapGrid.jsx` — ChatGPT 10%, grid key/string-to-cell logic - How to understnad it.
- `client/src/pages/StudentHeatmap.jsx` — ChatGPT 10%, First-time setup controls for choosing the visible week and hours. (This is an actual section of the code that I completely generated)
- `client/src/pages/landingPage.jsx` — McGill footer template adapted
- `client/src/styles/Heatmap.css` — ChatGPT 15%, heatmap grid styling help
- `client/src/styles/LandingPage.css` — McGill-inspired layout
- `client/src/utils/generateDays.js` — ChatGPT 80%, date/time label helper logic
- `client/src/utils/heatmapPageUtils.js` — ChatGPT 5%, recurring event expansion logic "
// ChatGPT : Repeats the professor's selected availability into future weeks.".(This is an actual serction of the code that I completely generate )
- `server/routes/heatmaps.js` — ChatGPT used to understand grid-to-backend datetime translation

I also used Codex to help me extract my contribution percentages -> it analyzed my git log and the changes that I made throughout the application conception. 

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
- `client/src/pages/StudentHeatmap.jsx` — 90%
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
