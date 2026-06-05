import app from './app';
import { PrismaClient } from '@prisma/client';
import { startFraudDetectionCron } from './services/fraudCron';
import { setupCronJobs } from './jobs/cronTasks';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const prisma = new PrismaClient();


const PORT = process.env.PORT || 3000;

async function main() {
    try {
        // We won't connect yet as we might not have a URL, but this is the structure
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Start Background Jobs
        startFraudDetectionCron();
        setupCronJobs();

        app.listen(Number(PORT), () => {
            console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Server failed to start:', error);
        process.exit(1);
    }
}

main();
