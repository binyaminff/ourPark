import { Request, Response } from 'express';
import { SpotService } from '../services/spot.service';
import { z } from 'zod';

const spotService = new SpotService();

const createSpotSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    address: z.string(),
    pricePerHour: z.number().positive(),
    proofOfOwnership: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    images: z.array(z.string()).optional(),
    availableDays: z.array(z.string()).optional(),
    availableStartTime: z.string().optional(),
    availableEndTime: z.string().optional(),
});

const updateSpotSchema = z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    pricePerHour: z.number().positive().optional(),
    availableDays: z.array(z.string()).optional(),
    availableStartTime: z.string().optional(),
    availableEndTime: z.string().optional(),
});

export class SpotController {
    async create(req: Request, res: Response) {
        try {
            // @ts-ignore - user is added by auth middleware
            const ownerId = req.user?.id;
            if (!ownerId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const data = createSpotSchema.parse(req.body);

            // Geocode the address using Nominatim (OpenStreetMap) if not provided
            let latitude = data.latitude || 0;
            let longitude = data.longitude || 0;

            if (!latitude || !longitude) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.address)}`, {
                        headers: {
                            'User-Agent': 'ParkingRentalApp-Backend/1.0',
                            'Accept-Language': 'en-US,en;q=0.9,he;q=0.8'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const geoData: any[] = await response.json() as any[];
                    if (geoData && geoData.length > 0) {
                        latitude = parseFloat(geoData[0].lat);
                        longitude = parseFloat(geoData[0].lon);
                    } else {
                        res.status(400).json({ error: 'Could not find coordinates for this address.' });
                        return;
                    }
                } catch (err: any) {
                    console.error('Geocoding error:', err.message);
                    res.status(500).json({ error: 'Failed to geocode address' });
                    return;
                }
            }

            const spotPayload = {
                ...data,
                availableDays: data.availableDays || [],
                latitude,
                longitude,
            };

            const spot = await spotService.createSpot(ownerId, spotPayload);
            res.status(201).json(spot);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    async update(req: Request, res: Response) {
        try {
            // @ts-ignore
            const ownerId = req.user?.id;
            const spotId = String(req.params.id);

            if (!ownerId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const spot = await spotService.getSpotById(spotId);
            if (!spot) {
                res.status(404).json({ error: 'Spot not found' });
                return;
            }

            if (spot.ownerId !== ownerId) {
                res.status(403).json({ error: 'You do not own this spot' });
                return;
            }

            const data = updateSpotSchema.parse(req.body);

            const updatedSpot = await spotService.updateSpot(spotId, data);
            res.json(updatedSpot);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    async search(req: Request, res: Response) {
        try {
            const lat = parseFloat(req.query.lat as string);
            const lng = parseFloat(req.query.lng as string);

            if (isNaN(lat) || isNaN(lng)) {
                res.status(400).json({ error: 'Invalid coordinates' });
                return;
            }

            const spots = await spotService.searchSpots(lat, lng);
            res.json(spots);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getMySpots(req: Request, res: Response) {
        try {
            // @ts-ignore
            const ownerId = req.user?.id;
            if (!ownerId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const spots = await spotService.getSpotsByOwnerId(ownerId);
            res.json(spots);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const spot: any = await spotService.getSpotById(String(req.params.id));
            if (!spot) {
                res.status(404).json({ error: 'Spot not found' });
                return;
            }
            res.json(spot);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async toggleAvailability(req: Request, res: Response) {
        try {
            // @ts-ignore - user is added by auth middleware
            const ownerId = req.user?.id;
            const spotId = String(req.params.id);

            if (!ownerId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const spot = await spotService.getSpotById(spotId);

            if (!spot) {
                res.status(404).json({ error: 'Spot not found' });
                return;
            }

            if (spot.ownerId !== ownerId) {
                res.status(403).json({ error: 'You do not own this spot' });
                return;
            }

            const updatedSpot = await spotService.updateSpot(spotId, {
                isAvailable: !spot.isAvailable
            });

            res.json(updatedSpot);
            return;
        } catch (error: any) {
            res.status(500).json({ error: error.message });
            return;
        }
    }
}
