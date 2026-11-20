import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import { profile, membership } from '../controllers/memberController.js';

const router = Router();
router.use(authenticate, requireRole('MEMBER'));
router.use((req, res, next) => {
  if (!req.user.memberId) return res.status(403).json({ message: 'Contact the gym to link your member profile.' });
  next();
});
router.get('/profile', profile);
router.get('/membership', membership);
export default router;
