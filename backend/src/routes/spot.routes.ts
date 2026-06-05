import { Router } from 'express';
import { SpotController } from '../controllers/spot.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const spotController = new SpotController();

// Create spot (Protected)
router.post('/', authenticate, spotController.create);

// Search spots
router.get('/search', spotController.search);

// Get details
router.get('/my-spots', authenticate, spotController.getMySpots);
router.get('/:id', spotController.getById);

// Update details
router.put('/:id', authenticate, spotController.update);

// Toggle Availability (Protected, checks ownerId internally)
router.post('/:id/toggle-availability', authenticate, spotController.toggleAvailability);

export default router;
