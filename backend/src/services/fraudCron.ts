import cron from 'node-cron';
import { prisma } from '../prisma/client';
import { BookingStatus } from '@prisma/client';

// Run every 15 minutes to check for overstayers
export const startFraudDetectionCron = () => {
    cron.schedule('*/15 * * * *', async () => {
        console.log('[CRON] Running Fraud / Overstay Detection Check...');
        try {
            const now = new Date();

            // Find bookings that have expired but haven't been completed 
            const activeExpiredBookings = await prisma.booking.findMany({
                where: {
                    status: BookingStatus.ACTIVE,
                    endTime: {
                        lt: now
                    }
                },
                include: {
                    spot: true,
                    renter: true
                }
            });

            for (const booking of activeExpiredBookings) {
                // Get the latest ping for this user
                const latestPing = await prisma.locationPing.findFirst({
                    where: { userId: booking.renterId },
                    orderBy: { createdAt: 'desc' }
                });

                if (latestPing) {
                    const R = 6371e3; // metres
                    const φ1 = booking.spot.latitude * Math.PI / 180; // φ, λ in radians
                    const φ2 = latestPing.latitude * Math.PI / 180;
                    const Δφ = (latestPing.latitude - booking.spot.latitude) * Math.PI / 180;
                    const Δλ = (latestPing.longitude - booking.spot.longitude) * Math.PI / 180;

                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    const distance = R * c;

                    // If they are still within 100 meters of the spot AND the booking is expired
                    if (distance < 100) {
                        console.log(`[FRAUD ALERT] User ${booking.renterId} is overstaying at Spot ${booking.spotId}!`);

                        // Calculate penalty (e.g. $10 flat rate per 15 mins block of overstay)
                        const overstayMinutes = (now.getTime() - booking.endTime.getTime()) / (1000 * 60);
                        const penaltyCalculation = Math.ceil(overstayMinutes / 15) * 10;

                        // Apply Penalty and reduce trust score
                        await prisma.$transaction([
                            prisma.booking.update({
                                where: { id: booking.id },
                                data: { penaltyAmount: booking.penaltyAmount + penaltyCalculation }
                            }),
                            prisma.user.update({
                                where: { id: booking.renterId },
                                data: {
                                    trustScore: Math.max(0, booking.renter.trustScore - 5) // Deduct 5 truth points
                                }
                            })
                        ]);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON Error]', error);
        }
    });
};
