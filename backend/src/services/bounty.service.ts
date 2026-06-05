import { prisma } from '../prisma/client';
import { BountyStatus, TransactionType } from '@prisma/client';

export class BountyService {
    async getAvailableBounties(lat: number, lng: number, radiusKm: number = 5) {
        // Find bounties that are open
        const bounties = await prisma.bounty.findMany({
            where: {
                status: BountyStatus.OPEN
            },
            include: {
                spot: true
            }
        });

        // Filter by simple distance (approximate logic for MVP)
        // In a real app, use PostGIS or Haversine formula
        return bounties.filter(b => {
            const dLat = (b.spot.latitude - lat) * 111.32; // km per degree
            const dLng = (b.spot.longitude - lng) * 111.32 * Math.cos(lat * (Math.PI / 180));
            const distance = Math.sqrt(dLat * dLat + dLng * dLng);
            return distance <= radiusKm;
        });
    }

    async claimBounty(userId: string, bountyId: string) {
        const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });

        if (!bounty) throw new Error('Bounty not found');
        if (bounty.status !== BountyStatus.OPEN) throw new Error('Bounty is no longer available');

        return prisma.bounty.update({
            where: { id: bountyId },
            data: {
                status: BountyStatus.CLAIMED,
                claimedById: userId
            }
        });
    }

    async submitVerification(userId: string, bountyId: string, photoUrl: string) {
        const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });

        if (!bounty) throw new Error('Bounty not found');
        if (bounty.claimedById !== userId) throw new Error('You have not claimed this bounty');
        if (bounty.status !== BountyStatus.CLAIMED) throw new Error('Invalid bounty status');

        return prisma.bounty.update({
            where: { id: bountyId },
            data: {
                photoUrl,
                status: BountyStatus.VERIFIED // For now instantly verified. Usually requires admin approval.
            }
        });
    }

    // This would typically be called by an admin panel or automated AI image analysis
    async resolveBounty(bountyId: string, isApproved: boolean) {
        const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });
        if (!bounty) throw new Error('Bounty not found');

        if (isApproved && bounty.claimedById) {
            await prisma.$transaction(async (tx) => {
                await tx.walletTransaction.create({
                    data: {
                        userId: bounty.claimedById!,
                        amount: bounty.rewardAmount,
                        type: TransactionType.COMPENSATION,
                        description: `Reward for completing Secret Shopper bounty at spot ${bounty.spotId}`
                    }
                });

                await tx.user.update({
                    where: { id: bounty.claimedById! },
                    data: { walletBalance: { increment: bounty.rewardAmount } }
                });

                // Can mark bounty done or just leave VERIFIED. We'll leave it as VERIFIED.
            });
        } else {
            // Un-claim the bounty if not approved
            await prisma.bounty.update({
                where: { id: bountyId },
                data: {
                    status: BountyStatus.OPEN,
                    claimedById: null,
                    photoUrl: null
                }
            });
        }
    }
}
