export function normalizeMobile(input) {
  if (typeof input !== 'string') return null;
  const compact = input.trim().replace(/[\s()-]/g, '');
  if (/^\d{10}$/.test(compact)) return '+91' + compact;
  if (/^91\d{10}$/.test(compact)) return '+' + compact;
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

export const mobileField = {
  type: String, required: true, unique: true, set: normalizeMobile,
  match: /^\+[1-9]\d{7,14}$/,
};
