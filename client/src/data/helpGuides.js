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

export const PAGE_HELP_GUIDES = {
  professorHeatmap: {
    eyebrow: 'Professor heatmap guide',
    title: 'How to use this heatmap',
    intro:
      'Use this page to create a heatmap appointment, publish your available times, review student responses, and confirm the final meeting slots.',
    quickTips: [
      'Create the heatmap with a title, optional course code, and description before choosing times.',
      'Use Apply to set the visible date range and hours for the grid.',
      'Share the invite link after saving your availability.',
      'Use Availability heatmap to choose final slots after students respond.',
    ],
    sections: [
      {
        title: '1. Create or edit details',
        steps: [
          'On a new heatmap, enter the Heatmap appointment title.',
          'Choose an optional Course code if the heatmap belongs to one of your courses.',
          'Add a Description explaining what students are responding to.',
          'Click Create heatmap to move to the availability grid.',
          'On an existing heatmap, use Edit details to update the title, course, or description.',
          'Use Delete heatmap only when you want to remove the heatmap and its responses.',
        ],
      },
      {
        title: '2. Publish your availability',
        steps: [
          'Use Start date, End date, From, and To to choose what appears on the grid.',
          'Click Apply to lock in the date range and hours.',
          'Use Change if you need to adjust the visible range later.',
          'Open My availability and click or drag over cells when you are free.',
          'Choose One-time only if the selected slots only apply to this range.',
          'Choose Recurring and the number of weeks if those same slots repeat weekly.',
          'Click Save for this week, or Save & repeat for the selected number of weeks.',
          'Use Clear all to reset your selected availability before saving.',
          'Click Share invite link to send students the heatmap URL.',
        ],
      },
      {
        title: '3. Confirm group slots',
        steps: [
          'Open Availability heatmap after students submit availability.',
          'Use the respondent chips to include or exclude specific students from the heatmap.',
          'Darker cells mean more selected respondents are free at that time.',
          'Hover a cell to see who is free.',
          'Click or drag over one or more cells to select booking slots.',
          'Use Clear selected if you picked the wrong group slots.',
          'Click Confirm selected slot or Confirm selected slots to create the appointment.',
        ],
      },
    ],
  },

  studentHeatmap: {
    eyebrow: 'Student heatmap guide',
    title: 'How to book a slot',
    intro:
      'Use this page to choose times that work for you from the professor\'s published availability.',
    quickTips: [
      'Pink cells are times the professor has made available.',
      'Only professor-available cells can be selected.',
      'Use Apply or Change to control which dates and hours are visible.',
      'Click Submit availability when your selection is ready.',
    ],
    sections: [
      {
        title: '1. Set the grid view',
        steps: [
          'Read the page title and subtitle to confirm which professor the heatmap is for.',
          'Use Start date, End date, From, and To to choose the grid range.',
          'Click Apply to show that range.',
          'Use Change if you need to adjust the visible range later.',
          'Use the date arrows above the grid to move through longer heatmap ranges.',
        ],
      },
      {
        title: '2. Select your slots',
        steps: [
          'Look for professor-available cells in the grid.',
          'Click or drag over the cells that work for you.',
          'If other students have already responded, darker cells mean more of them are also free.',
          'Check the selected slot count before submitting.',
          'Use Clear if you want to remove your current selection.',
          'Click Submit availability when you are done.',
        ],
      },
      {
        title: '3. After submitting',
        steps: [
          'Your response is sent to the professor for review.',
          'The professor compares everyone\'s availability and chooses the final meeting slot.',
          'Confirmed appointments appear on your dashboard calendar.',
        ],
      },
    ],
  },

  bookingSearch: {
    eyebrow: 'Search guide',
    title: 'How to find a professor',
    intro:
      'Use this page to search for professors, view their availability, and open the booking calendar.',
    quickTips: [
      'Search by professor name, department, staff title, or email.',
      'You will not see your own profile in the search results.',
      'Click View availability to open a professor\'s booking page.',
    ],
    sections: [
      {
        title: '1. Search the list',
        steps: [
          'Type in the search box to narrow the professor list.',
          'Use a name, department, staff title, or email address as your search term.',
          'Clear the search box to see the full list again.',
        ],
      },
      {
        title: '2. Open availability',
        steps: [
          'Find the professor you want to meet with.',
          'Click View availability on their card.',
          'The booking page opens with that professor selected.',
          'Choose a highlighted date on the calendar.',
          'Select one available time slot.',
          'Confirm the booking so it appears on your dashboard.',
        ],
      },
    ],
  },

  bookingProfessor: {
    eyebrow: 'Booking page guide',
    title: 'How to book an available slot',
    intro:
      'Use this page to review one professor\'s public availability, choose a time, and confirm the booking.',
    quickTips: [
      'Highlighted calendar dates have available slots.',
      'Select a time to preview it in the Selected slot panel.',
      'Use Contact if you need to email the professor before booking.',
      'Use Copy booking link to share this professor\'s booking page.',
    ],
    sections: [
      {
        title: '1. Pick a date',
        steps: [
          'Review the professor name, department, title, and email at the top of the page.',
          'Use the calendar arrows to move between months.',
          'Click a highlighted date to see available times for that day.',
          'If a date has no available times, choose another highlighted date.',
        ],
      },
      {
        title: '2. Choose a time',
        steps: [
          'Select an Open slot from the available times list.',
          'Full slots cannot be selected.',
          'Check the Selected slot panel for the title, date, time, location, capacity, and booked count.',
          'Click Confirm booking when the selected slot is correct.',
        ],
      },
      {
        title: '3. After booking',
        steps: [
          'A success message appears after the booking is saved.',
          'The appointment should appear on your dashboard calendar.',
          'Use Back to dashboard to return to your calendar.',
        ],
      },
    ],
  },

  courses: {
    eyebrow: 'Courses guide',
    title: 'How to use courses',
    intro:
      'Use this page to view your active courses, review archived courses, and create courses if you have professor access.',
    quickTips: [
      'Use semester chips to filter active and archived courses.',
      'Active courses appear above Archived courses.',
      'Click a course card to open its detail page.',
      'Professors can create courses with + Add course.',
    ],
    sections: [
      {
        title: '1. Browse courses',
        steps: [
          'Active courses appear first on the page.',
          'Archived courses are grouped separately below active courses.',
          'Click a semester chip to filter both active and archived lists.',
          'Click the selected chip again to clear the filter.',
        ],
      },
      {
        title: '2. Open course details',
        steps: [
          'Click any course card to open its detail page.',
          'Use the term pill to quickly check the course semester.',
          'Use the role pill to see whether you are Owner, Staff, Student, or viewing an Archived course.',
          'Use the detail page to review course information and course scheduling tools.',
          'Return to Courses from the sidebar when you want to switch courses.',
        ],
      },
      {
        title: '3. Create a course',
        steps: [
          'If you have professor access, click + Add course at the top of the course list.',
          'Enter the course information in the Create course popup.',
          'Save the course so it appears in your active course list.',
        ],
      },
    ],
  },
};
