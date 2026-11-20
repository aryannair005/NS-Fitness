import Member from '../models/Member.js';
import { gymToday, statusOf } from '../utils/membershipDates.js';
import { readLedger } from './paymentController.js';

export async function profile(req, res) {
  const member = await Member.findById(req.user.memberId)
    .select('fullName fatherName email mobile address joiningDate').lean();
  if (!member) return res.status(404).json({ message: 'Member profile unavailable. Please contact the gym.' });
  res.json({ member });
}

export function membershipSummary(terms, today = gymToday()) {
  const memberships = terms.map(t => ({ ...t, membershipStatus: statusOf(t, today) }));
  // readLedger sorts newest start first. Prefer today's term, then the nearest upcoming term.
  const current = memberships.find(t => t.startDate <= today && t.endDate >= today);
  const upcoming = memberships.filter(t => t.startDate > today).at(-1);
  return { featured: current ?? upcoming ?? memberships[0] ?? null, memberships };
}

export async function membership(req, res) {
  const { memberships } = await readLedger({ memberId: req.user.memberId });
  res.json(membershipSummary(memberships));
}
