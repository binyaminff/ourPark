import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { z } from 'zod';

const pingSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
});

export class LocationController {
    async recordPing(req: Request, res: Response) {
        try {
            // @ts-ignore - user is added by auth middleware
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const data = pingSchema.parse(req.body);

            // Create background location ping
            const ping = await prisma.locationPing.create({
                data: {
                    userId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    accuracy: data.accuracy,
                }
            });

            // TODO: In a real app, process this ping synchronously or asynchronously 
            // to check if a booking just ended and they are still there (Penalty Logic)

            res.status(201).json({ success: true, pingId: ping.id });
            return;
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
                return;
            }
            res.status(500).json({ error: error.message });
            return;
        }
    }
}
