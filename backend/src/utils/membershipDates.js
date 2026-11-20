const months = new Map([['Monthly', 1], ['Quarterly', 3], ['Half-Yearly', 6], ['Yearly', 12]]);
const day = 86400000;

export function gymToday(now = new Date()) {
  return new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
}

export function endOfTerm(start, plan) {
  if (!months.has(plan)) return null;
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + months.get(plan);
  const last = new Date(Date.UTC(year, month + 1, 0));
  if (start.getUTCDate() > last.getUTCDate()) return last;
  return new Date(Date.UTC(year, month, start.getUTCDate()) - day);
}

export function nextStart(latest, today = gymToday()) {
  return new Date(Math.max(+today, latest ? +latest.endDate + day : 0)).toISOString().slice(0, 10);
}

export function statusOf(term, today = gymToday()) {
  if (term.suspended) return 'SUSPENDED';
  if (term.endDate < today) return 'EXPIRED';
  if (term.startDate > today) return 'SCHEDULED';
  if (+term.endDate === +today + day) return 'EXPIRING TOMORROW';
  return 'ACTIVE';
}
