import { prisma } from '../prisma/client';
import { BookingStatus } from '@prisma/client';

export class BookingService {
    async createBooking(renterId: string, data: any) {
        // Check spot availability
        // simple check: overlapping bookings
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);

        // Validate times
        if (start >= end) throw new Error('Start time must be before end time');

        const overlapping = await prisma.booking.findFirst({
            where: {
                spotId: data.spotId,
                status: BookingStatus.ACTIVE,
                OR: [
                    { startTime: { lt: end }, endTime: { gt: start } }
                ]
            }
        });

        if (overlapping) throw new Error('Spot is already booked for this time');

        // Calculate price
        const spot = await prisma.parkingSpot.findUnique({ where: { id: data.spotId } });
        if (!spot) throw new Error('Spot not found');

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const totalPrice = durationHours * spot.pricePerHour;

        // Verify the user exists
        const user = await prisma.user.findUnique({ where: { id: renterId } });
        if (!user) throw new Error('User not found');

        // Dynamic Security Deposit based on Trust Score (0-100)
        // E.g., Max deposit is 50% of total price for 0 score, 0% for 100 score.
        const trustFactor = Math.max(0, Math.min(100, user.trustScore)) / 100;
        const securityDeposit = totalPrice * 0.5 * (1 - trustFactor);

        // Create booking and attach external payment if available
        return prisma.booking.create({
            data: {
                renterId,
                spotId: data.spotId,
                startTime: start,
                endTime: end,
                totalPrice,
                securityDeposit,
                status: BookingStatus.ACTIVE,
                ...(data.paymentId ? {
                    payment: {
                        create: {
                            amount: totalPrice,
                            stripePaymentId: data.paymentId,
                            status: 'succeeded'
                        }
                    }
                } : {})
            }
        });
    }

    async endBooking(bookingId: string, userId: string, lat?: number, lng?: number) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { spot: true }
        });
        if (!booking || booking.renterId !== userId) throw new Error('Booking not found');

        // Virtual Handshake GPS validation
        if (lat !== undefined && lng !== undefined) {
            const R = 6371e3; // metres
            const φ1 = booking.spot.latitude * Math.PI / 180; // φ, λ in radians
            const φ2 = lat * Math.PI / 180;
            const Δφ = (lat - booking.spot.latitude) * Math.PI / 180;
            const Δλ = (lng - booking.spot.longitude) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const distance = R * c; // in metres

            if (distance < 50) {
                throw new Error('You are still too close to the parking spot. Please leave the area before stopping the session to complete the Virtual Handshake.');
            }
        }

        // In real world, calculate overstay penalties if applicable
        return prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: BookingStatus.COMPLETED,
                checkoutLat: lat,
                checkoutLng: lng
            }
        });
    }
    async getUserBookings(userId: string) {
        return prisma.booking.findMany({
            where: { renterId: userId },
            include: { spot: true }, // Include spot details
            orderBy: { startTime: 'desc' }
        });
    }
}
