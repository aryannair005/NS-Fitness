import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import { list, renew, setSuspended } from '../controllers/membershipController.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
router.get('/', list);
router.get('/expiring', list);
router.post('/', renew);
router.put('/:id', setSuspended);
export default router;
