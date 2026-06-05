import { Router } from 'express';
import { BountyController } from '../controllers/bounty.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const bountyController = new BountyController();

router.use(authenticate);

router.get('/', bountyController.getAvailable);
router.post('/:id/claim', bountyController.claim);
router.post('/:id/submit', bountyController.submit);

export default router;
