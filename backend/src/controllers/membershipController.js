import mongoose from 'mongoose';
import Member from '../models/Member.js';
import Membership from '../models/Membership.js';
import { endOfTerm, gymToday, statusOf } from '../utils/membershipDates.js';

export async function list(req, res) {
  const terms = await Membership.find().populate('memberId', 'fullName isActive').sort({ endDate: 1 }).lean();
  const today = gymToday();
  const memberships = terms.filter(t => t.memberId).map(t => ({ ...t, status: statusOf(t, today) }));
  res.json({ memberships: req.path === '/expiring' ? memberships.filter(t => t.memberId.isActive && t.status === 'EXPIRING TOMORROW') : memberships });
}

export async function renew(req, res) {
  const { memberId, plan, startDate, amount } = req.body ?? {};
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(NaN);
  if (!mongoose.isObjectIdOrHexString(memberId) || !Number.isFinite(+start) || start.toISOString().slice(0,10) !== startDate) {
    return res.status(400).json({ message: 'Select a member and a valid start date.' });
  }
  const endDate = endOfTerm(start, plan);
  if (!endDate || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ message: 'Select a plan and enter a valid fee.' });
  }
  const term = await mongoose.connection.transaction(async session => {
    // Serialize renewals for this member before checking the latest period.
    const member = await Member.findOneAndUpdate({ _id: memberId, isActive: true }, { $inc: { __v: 1 } }, { session });
    if (!member) throw Object.assign(new Error('An enabled member account is required.'), { status: 409, expose: true });
    const latest = await Membership.findOne({ memberId }).sort({ endDate: -1 }).session(session);
    if (latest && start <= latest.endDate) throw Object.assign(new Error('Start after the last membership ends.'), { status: 409, expose: true });
    const [created] = await Membership.create([{ memberId, plan, startDate: start, endDate, amount }], { session });
    return created;
  });
  res.status(201).json({ membership: term });
}

export async function setSuspended(req, res) {
  const suspended = req.body?.suspended;
  if (typeof suspended !== 'boolean') return res.status(400).json({ message: 'Choose suspend or resume.' });
  const membership = await Membership.findByIdAndUpdate(req.params.id, { suspended }, { new: true }).lean();
  if (!membership) return res.status(404).json({ message: 'Membership not found.' });
  res.json({ membership: { ...membership, status: statusOf(membership) } });
}
