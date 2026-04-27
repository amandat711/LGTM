// SHIRLEY DING, Contribution: 100%
export function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toIsoWithOffset(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('toIsoWithOffset expects a valid Date');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const tzOffsetMinutes = -date.getTimezoneOffset();
  const sign = tzOffsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const offsetMinutes = String(absOffset % 60).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
}

export function toIsoWithOffsetFromLocalParts(date, time) {
  const localDate = new Date(`${date}T${time}:00`);
  if (Number.isNaN(localDate.getTime())) return `${date}T${time}:00`;
  return toIsoWithOffset(localDate);
}
