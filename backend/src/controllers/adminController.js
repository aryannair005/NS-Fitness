import { normalizeMobile } from '../utils/mobile.js';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Member from '../models/Member.js';
import { gymToday, nextStart, statusOf } from '../utils/membershipDates.js';
import Membership from '../models/Membership.js';

function fail(status, message) {
  throw Object.assign(new Error(message), { status, expose: true });
}

function date(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400, 'Enter a valid ' + label + '.');
  const parsed = new Date(value);
  if (Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== value) fail(400, 'Enter a valid ' + label + '.');
  return parsed;
}

function profile(body) {
  const data = {};
  for (const key of ['fullName', 'fatherName', 'address']) {
    if (typeof body[key] !== 'string' || !body[key].trim()) fail(400, 'Enter a valid ' + key + '.');
    data[key] = body[key].trim();
  }
  data.mobile = normalizeMobile(body.mobile);
  if (!data.mobile) fail(400, 'Enter a valid phone number, including the country code for international numbers.');
  data.joiningDate = date(body.joiningDate, 'joining date');
  return data;
}

export async function createMember(req, res) {
  const body = req.body ?? {};
  const data = profile(body);
  if (typeof body.password !== 'string' || [...body.password].length < 12 || Buffer.byteLength(body.password) > 72) {
    fail(400, 'Use a password of at least 12 characters and at most 72 UTF-8 bytes.');
  }
  const startDate = date(body.startDate, 'start date');
  const endDate = date(body.endDate, 'end date');
  if (endDate < startDate) fail(400, 'End date must be on or after start date.');
  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount < 0) fail(400, 'Enter a valid fee.');
  const passwordHash = await bcrypt.hash(body.password, 12);
  const member = await mongoose.connection.transaction(async session => {
    const [created] = await Member.create([data], { session });
    await User.create([{ mobile: created.mobile, memberId: created._id, role: 'MEMBER', passwordHash }], { session });
    await Membership.create([{ memberId: created._id, plan: body.plan, startDate, endDate, amount: body.amount }], { session });
    return created;
  });
  res.status(201).json({ member });
}

export async function updateMember(req, res) {
  const data = profile(req.body ?? {});
  const member = await mongoose.connection.transaction(async session => {
    const updated = await Member.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true, session });
    if (!updated) fail(404, 'Member not found.');
    const account = await User.updateOne({ memberId: updated._id, role: 'MEMBER' }, { mobile: updated.mobile }, { session });
    if (!account.matchedCount) fail(409, 'Member login is missing.');
    return updated;
  });
  res.json({ member });
}

export async function deactivateMember(req, res) {
  await mongoose.connection.transaction(async session => {
    const member = await Member.findByIdAndUpdate(req.params.id, { isActive: false }, { session });
    if (!member) fail(404, 'Member not found.');
    const account = await User.updateOne({ memberId: member._id, role: 'MEMBER' }, { isActive: false }, { session });
    if (!account.matchedCount) fail(409, 'Member login is missing.');
  });
  res.sendStatus(204);
}

export async function listMembers(req, res) {
  const search = String(req.query.q ?? '').trim().toLowerCase();
  const rows = await Member.find().sort({ fullName: 1 }).lean();
  const members = rows.filter(row => [row.fullName, row.mobile].some(value => value.toLowerCase().includes(search)));
  res.json({ members });
}

export async function memberDetails(req, res) {
  const member = await Member.findById(req.params.id).lean();
  if (!member) fail(404, 'Member not found.');
  const memberships = await Membership.find({ memberId: member._id }).sort({ startDate: -1 }).lean();
  const today = gymToday();
  res.json({ member, suggestedStart: nextStart(memberships[0], today), memberships: memberships.map(t => ({ ...t, status: statusOf(t, today) })) });
}

export async function dashboard(req, res) {
  // Membership dates are calendar dates stored at UTC midnight. Receipts use actual timestamps.
  const today = gymToday();
  const month = today.toISOString().slice(0, 7);
  const monthStart = new Date(month + '-01T00:00:00+05:30');
  const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth()+1, 1) - 19800000);
  const db = mongoose.connection.db;
  const [members, plans, payments] = await Promise.all([
    Member.find().sort({ createdAt: -1 }).lean(),
    Membership.find().sort({ startDate: -1 }).lean(),
    db.collection('payments').find({status: { $in: ['PAID', 'PARTIALLY PAID'] }}).sort({paymentDate: -1}).toArray(),
  ]);
  const paid = new Map();
  let revenue = 0;
  for (const payment of payments) {
    const key = String(payment.membershipId);
    paid.set(key, (paid.get(key) || 0) + Math.round(payment.amount * 100));
    if (payment.paymentDate >= monthStart && payment.paymentDate < nextMonth) revenue += Math.round(payment.amount * 100);
  }
  const stats = { total: members.length, active: 0, expired: 0, tomorrow: 0, revenue: revenue / 100,
    unpaid: plans.filter(plan => Math.round(plan.amount * 100) > (paid.get(String(plan._id)) || 0)).length };
  for (const member of members.filter(row => row.isActive)) {
    const current = plans.find(plan => String(plan.memberId) === String(member._id) && plan.startDate <= today);
    if (!current) continue;
    const status = statusOf(current, today);
    if (status === 'EXPIRED') stats.expired++;
    if (status === 'ACTIVE' || status === 'EXPIRING TOMORROW') {
      stats.active++;
      if (status === 'EXPIRING TOMORROW') stats.tomorrow++;
    }
  }
  res.json({ stats, registrations: members.slice(0,5), payments: payments.slice(0,5).map(p => ({
    id: p._id, name: members.find(m => String(m._id) === String(p.memberId))?.fullName, amount: p.amount, date: p.paymentDate
  })) });
}
