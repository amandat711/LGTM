/* AMANDA TRAN */
/* Page-specific help content shown when the user clicks the info icon. */

export const DASHBOARD_HELP_GUIDES = {
  student: {
    eyebrow: 'Student dashboard guide',
    title: 'How to use your dashboard',
    intro:
      'Use this page to see your appointments, book time with professors, and answer heatmap invitations.',
    quickTips: [
      'Your calendar shows appointments by day and time.',
      'Use Search to find a professor and book an available time.',
      'Check the right panel for upcoming appointments and heatmap invitations.',
    ],
    sections: [
      {
        title: '1. Check your calendar',
        steps: [
          'Look at the main calendar to see your scheduled appointments.',
          'Each block shows when an appointment happens.',
          'Click an appointment block to open its details.',
          'Use the details popup to check the time, location, professor, and status.',
          'If you need to contact the professor, use the email button.',
          'Only cancel an appointment if you are sure. You will be asked to confirm first.',
        ],
      },
      {
        title: '2. Book with a professor',
        steps: [
          'Click Search in the left sidebar.',
          'Search by professor name, department, or email.',
          'Click View availability for the professor you want.',
          'Pick a highlighted date on the calendar.',
          'Choose one of the available times for that date.',
          'Review the selected slot on the right.',
          'Click Confirm booking.',
          'After booking, the appointment should appear on your dashboard.',
        ],
      },
      {
        title: '3. Use the right panel',
        steps: [
          'Upcoming appointments shows meetings that are coming soon.',
          'Past appointments shows meetings that already happened.',
          'Heatmap invitations shows polls from professors asking when you are free.',
          'Click the plus button on a heatmap invitation to answer it.',
          'Click the arrow button to reopen a heatmap you already answered.',
          'Use Hide panel if you want more space for the calendar.',
        ],
      },
      {
        title: '4. Respond to a heatmap invitation',
        steps: [
          'Open the invitation from the right panel.',
          'Read the title and description so you know what the meeting is for.',
          'Use the arrows above the grid to move through the available dates.',
          'Click or drag over the time cells that work for you.',
          'Use Clear if you want to start over.',
          'Click Submit availability when you are finished.',
          'The professor will use everyone\'s responses to choose a meeting time.',
        ],
      },
    ],
  },
  professor: {
    eyebrow: 'Professor dashboard guide',
    title: 'How to use your dashboard',
    intro:
      'Use this page to create availability, manage bookings, and collect student availability with heatmaps.',
    quickTips: [
      'Your calendar shows booked appointments and open availability slots.',
      'Use Create availability to publish times students can book.',
      'Use heatmaps when you need several students to share when they are free.',
    ],
    sections: [
      {
        title: '1. Check your calendar',
        steps: [
          'Look at the main calendar to see your schedule for the week.',
          'Open availability blocks are times students can still book.',
          'Appointment blocks are meetings that have already been booked.',
          'Click any block to open its details.',
          'Use the details popup to check the date, time, student, location, and status.',
          'Only delete or cancel a slot if you are sure. You will be asked to confirm first.',
        ],
      },
      {
        title: '2. Create availability',
        steps: [
          'Click Create availability in the left sidebar.',
          'Enter a title and optional description.',
          'Choose the date, start time, and end time.',
          'Choose the slot duration. The time range must split evenly into that duration.',
          'Add a location and capacity.',
          'Choose Public if students should be able to find and book it.',
          'Click Create slot.',
          'New open slots should appear on your calendar.',
        ],
      },
      {
        title: '3. Manage appointments',
        steps: [
          'Use Upcoming appointments to see what is coming next.',
          'Use Past appointments to review older meetings.',
          'Click a card in the right panel to open its details.',
          'Check the status badge to see whether a meeting is confirmed, pending, waiting, or cancelled.',
          'Use Hide panel if you want more space for the calendar.',
        ],
      },
      {
        title: '4. Create and use heatmaps',
        steps: [
          'Click + New heatmap from the dashboard.',
          'Add a clear title and description so students know what the meeting is for.',
          'Choose the date range and hours you want students to consider.',
          'Mark the times you are available.',
          'Choose one-time or recurring availability.',
          'Save your availability, then share the invite link with students.',
          'After students respond, open Availability heatmap.',
          'Use the heatmap colors to find times when students are free.',
          'Click or drag to select one or more good time slots.',
          'Click Confirm selected slots to create the booking.',
        ],
      },
    ],
  },
};
