// SHIRLEY DING, Contribution: 100%
function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toStoredIsoDateTime(date) {
  return date.toISOString();
}

module.exports = {
  parseDate,
  toStoredIsoDateTime,
};
