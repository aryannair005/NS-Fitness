import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const origin = req.get('Origin');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && origin && origin !== (process.env.CLIENT_ORIGIN || 'http://localhost:5173')) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  next();
});
router.post('/auth/login', login);
router.get('/auth/me', authenticate, me);
router.post('/auth/logout', authenticate, logout);
router.get('/admin/session', authenticate, requireRole('ADMIN'), me);
router.get('/member/session', authenticate, requireRole('MEMBER'), me);
export default router;
