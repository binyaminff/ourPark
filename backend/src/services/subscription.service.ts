import { prisma } from '../prisma/client';
import { SubscriptionType, OfferStatus } from '@prisma/client';

export class SubscriptionService {
    // ---- OWNER: Subscription Plans ----

    async createSubscriptionPlan(ownerId: string, data: any) {
        // Verify owner owns the spot
        const spot = await prisma.parkingSpot.findUnique({ where: { id: data.spotId } });
        if (!spot || spot.ownerId !== ownerId) throw new Error('Spot not found or unauthorized');

        return prisma.subscriptionPlan.create({
            data: {
                spotId: data.spotId,
                ownerId,
                type: data.type,
                monthlyPrice: data.monthlyPrice,
                occurrencesPerMonth: data.occurrencesPerMonth,
                specificDays: data.specificDays || [],
                startTime: data.startTime,
                endTime: data.endTime,
            }
        });
    }

    async getPlansForSpot(spotId: string) {
        return prisma.subscriptionPlan.findMany({
            where: { spotId, isActive: true }
        });
    }

    // ---- RENTER: Subscription Offers ----

    async createSubscriptionOffer(creatorId: string, data: any) {
        const spot = await prisma.parkingSpot.findUnique({ where: { id: data.spotId } });
        if (!spot) throw new Error('Spot not found');

        // Target user is the spot owner (since renter is creator)
        const targetUserId = spot.ownerId;

        return prisma.subscriptionOffer.create({
            data: {
                spotId: data.spotId,
                creatorId,
                targetUserId,
                type: data.type,
                monthlyPrice: data.monthlyPrice,
                occurrencesPerMonth: data.occurrencesPerMonth,
                specificDays: data.specificDays || [],
                startTime: data.startTime,
                endTime: data.endTime,
                status: OfferStatus.PENDING
            }
        });
    }

    // ---- OWNER/RENTER: Manage Offers ----

    async getMyOffers(userId: string) {
        // Get offers where I am the creator OR the target
        return prisma.subscriptionOffer.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { targetUserId: userId }
                ]
            },
            include: { spot: true, creator: true, targetUser: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async respondToOffer(userId: string, offerId: string, accept: boolean) {
        const offer = await prisma.subscriptionOffer.findUnique({
            where: { id: offerId }
        });

        if (!offer) throw new Error('Offer not found');
        if (offer.targetUserId !== userId) throw new Error('Unauthorized to respond to this offer');
        if (offer.status !== OfferStatus.PENDING) throw new Error('Offer is no longer pending');

        const newStatus = accept ? OfferStatus.ACCEPTED : OfferStatus.REJECTED;

        // Start transaction if accepted to also create the Subscription
        if (accept) {
            // Who is the renter? The person who created the offer (assuming renter created it)
            // If the platform allows owner to create offers to renters, we'd need to check who is who here.
            // For now, assuming creator = renter, target = owner.
            const renterId = offer.creatorId;

            const [updatedOffer, subscription] = await prisma.$transaction([
                prisma.subscriptionOffer.update({
                    where: { id: offerId },
                    data: { status: newStatus }
                }),
                prisma.subscription.create({
                    data: {
                        spotId: offer.spotId,
                        renterId,
                        type: offer.type,
                        monthlyPrice: offer.monthlyPrice,
                        occurrencesPerMonth: offer.occurrencesPerMonth,
                        specificDays: offer.specificDays,
                        startTime: offer.startTime,
                        endTime: offer.endTime,
                    }
                })
            ]);
            return { offer: updatedOffer, subscription };
        } else {
            return prisma.subscriptionOffer.update({
                where: { id: offerId },
                data: { status: newStatus }
            });
        }
    }

    // ---- RENTER: Direct Subscribe to Plan ----

    async subscribeToPlan(renterId: string, planId: string) {
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) throw new Error('Plan not available');

        return prisma.subscription.create({
            data: {
                spotId: plan.spotId,
                renterId,
                type: plan.type,
                monthlyPrice: plan.monthlyPrice,
                occurrencesPerMonth: plan.occurrencesPerMonth,
                specificDays: plan.specificDays,
                startTime: plan.startTime,
                endTime: plan.endTime,
            }
        });
    }

    // ---- RENTER/OWNER: Active Subscriptions ----

    async getMySubscriptions(userId: string) {
        // As a renter
        const asRenter = await prisma.subscription.findMany({
            where: { renterId: userId },
            include: { spot: true }
        });

        // As an owner
        const spots = await prisma.parkingSpot.findMany({ where: { ownerId: userId } });
        const spotIds = spots.map(s => s.id);
        const asOwner = await prisma.subscription.findMany({
            where: { spotId: { in: spotIds } },
            include: { spot: true, renter: true }
        });

        return { asRenter, asOwner };
    }
}
