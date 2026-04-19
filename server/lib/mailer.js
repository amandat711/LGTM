const nodemailer = require('nodemailer');
const { MAIL_FROM } = require('../constants/config');

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

module.exports = {
  sendEmail,
  sendForgotPasswordEmail,
};
