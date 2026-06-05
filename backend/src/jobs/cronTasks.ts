import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Run every minute to check for expired bookings
export const setupCronJobs = () => {
    cron.schedule('* * * * *', async () => {
        console.log('[CRON] Checking for expired bookings...');
        try {
            const now = new Date();
            const result = await prisma.booking.updateMany({
                where: {
                    status: 'ACTIVE',
                    endTime: {
                        lt: now
                    }
                },
                data: {
                    status: 'COMPLETED'
                }
            });

            if (result.count > 0) {
                console.log(`[CRON] Automatically completed ${result.count} expired bookings.`);
            }
        } catch (error) {
            console.error('[CRON Error] Failed to complete expired bookings:', error);
        }
    });
};
