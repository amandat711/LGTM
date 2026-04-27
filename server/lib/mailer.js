// SHIRLEY DING
const nodemailer = require('nodemailer');
const { MAIL_FROM, FRONTEND_URL } = require('../constants/config');

let mailTransportPromise = null;

function createMailTransport() {
  const hasGmailConfig = Boolean(process.env.SMTP_USER && process.env.GOOGLE_APP_PASSWORD);

  if (!hasGmailConfig) {
    console.warn(
      '[mailer] Gmail env vars missing; using Nodemailer jsonTransport. Emails will only log locally.'
    );
    return Promise.resolve(nodemailer.createTransport({ jsonTransport: true }));
  }

  return Promise.resolve(
    nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    })
  );
}

async function getMailTransport() {
  if (!mailTransportPromise) {
    mailTransportPromise = createMailTransport();
  }
  return mailTransportPromise;
}

async function sendEmail({ to, subject, text, html, from = MAIL_FROM }) {
  const transporter = await getMailTransport();
  const info = await transporter.sendMail({ from, to, subject, text, html });

  if (info.message) {
    console.log('[mailer] email payload:', info.message.toString());
  }
  return info;
}

async function sendForgotPasswordEmail({ to, resetLink }) {
  return sendEmail({
    to,
    subject: 'Reset your LGTM password',
    text: `You requested a password reset.\n\nUse this link to reset your password (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <p>You requested a password reset.</p>
      <p>
        Use this link to reset your password (valid for 1 hour):
        <a href="${resetLink}">${resetLink}</a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

async function sendPasswordChangedEmail({ to }) {
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/login`;

  return sendEmail({
    to,
    subject: 'Your LGTM password was changed',
    text: `Your LGTM password was changed successfully.\n\nIf this was you, no action is needed.\n\nIf you did not make this change, reset your password immediately:\n${dashboardLink}`,
    html: `
      <p>Your LGTM password was changed successfully.</p>
      <p>If this was you, no action is needed.</p>
      <p>
        If you did not make this change, reset your password immediately:
        <a href="${dashboardLink}">${dashboardLink}</a>
      </p>
    `,
  });
}

function formatEmailValue(value, fallback = 'TBD') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

async function sendAppointmentUpdatedByOwnerEmail({
  to,
  appointmentTitle,
  startTime,
  endTime,
  location,
  hostName,
  note,
}) {
  const title = formatEmailValue(appointmentTitle, 'Appointment');
  const start = formatEmailValue(startTime);
  const end = formatEmailValue(endTime);
  const where = formatEmailValue(location, 'Not specified');
  const owner = formatEmailValue(hostName, 'The event owner');
  const changeNote = formatEmailValue(note, 'No additional notes provided.');

  return sendEmail({
    to,
    subject: `LGTM update: "${title}" was modified`,
    text: `${owner} updated an upcoming appointment.\n\nTitle: ${title}\nStart: ${start}\nEnd: ${end}\nLocation: ${where}\n\nOwner note: ${changeNote}`,
    html: `
      <p>${owner} updated an upcoming appointment.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Location:</strong> ${where}</p>
      <p><strong>Owner note:</strong> ${changeNote}</p>
    `,
  });
}

async function sendStudentEventResponseToHostEmail({
  to,
  studentName,
  response,
  appointmentTitle,
  startTime,
  sessionCount = 1,
}) {
  const title = formatEmailValue(appointmentTitle);
  const when = formatEmailValue(startTime);
  const who = formatEmailValue(studentName, 'A student');
  const verb = response === 'accepted' ? 'accepted' : 'declined';
  const sessionsNote =
    sessionCount > 1
      ? ` This applies to ${sessionCount} sessions in the series (the first is shown below).`
      : '';
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/`;

  return sendEmail({
    to,
    subject: `LGTM: ${who} has ${verb} "${title}"`,
    text: `${who} has ${verb} the event "${title}".${sessionsNote}\n\nStart: ${when}\n\nView your dashboard: ${dashboardLink}`,
    html: `
      <p>${who} has ${verb} the event <strong>${title}</strong>.</p>
      ${sessionCount > 1 ? `<p>This applies to <strong>${sessionCount}</strong> sessions in the series (the first is shown below).</p>` : ''}
      <p><strong>Start:</strong> ${when}</p>
      <p><a href="${dashboardLink}">Open your dashboard</a></p>
    `,
  });
}

async function sendAppointmentCancelledByOwnerEmail({
  to,
  appointmentTitle,
  startTime,
  endTime,
  location,
  hostName,
  note,
}) {
  const title = formatEmailValue(appointmentTitle, 'Appointment');
  const start = formatEmailValue(startTime);
  const end = formatEmailValue(endTime);
  const where = formatEmailValue(location, 'Not specified');
  const owner = formatEmailValue(hostName, 'The event owner');
  const cancelNote = formatEmailValue(note, 'No additional notes provided.');

  return sendEmail({
    to,
    subject: `LGTM cancellation: "${title}" was cancelled`,
    text: `${owner} cancelled an upcoming appointment.\n\nTitle: ${title}\nStart: ${start}\nEnd: ${end}\nLocation: ${where}\n\nOwner note: ${cancelNote}`,
    html: `
      <p>${owner} cancelled an upcoming appointment.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Location:</strong> ${where}</p>
      <p><strong>Owner note:</strong> ${cancelNote}</p>
    `,
  });
}

async function sendAppointmentCancelledByAttendeeToHostEmail({
  to,
  attendeeName,
  appointmentTitle,
  startTime,
  endTime,
  location,
  note,
  sessionCount = 1,
}) {
  const title = formatEmailValue(appointmentTitle, 'Appointment');
  const start = formatEmailValue(startTime);
  const end = formatEmailValue(endTime);
  const where = formatEmailValue(location, 'Not specified');
  const who = formatEmailValue(attendeeName, 'An attendee');
  const cancelNote = formatEmailValue(note, 'No additional notes provided.');
  const sessionsNote =
    sessionCount > 1
      ? ` This applies to ${sessionCount} sessions in the series (the first is shown below).`
      : '';
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/`;

  return sendEmail({
    to,
    subject: `LGTM: ${who} cancelled "${title}"`,
    text: `${who} cancelled their booking for "${title}".${sessionsNote}\n\nStart: ${start}\nEnd: ${end}\nLocation: ${where}\n\nNote: ${cancelNote}\n\nOpen your dashboard: ${dashboardLink}`,
    html: `
      <p>${who} cancelled their booking for <strong>${title}</strong>.</p>
      ${sessionCount > 1 ? `<p>This applies to <strong>${sessionCount}</strong> sessions in the series (the first is shown below).</p>` : ''}
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Location:</strong> ${where}</p>
      <p><strong>Note:</strong> ${cancelNote}</p>
      <p><a href="${dashboardLink}">Open your dashboard</a></p>
    `,
  });
}

async function sendBookingRequestToHostEmail({
  to,
  hostFirstName,
  studentName,
  appointmentTitle,
  startTime,
  endTime,
  location,
}) {
  const title = formatEmailValue(appointmentTitle, 'Booking request');
  const start = formatEmailValue(startTime);
  const end = formatEmailValue(endTime);
  const where = formatEmailValue(location, 'Not specified');
  const who = formatEmailValue(studentName, 'A student');
  const greet = hostFirstName ? `${formatEmailValue(hostFirstName)}` : 'Hello';
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/`;

  return sendEmail({
    to,
    subject: `LGTM: ${who} requested a meeting — "${title}"`,
    text: `${greet},\n\n${who} requested a meeting for the following time:\n\nTitle: ${title}\nStart: ${start}\nEnd: ${end}\nLocation: ${where}\n\nReview and respond from your dashboard:\n${dashboardLink}`,
    html: `
      <p>${greet},</p>
      <p>${who} requested a meeting for the following time:</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Location:</strong> ${where}</p>
      <p><a href="${dashboardLink}">Open your dashboard to respond</a></p>
    `,
  });
}

async function sendHostBookingResponseToAttendeeEmail({
  to,
  hostName,
  accepted,
  appointmentTitle,
  startTime,
  endTime,
  location,
}) {
  const title = formatEmailValue(appointmentTitle, 'Appointment');
  const start = formatEmailValue(startTime);
  const end = formatEmailValue(endTime);
  const where = formatEmailValue(location, 'Not specified');
  const owner = formatEmailValue(hostName, 'The host');
  const verb = accepted ? 'confirmed' : 'cancelled';
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/`;

  return sendEmail({
    to,
    subject: `LGTM: ${owner} ${verb} your request — "${title}"`,
    text: `${owner} ${verb} your meeting request.\n\nTitle: ${title}\nStart: ${start}\nEnd: ${end}\nLocation: ${where}\n\nView your dashboard: ${dashboardLink}`,
    html: `
      <p>${owner} ${verb} your meeting request.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Location:</strong> ${where}</p>
      <p><a href="${dashboardLink}">Open your dashboard</a></p>
    `,
  });
}

async function sendStudentJoinedCourseEventToHostEmail({
  to,
  studentName,
  appointmentTitle,
  startTime,
  sessionCount = 1,
}) {
  const title = formatEmailValue(appointmentTitle);
  const when = formatEmailValue(startTime);
  const who = formatEmailValue(studentName, 'A student');
  const sessionsNote =
    sessionCount > 1
      ? ` This applies to ${sessionCount} sessions in the series (the first is shown below).`
      : '';
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/`;

  return sendEmail({
    to,
    subject: `LGTM: ${who} joined "${title}"`,
    text: `${who} joined your course event "${title}".${sessionsNote}\n\nStart: ${when}\n\nView your dashboard: ${dashboardLink}`,
    html: `
      <p>${who} joined your course event <strong>${title}</strong>.</p>
      ${sessionCount > 1 ? `<p>This applies to <strong>${sessionCount}</strong> sessions in the series (the first is shown below).</p>` : ''}
      <p><strong>Start:</strong> ${when}</p>
      <p><a href="${dashboardLink}">Open your dashboard</a></p>
    `,
  });
}

async function sendAppointmentInvitationToInviteeEmail({
  to,
  inviteeFirstName,
  hostName,
  appointmentTitle,
  startTime,
  endTime,
  location,
}) {
  const title = formatEmailValue(appointmentTitle, 'Course event');
  const start = formatEmailValue(startTime);
  const end = formatEmailValue(endTime);
  const where = formatEmailValue(location, 'Not specified');
  const organizer = formatEmailValue(hostName, 'The organizer');
  const greet = inviteeFirstName ? `${formatEmailValue(inviteeFirstName)}` : 'Hello';
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/`;

  return sendEmail({
    to,
    subject: `LGTM: You're invited — "${title}"`,
    text: `${greet},\n\n${organizer} invited you to a course event.\n\nTitle: ${title}\nStart: ${start}\nEnd: ${end}\nLocation: ${where}\n\nOpen your dashboard to respond:\n${dashboardLink}`,
    html: `
      <p>${greet},</p>
      <p>${organizer} invited you to a course event.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Location:</strong> ${where}</p>
      <p><a href="${dashboardLink}">Open your dashboard to respond</a></p>
    `,
  });
}

async function sendHeatmapAppointmentScheduledEmail({
  to,
  roleLabel,
  hostName,
  appointmentTitle,
  startTime,
  endTime,
  location,
}) {
  const title = formatEmailValue(appointmentTitle, 'Heatmap meeting');
  const start = formatEmailValue(startTime);
  const end = formatEmailValue(endTime);
  const where = formatEmailValue(location, 'Not specified');
  const host = formatEmailValue(hostName, 'The host');
  const dashboardLink = `${FRONTEND_URL.replace(/\/+$/, '')}/`;

  return sendEmail({
    to,
    subject: `LGTM: Heatmap time confirmed — "${title}"`,
    text: `A meeting time was confirmed from a heatmap (${roleLabel}).\n\nHost: ${host}\nTitle: ${title}\nStart: ${start}\nEnd: ${end}\nLocation: ${where}\n\nView your dashboard: ${dashboardLink}`,
    html: `
      <p>A meeting time was confirmed from a heatmap (${roleLabel}).</p>
      <p><strong>Host:</strong> ${host}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Start:</strong> ${start}</p>
      <p><strong>End:</strong> ${end}</p>
      <p><strong>Location:</strong> ${where}</p>
      <p><a href="${dashboardLink}">Open your dashboard</a></p>
    `,
  });
}

module.exports = {
  sendEmail,
  sendForgotPasswordEmail,
  sendPasswordChangedEmail,
  sendAppointmentUpdatedByOwnerEmail,
  sendAppointmentCancelledByOwnerEmail,
  sendAppointmentCancelledByAttendeeToHostEmail,
  sendBookingRequestToHostEmail,
  sendHostBookingResponseToAttendeeEmail,
  sendStudentJoinedCourseEventToHostEmail,
  sendAppointmentInvitationToInviteeEmail,
  sendHeatmapAppointmentScheduledEmail,
  sendStudentEventResponseToHostEmail,
};
