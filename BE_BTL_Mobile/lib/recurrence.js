const VALID_RECURRENCES = ['KHONG', 'HANG_NGAY', 'HANG_TUAN', 'HANG_THANG'];

function nextOccurrence(value, recurrence) {
  if (!value || !VALID_RECURRENCES.includes(recurrence) || recurrence === 'KHONG') return null;
  const current = new Date(value);
  if (Number.isNaN(current.getTime())) return null;
  const next = new Date(current);
  if (recurrence === 'HANG_NGAY') next.setUTCDate(next.getUTCDate() + 1);
  if (recurrence === 'HANG_TUAN') next.setUTCDate(next.getUTCDate() + 7);
  if (recurrence === 'HANG_THANG') {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
}

module.exports = { VALID_RECURRENCES, nextOccurrence };
