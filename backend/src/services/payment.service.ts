import { prisma } from '../prisma/client';
import Stripe from 'stripe';

const isRealStripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock';

// Initialize Stripe if a real key is present
const realStripe = isRealStripe
    ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })
    : null;

// Mock Stripe API fallback
const mockStripe = {
    paymentIntents: {
        create: async (data: any) => ({ id: 'pi_mock_' + Date.now(), client_secret: 'secret_mock', ...data }),
        capture: async (id: string) => ({ id, status: 'succeeded' }),
        createRefund: async (data: any) => ({ id: 're_mock_' + Date.now(), status: 'succeeded' })
    }
};

// Unified stripe client that redirects based on environment
const stripeClient = {
    paymentIntents: {
        create: async (data: any) => {
            if (realStripe) {
                return realStripe.paymentIntents.create(data);
            }
            return mockStripe.paymentIntents.create(data);
        },
        capture: async (id: string) => {
            if (realStripe && !id.startsWith('pi_mock_')) {
                return realStripe.paymentIntents.capture(id);
            }
            return mockStripe.paymentIntents.capture(id);
        },
        createRefund: async (data: any) => {
            if (realStripe && data.payment_intent && !data.payment_intent.startsWith('pi_mock_')) {
                return realStripe.refunds.create({
                    payment_intent: data.payment_intent
                });
            }
            return mockStripe.paymentIntents.createRefund(data);
        }
    }
};

export class PaymentService {
    async createPaymentIntent(bookingId: string, amount: number) {
        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: Math.round(amount * 100), // cents
            currency: 'usd',
            metadata: { bookingId }
        });

        return prisma.payment.create({
            data: {
                bookingId,
                amount,
                stripePaymentId: paymentIntent.id,
                status: 'pending'
            }
        });
    }

    async capturePayment(bookingId: string) {
        const payment = await prisma.payment.findUnique({ where: { bookingId } });
        if (!payment || !payment.stripePaymentId) throw new Error('Payment not found');

        await stripeClient.paymentIntents.capture(payment.stripePaymentId);

        return prisma.payment.update({
            where: { bookingId },
            data: { status: 'succeeded' }
        });
    }

    async refundPayment(bookingId: string) {
        const payment = await prisma.payment.findUnique({ where: { bookingId } });
        if (!payment || !payment.stripePaymentId) throw new Error('Payment not found');

        await stripeClient.paymentIntents.createRefund({
            payment_intent: payment.stripePaymentId
        });

        return prisma.payment.update({
            where: { bookingId },
            data: { status: 'refunded' }
        });
    }
}
