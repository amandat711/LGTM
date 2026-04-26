// AMANDA TRAN (20% contribution) + ChatGPT (80% contribution)
// OpenAI. (2026). ChatGPT. https://chat.openai.com/
/**
 * Generates an array of day objects for the grid header.
 *
 * @param {string} startDate - ISO date string e.g. "2026-04-07"
 * @param {number} numDays - how many days to show (default 5)
 * @returns {{ short: string, date: string, iso: string }[]}
 */
export function generateDays(startDate, numDays = 5) {
  const days   = [];
  const shorts = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  for (let i = 0; i < numDays; i++) {
    const d = new Date(`${startDate}T00:00:00`);
    d.setDate(d.getDate() + i);
    days.push({
      short: shorts[d.getDay()],
      date:  `${months[d.getMonth()]} ${d.getDate()}`,
      iso:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    });
  }
  return days;
}

/**
 * Generates time slot labels from startHour to endHour in 30-min increments.
 *
 * @param {number} startHour - e.g. 8 (8 AM)
 * @param {number} endHour - e.g. 17 (5 PM)
 * @returns {string[]}
 */
export function generateTimes(startHour = 8, endHour = 17) {
  const times = [];
  for (let h = startHour; h < endHour; h++) {
    const label = (h === 12 ? 12 : h % 12) || 12;
    const ampm  = h < 12 ? 'AM' : 'PM';
    times.push(`${label}:00 ${ampm}`);
    times.push(`${label}:30 ${ampm}`);
  }
  return times;
}
