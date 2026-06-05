import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const subscriptionController = new SubscriptionController();

// Plans
router.post('/plans', authenticate, subscriptionController.createPlan);
router.get('/spots/:spotId/plans', subscriptionController.getSpotPlans); // Public? Or auth? Auth for now
router.post('/plans/:planId/subscribe', authenticate, subscriptionController.subscribeToPlan);

// Negotiations (Offers)
router.post('/offers', authenticate, subscriptionController.createOffer);
router.get('/offers', authenticate, subscriptionController.getMyOffers);
router.post('/offers/:offerId/respond', authenticate, subscriptionController.respondToOffer);

// Active Subscriptions
router.get('/', authenticate, subscriptionController.getMySubscriptions);

export default router;
