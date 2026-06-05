import { Request, Response } from 'express';
import { BountyService } from '../services/bounty.service';
import { z } from 'zod';

const bountyService = new BountyService();

export class BountyController {
    async getAvailable(req: Request, res: Response) {
        try {
            const lat = parseFloat(req.query.lat as string);
            const lng = parseFloat(req.query.lng as string);

            if (isNaN(lat) || isNaN(lng)) {
                res.status(400).json({ error: 'Valid lat and lng query params required' });
                return;
            }

            const bounties = await bountyService.getAvailableBounties(lat, lng);
            res.json(bounties);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async claim(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            const bountyId = req.params.id;
            const bounty = await bountyService.claimBounty(userId, bountyId);
            res.json(bounty);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async submit(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            const bountyId = req.params.id;
            const { photoUrl } = z.object({ photoUrl: z.string().url() }).parse(req.body);

            const bounty = await bountyService.submitVerification(userId, bountyId, photoUrl);

            // For MVP, auto-resolve it as approved
            await bountyService.resolveBounty(bountyId, true);

            res.json({ message: 'Bounty submitted and verified successfully', bounty });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    }
}
