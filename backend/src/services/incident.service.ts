import { prisma } from '../prisma/client';
import { IncidentStatus, TransactionType, BookingStatus } from '@prisma/client';

export class IncidentService {
    async reportUnauthorized(reporterId: string, data: any) {
        // data: spotId, description, evidence (imageUrl, gps)

        // Find if reporter has an active/upcoming booking
        const reporterBooking = await prisma.booking.findFirst({
            where: {
                spotId: data.spotId,
                renterId: reporterId,
                status: BookingStatus.ACTIVE,
            },
            orderBy: { startTime: 'asc' }
        });

        // Find the previous renter (most recent booking before now)
        const previousBooking = await prisma.booking.findFirst({
            where: {
                spotId: data.spotId,
                endTime: { lte: new Date() },
            },
            orderBy: { endTime: 'desc' }
        });

        let violatorId = null;
        let penaltyAmount = 50.0; // ILS or USD penalty
        let rewardAmount = 15.0;  // Credit applied to reporter

        // Prevent reporter from reporting themselves as previous
        if (previousBooking && previousBooking.renterId !== reporterId) {
            violatorId = previousBooking.renterId;
        }

        const incident = await prisma.$transaction(async (tx) => {
            const newIncident = await tx.incident.create({
                data: {
                    spotId: data.spotId,
                    reporterId,
                    violatorId,
                    bookingId: reporterBooking?.id,
                    description: data.description,
                    status: IncidentStatus.OPEN, // Keeps it open for dispute if needed
                    evidence: {
                        create: {
                            imageUrl: data.evidence.imageUrl,
                            latitude: data.evidence.latitude,
                            longitude: data.evidence.longitude
                        }
                    }
                }
            });

            // If we found a previous renter, penalize them and reward the reporter
            if (violatorId) {
                // Penalize violator
                await tx.walletTransaction.create({
                    data: {
                        userId: violatorId,
                        amount: -penaltyAmount,
                        type: TransactionType.COMPENSATION,
                        description: `Penalty for late departure at spot ${data.spotId}`
                    }
                });
                await tx.user.update({
                    where: { id: violatorId },
                    data: {
                        walletBalance: { decrement: penaltyAmount },
                        trustScore: { decrement: 15 }
                    }
                });

                // Reward reporter (Next Renter Inspector credit)
                await tx.walletTransaction.create({
                    data: {
                        userId: reporterId,
                        amount: rewardAmount,
                        type: TransactionType.COMPENSATION,
                        description: `Reward for reporting an occupied spot as the next renter`
                    }
                });
                await tx.user.update({
                    where: { id: reporterId },
                    data: { walletBalance: { increment: rewardAmount } }
                });
            }

            // Auto-refund and cancel the reporter's booking if they couldn't park
            if (reporterBooking) {
                await tx.booking.update({
                    where: { id: reporterBooking.id },
                    data: { status: BookingStatus.CANCELLED }
                });

                // Refund the booking amount
                await tx.walletTransaction.create({
                    data: {
                        userId: reporterId,
                        amount: reporterBooking.totalPrice,
                        type: TransactionType.REFUND,
                        description: `Refund for cancelled booking due to occupied spot`
                    }
                });
                await tx.user.update({
                    where: { id: reporterId },
                    data: { walletBalance: { increment: reporterBooking.totalPrice } }
                });
            }

            return newIncident;
        });

        return incident;
    }
}
