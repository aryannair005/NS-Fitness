import { normalizeMobile } from '../utils/mobile.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { publicUser } from '../middleware/authMiddleware.js';

const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' };
const invalidPasswordHash = await bcrypt.hash('unused-account-comparison', 12);

function startSession(res, user) {
  const token = jwt.sign({ version: user.sessionVersion }, process.env.JWT_SECRET, { subject: user.id, expiresIn: '8h' });
  res.cookie('ns_session', token, { ...cookie, maxAge: 8 * 3600000 }).json({ user: publicUser(user) });
}

export async function login(req, res) {
  const { mobile: input, password } = req.body ?? {};
  const mobile = normalizeMobile(input);
  if (!mobile || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: 'Enter a valid phone number and password.' });
  }
  const user = await User.findOne({ mobile }).select('+passwordHash');
  const matches = await bcrypt.compare(password, user?.passwordHash ?? invalidPasswordHash);
  if (!matches || !user?.isActive) return res.status(401).json({ message: 'Incorrect phone number or password.' });
  startSession(res, user);
}

export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body ?? {};
  if (typeof oldPassword !== 'string' || !oldPassword || Buffer.byteLength(oldPassword) > 72) {
    return res.status(400).json({ message: 'Enter your current password.' });
  }
  if (typeof newPassword !== 'string' || [...newPassword].length < 12 || Buffer.byteLength(newPassword) > 72) {
    return res.status(400).json({ message: 'Use at least 12 characters and at most 72 UTF-8 bytes for your new password.' });
  }
  const session = { _id: req.user.id, isActive: true, sessionVersion: req.user.sessionVersion };
  const account = await User.findOne(session).select('+passwordHash');
  if (!account) return res.status(401).json({ message: 'Please sign in again.' });
  if (!await bcrypt.compare(oldPassword, account.passwordHash)) {
    return res.status(400).json({ message: 'Your current password is incorrect.' });
  }
  if (oldPassword === newPassword) return res.status(400).json({ message: 'Choose a different new password.' });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await User.findOneAndUpdate({ ...session, passwordHash: account.passwordHash },
    { $set: { passwordHash }, $inc: { sessionVersion: 1 } }, { new: true });
  if (!updated) return res.status(401).json({ message: 'Your session changed. Please sign in again.' });
  startSession(res, updated);
}

export async function logout(req, res) {
  await User.updateOne({ _id: req.user.id, sessionVersion: req.user.sessionVersion }, { $inc: { sessionVersion: 1 } });
  res.clearCookie('ns_session', cookie).sendStatus(204);
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
