import { prisma } from '../prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { emailService } from './email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// In-memory store for pending registrations. 
// For a production app at scale, use Redis.
const pendingRegistrations = new Map<string, { data: any, code: string, expiresAt: number }>();

export class AuthService {
    async register(data: any) {
        // Check if user already exists in DB
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) throw new Error('User already exists');

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

        // Store registration info temporarily
        pendingRegistrations.set(data.email, {
            data: {
                ...data,
                password: hashedPassword,
            },
            code: verificationCode,
            expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins expiration
        });

        // Send the real email
        try {
            await emailService.sendVerificationEmail(data.email, verificationCode);
        } catch (error) {
            console.error('Failed to send welcome email:', error);
            throw new Error('Could not send verification email. Please check your email address.');
        }

        return { message: 'Verification email sent' };
    }

    async login(data: any) {
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) throw new Error('Invalid credentials');

        const isValid = await bcrypt.compare(data.password, user.password);
        if (!isValid) throw new Error('Invalid credentials');

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        const { password, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    async verifyEmail(email: string, code: string) {
        const pending = pendingRegistrations.get(email);

        if (!pending) {
            throw new Error('No pending registration found for this email. Please register again.');
        }

        if (pending.code !== code) {
            throw new Error('Invalid verification code');
        }

        if (Date.now() > pending.expiresAt) {
            pendingRegistrations.delete(email);
            throw new Error('Verification code expired. Please register again.');
        }

        // Create the actual user in the DB now
        const user = await prisma.user.create({
            data: {
                email: pending.data.email,
                password: pending.data.password,
                name: pending.data.name,
                role: pending.data.role
            }
        });

        // Clear the pending registration
        pendingRegistrations.delete(email);

        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
