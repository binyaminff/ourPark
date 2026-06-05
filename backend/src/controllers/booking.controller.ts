import { Request, Response } from 'express';
import { BookingService } from '../services/booking.service';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import Stripe from 'stripe';

const isRealStripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock';
const stripe = isRealStripe
    ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })
    : null;

const bookingService = new BookingService();

const createBookingSchema = z.object({
    spotId: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    paymentId: z.string().optional(),
});

export class BookingController {
    async create(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const data = createBookingSchema.parse(req.body);
            const booking = await bookingService.createBooking(userId, data);
            res.status(201).json(booking);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    async end(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            const { lat, lng } = req.body;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const booking = await bookingService.endBooking(String(req.params.id), String(userId), lat, lng);
            res.json(booking);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async createPaymentIntent(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            const { amount, spotId } = req.body;

            // In a real app, calculate amount based on booking time instead of trusting client
            // We get the spot owner to know where to route funds
            const spot = await prisma.parkingSpot.findUnique({
                where: { id: spotId },
                include: { owner: true }
            });

            if (!spot || !spot.owner) {
                return res.status(404).json({ error: 'Spot or owner not found' });
            }

            const ownerStripeAccountId = spot.owner.stripeAccountId;
            const renter = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!renter) {
                return res.status(404).json({ error: 'Renter user not found' });
            }

            // App platform commission (e.g. 15%)
            const applicationFeeAmount = Math.round(amount * 100 * 0.15);

            if (stripe) {
                // 1. Fetch or create Stripe Customer
                let stripeCustomer;
                const existingCustomers = await stripe.customers.list({
                    email: renter.email,
                    limit: 1
                });

                if (existingCustomers.data.length > 0) {
                    stripeCustomer = existingCustomers.data[0];
                } else {
                    stripeCustomer = await stripe.customers.create({
                        email: renter.email,
                        name: renter.name
                    });
                }

                // 2. Create Ephemeral Key for Customer (Stripe Payment Sheet requirement)
                const ephemeralKey = await stripe.ephemeralKeys.create(
                    { customer: stripeCustomer.id },
                    { apiVersion: '2023-10-16' }
                );

                // 3. Create real PaymentIntent with split payout capabilities (Stripe Connect)
                const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
                    amount: Math.round(amount * 100), // in cents
                    currency: 'ils',
                    customer: stripeCustomer.id,
                    automatic_payment_methods: {
                        enabled: true
                    }
                };

                if (ownerStripeAccountId) {
                    paymentIntentParams.application_fee_amount = applicationFeeAmount;
                    paymentIntentParams.transfer_data = {
                        destination: ownerStripeAccountId
                    };
                }

                const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

                res.json({
                    paymentIntent: paymentIntent.client_secret,
                    ephemeralKey: ephemeralKey.secret,
                    customer: stripeCustomer.id
                });
                return;
            }

            // Returning mock data to allow UI flow to proceed to error or test mode check
            res.json({
                paymentIntent: 'pi_mock_split_payment_secret_123',
                ephemeralKey: 'ek_mock_secret_123',
                customer: 'cus_mock_123',
                debug_info: {
                    owner_account: ownerStripeAccountId || 'MISSING_STRIPE_ACCOUNT',
                    platform_fee: applicationFeeAmount,
                    total_amount: amount * 100
                }
            });
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
    async getMyBookings(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const bookings = await bookingService.getUserBookings(String(userId));
            res.json(bookings);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
