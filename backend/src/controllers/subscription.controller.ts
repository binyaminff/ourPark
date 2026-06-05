import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';

const subscriptionService = new SubscriptionService();

export class SubscriptionController {
    // ==== PLANS ====
    async createPlan(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const plan = await subscriptionService.createSubscriptionPlan(userId, req.body);
            res.status(201).json(plan);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }

    async getSpotPlans(req: Request, res: Response) {
        try {
            const plans = await subscriptionService.getPlansForSpot(req.params.spotId);
            res.json(plans);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }

    async subscribeToPlan(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const subscription = await subscriptionService.subscribeToPlan(userId, req.params.planId);
            res.status(201).json(subscription);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }

    // ==== OFFERS (Negotiations) ====
    async createOffer(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const offer = await subscriptionService.createSubscriptionOffer(userId, req.body);
            res.status(201).json(offer);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }

    async getMyOffers(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const offers = await subscriptionService.getMyOffers(userId);
            res.json(offers);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }

    async respondToOffer(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const { accept } = req.body;
            const result = await subscriptionService.respondToOffer(userId, req.params.offerId, accept);
            res.json(result);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }

    // ==== SUBSCRIPTIONS ====
    async getMySubscriptions(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const subscriptions = await subscriptionService.getMySubscriptions(userId);
            res.json(subscriptions);
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }
}
