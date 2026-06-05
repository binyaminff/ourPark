import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const bookingController = new BookingController();

router.use(authenticate);

router.post('/', bookingController.create);
router.post('/payment-intent', bookingController.createPaymentIntent);
router.get('/my-bookings', bookingController.getMyBookings);
router.post('/:id/end', bookingController.end);

export default router;
