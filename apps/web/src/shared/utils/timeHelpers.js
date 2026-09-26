// Session definitions (ET times in minutes from midnight)
const SESSION_RANGES = [
  { name: 'Asia', start: 1080, end: 120 },     // 18:00 - 02:00 next day
  { name: 'London', start: 120, end: 300 },    // 02:00 - 05:00
  { name: 'NY Pre-Market', start: 300, end: 510 }, // 05:00 - 08:30
  { name: 'NY AM', start: 510, end: 660 },     // 08:30 - 11:00
  { name: 'NY Lunch', start: 660, end: 810 },  // 11:00 - 13:30
  { name: 'NY PM', start: 810, end: 960 },     // 13:30 - 16:00
  { name: 'After Hours', start: 960, end: 1080 }, // 16:00 - 18:00
];

export function getSession(minutes) {
  // minutes is the entry time in minutes from midnight (0-1439)
  for (const range of SESSION_RANGES) {
    if (minutes >= range.start && minutes < range.end) {
      return range.name;
    }
  }
  // If outside all ranges (shouldn't happen), default to 'Asia'
  return 'Asia';
}

export function get30MinBucket(minutes) {
  const flo = Math.floor(minutes / 30) * 30;
  const h = Math.floor(flo / 60);
  const m = flo % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function generateTimeBlocks() {
  // ET 03:00 to 10:59 (30-min buckets) – we can extend as needed
  const blocks = [];
  for (let h = 3; h <= 10; h++) {
    const start = String(h).padStart(2, '0') + ':00';
    const end = String(h).padStart(2, '0') + ':30';
    blocks.push({ value: start, label: start + '-' + end });
    const start2 = String(h).padStart(2, '0') + ':30';
    const end2 = String(h + 1).padStart(2, '0') + ':00';
    blocks.push({ value: start2, label: start2 + '-' + end2 });
  }
  return blocks;
}

export function getWeekStart(dateStr) {
  // Returns the Sunday date of the week (YYYY-MM-DD)
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 = Sunday
  const diff = -day;
  const sunday = new Date(d);
  sunday.setDate(d.getDate() + diff);
  return sunday.toISOString().slice(0, 10);
}