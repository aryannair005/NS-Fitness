import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import * as admin from '../controllers/adminController.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
router.get('/dashboard', admin.dashboard);
router.route('/members').get(admin.listMembers).post(admin.createMember);
router.route('/members/:id').get(admin.memberDetails).put(admin.updateMember);
router.patch('/members/:id/deactivate', admin.deactivateMember);
export default router;
