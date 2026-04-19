/* AMANDA TRAN */
/* Page-specific help content shown when the user clicks the info icon. */

export const DASHBOARD_HELP_GUIDES = {
  student: {
    eyebrow: 'Student dashboard guide',
    title: 'How to use your dashboard',
    intro:
      'This dashboard is your home base for finding professors, managing bookings, and responding to heatmap invitations.',
    quickTips: [
      'Use the calendar to see your confirmed and pending appointments by week.',
      'Use Search when you want to find a professor and book one of their open slots.',
      'Use the right panel for quick access to upcoming appointments and heatmap invitations.',
    ],
    sections: [
      {
        title: '1. Read your calendar',
        steps: [
          'Start in the main calendar area. Each coloured block represents an appointment or booking-related event.',
          'Look at the date columns and time rows to understand when each appointment happens.',
          'Click any appointment block to open the details pop-up.',
          'In the details pop-up, review the date, time, owner, location, and status.',
          'Use the email button if you need to contact the appointment owner.',
          'If you need to cancel, use the cancel option in the details flow and confirm the action carefully.',
        ],
      },
      {
        title: '2. Book with a professor',
        steps: [
          'Click the search icon in the left sidebar.',
          'Use the search page to look for a professor by name, department, or email.',
          'Click View availability on the professor you want to book with.',
          'Choose one of the professor’s available time slots.',
          'Review the selected slot details on the booking page.',
          'Click Confirm booking to create the appointment.',
          'Return to the dashboard and check that the appointment appears on your calendar or upcoming list.',
        ],
      },
      {
        title: '3. Use the right panel',
        steps: [
          'Upcoming appointments shows the next appointments you should pay attention to.',
          'Past appointments keeps a record of appointments that already happened.',
          'Heatmap invitations shows professor-created availability polls that need your response.',
          'Click the plus button on an open heatmap invitation to submit your availability.',
          'Click the arrow button on a heatmap you already answered to view it again.',
          'Use Hide panel in the navbar if you want more room for the calendar.',
        ],
      },
      {
        title: '4. Respond to a heatmap invitation',
        steps: [
          'Open the heatmap invitation from the right panel.',
          'Read the professor’s available time range.',
          'Click the time cells that work for you.',
          'Use Clear if you want to reset your selections.',
          'Click Submit availability when you are done.',
          'Wait for the professor to approve or decline a submitted slot.',
        ],
      },
    ],
  },
  professor: {
    eyebrow: 'Professor dashboard guide',
    title: 'How to use your dashboard',
    intro:
      'This dashboard helps you publish availability, manage bookings, create heatmaps, and review student responses.',
    quickTips: [
      'Use the calendar to see booked appointments and open availability slots together.',
      'Use the create availability icon to publish new bookable time slots.',
      'Use heatmaps when you want students to vote on times before you confirm a booking.',
    ],
    sections: [
      {
        title: '1. Read your calendar',
        steps: [
          'The main calendar shows both confirmed appointments and still-open availability slots.',
          'Open availability represents time students may still be able to book.',
          'Booked appointments represent meetings that already have an attendee.',
          'Click any calendar block to open its details.',
          'Review the date, time, student, location, and status in the details pop-up.',
          'Use the cancel option only when you are sure you want to remove the slot or booking.',
        ],
      },
      {
        title: '2. Create availability',
        steps: [
          'Click the create availability icon in the left sidebar.',
          'Choose the date and time range you want to make available.',
          'Set the slot duration, location, capacity, title, and description if the form asks for them.',
          'Choose whether the availability is public or private.',
          'Submit the form to create one or more bookable slots.',
          'Check the calendar after saving. New open slots should appear in the week view.',
        ],
      },
      {
        title: '3. Manage appointments',
        steps: [
          'Use Upcoming appointments in the right panel to quickly see what is coming next.',
          'Use Past appointments to review older bookings.',
          'Click a card in the right panel to open the same detail pop-up as the calendar.',
          'Use status badges to understand whether an appointment is confirmed, pending, waiting, or cancelled.',
          'Use Hide panel in the navbar when you want more space for the calendar.',
        ],
      },
      {
        title: '4. Create and use heatmaps',
        steps: [
          'Click + New heatmap in the top navbar or + Create new heatmap in the right panel.',
          'On the heatmap page, mark the times you are available.',
          'Choose one-time or recurring availability before saving.',
          'Click Share invite link and send that link to students.',
          'When students submit responses, open Student submissions to review them.',
          'Approve one submitted slot to create a real appointment, or decline if it does not work.',
          'Use Availability heatmap to compare all student responses at once and confirm a group slot.',
        ],
      },
    ],
  },
};
