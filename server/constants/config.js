const DEFAULT_PORT = 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const MAIL_FROM = process.env.MAIL_FROM || 'lgtm.noreply@gmail.com';

module.exports = {
  DEFAULT_PORT,
  FRONTEND_URL,
  MAIL_FROM,
};
