import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const locationController = new LocationController();

// Record a background GPS ping (Protected)
router.post('/ping', authenticate, locationController.recordPing);

export default router;
