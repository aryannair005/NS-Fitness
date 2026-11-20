import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, memberId: user.memberId ?? null };
}

export async function authenticate(req, res, next) {
  const cookie = req.headers.cookie?.split(/;\s*/).find(value => value.startsWith('ns_session='));
  let claims;
  try {
    claims = jwt.verify(cookie?.slice('ns_session='.length), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: 'Please sign in.' });
  }
  const user = await User.findById(claims.sub);
  if (!user?.isActive || claims.version !== user.sessionVersion) {
    return res.status(401).json({ message: 'Please sign in.' });
  }
  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, res, next) => req.user.role === role
    ? next()
    : res.status(403).json({ message: 'Access denied.' });
}
