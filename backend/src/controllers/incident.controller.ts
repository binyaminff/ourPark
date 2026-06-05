import { Request, Response } from 'express';
import { IncidentService } from '../services/incident.service';
import { z } from 'zod';

const incidentService = new IncidentService();

const reportIncidentSchema = z.object({
    spotId: z.string(),
    bookingId: z.string().optional(),
    description: z.string(),
    evidence: z.object({
        imageUrl: z.string().url(),
        latitude: z.number().optional(),
        longitude: z.number().optional()
    })
});

export class IncidentController {
    async report(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const data = reportIncidentSchema.parse(req.body);
            const incident = await incidentService.reportUnauthorized(userId, data);
            res.status(201).json(incident);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
}
