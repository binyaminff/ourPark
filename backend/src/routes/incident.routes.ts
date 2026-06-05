import { Router } from 'express';
import { IncidentController } from '../controllers/incident.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const incidentController = new IncidentController();

router.use(authenticate);

router.post('/', incidentController.report);

export default router;
