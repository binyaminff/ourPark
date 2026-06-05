import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const authService = new AuthService();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    role: z.enum(['RENTER', 'OWNER', 'ADMIN']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export class AuthController {
    async register(req: Request, res: Response) {
        try {
            const data = registerSchema.parse(req.body);
            const responseData = await authService.register(data);

            res.status(201).json(responseData);
            return;
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    }

    async login(req: Request, res: Response) {
        try {
            const data = loginSchema.parse(req.body);
            const result = await authService.login(data);
            console.log(result);
            res.json(result);
            return;
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(401).json({ error: error.message });
            }
            return;
        }
    }

    async verifyEmail(req: Request, res: Response) {
        try {
            const { email, code } = req.body;
            if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

            const user = await authService.verifyEmail(email, code);
            res.json({ message: 'Email verified successfully', user });
            return;
        } catch (error: any) {
            res.status(400).json({ error: error.message });
            return;
        }
    }
}
