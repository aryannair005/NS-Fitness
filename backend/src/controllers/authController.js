import { normalizeMobile } from '../utils/mobile.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { publicUser } from '../middleware/authMiddleware.js';

const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' };
const invalidPasswordHash = await bcrypt.hash('unused-account-comparison', 12);

export async function login(req, res) {
  const { mobile: input, password } = req.body ?? {};
  const mobile = normalizeMobile(input);
  if (!mobile || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: 'Enter a valid phone number and password.' });
  }
  const user = await User.findOne({ mobile }).select('+passwordHash');
  const matches = await bcrypt.compare(password, user?.passwordHash ?? invalidPasswordHash);
  if (!matches || !user?.isActive) return res.status(401).json({ message: 'Incorrect phone number or password.' });
  const token = jwt.sign({ version: user.sessionVersion }, process.env.JWT_SECRET, { subject: user.id, expiresIn: '8h' });
  res.cookie('ns_session', token, { ...cookie, maxAge: 8 * 3600000 }).json({ user: publicUser(user) });
}

export async function logout(req, res) {
  await User.updateOne({ _id: req.user.id, sessionVersion: req.user.sessionVersion }, { $inc: { sessionVersion: 1 } });
  res.clearCookie('ns_session', cookie).sendStatus(204);
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
