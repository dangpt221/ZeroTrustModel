import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  registerDevice, 
  getPublicKeys, 
  setupBackup, 
  getBackup 
} from '../controllers/e2eeController.js';

const router = express.Router();

// All E2EE routes require authentication
router.use(requireAuth);

// Device Registry Routes
router.post('/device/register', registerDevice);
router.post('/keys/users', getPublicKeys); // Uses POST to allow array of userIds in body

// Backup Routes
router.post('/backup/setup', setupBackup);
router.get('/backup/recover', getBackup);

export default router;
