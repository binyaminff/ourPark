import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})
// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

import authRoutes from './routes/auth.routes';
import spotRoutes from './routes/spot.routes';
import bookingRoutes from './routes/booking.routes';
import incidentRoutes from './routes/incident.routes';
import locationRoutes from './routes/location.routes';
import bountyRoutes from './routes/bounty.routes';
import subscriptionRoutes from './routes/subscription.routes';

app.use('/auth', authRoutes);
app.use('/spots', spotRoutes);
app.use('/bookings', bookingRoutes);
app.use('/incidents', incidentRoutes);
app.use('/location', locationRoutes);
app.use('/bounties', bountyRoutes);
app.use('/subscriptions', subscriptionRoutes);

// Routes
app.get('/', (_req: Request, res: Response) => {

    res.json({ message: 'Private Parking Rental API is running 🚀' });
});

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', stack: err.stack, msg: err.message });
});

export default app;
