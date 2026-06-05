import { prisma } from '../prisma/client';
import { ParkingSpot, User } from '@prisma/client';

export class SpotService {
    async createSpot(ownerId: string, data: any) {
        return prisma.parkingSpot.create({
            data: {
                ownerId,
                title: data.title,
                description: data.description,
                address: data.address,
                latitude: parseFloat(data.latitude),
                longitude: parseFloat(data.longitude),
                pricePerHour: parseFloat(data.pricePerHour),
                proofOfOwnership: data.proofOfOwnership,
                images: data.images || [],
                availableDays: data.availableDays,
                availableStartTime: data.availableStartTime,
                availableEndTime: data.availableEndTime,
            },
        });
    }

    async updateSpot(id: string, data: any) {
        return prisma.parkingSpot.update({
            where: { id },
            data,
        });
    }

    async searchSpots(lat: number, lng: number, radiusKm: number = 10) {
        // Basic bounding box approximation for MVP
        // 1 deg lat ~= 111km, 1 deg lng ~= 111km * cos(lat)
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));

        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLng = lng - lngDelta;
        const maxLng = lng + lngDelta;

        return prisma.parkingSpot.findMany({
            where: {
                isAvailable: true,
                latitude: {
                    gte: minLat,
                    lte: maxLat,
                },
                longitude: {
                    gte: minLng,
                    lte: maxLng,
                },
                // Do not return spots that have a currently ACTIVE booking
                bookings: {
                    none: {
                        status: 'ACTIVE'
                    }
                }
            },
        });
    }

    async getSpotsByOwnerId(ownerId: string) {
        return prisma.parkingSpot.findMany({
            where: { ownerId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getSpotById(id: string) {
        return prisma.parkingSpot.findUnique({
            where: { id },
            include: { owner: { select: { name: true, trustScore: true } } },
        });
    }
}
