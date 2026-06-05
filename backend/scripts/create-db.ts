
// @ts-nocheck
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env to get credentials
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath, override: true });

// Parse URL to get base connection params (ignoring database name)
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

// Construct connection string to 'postgres' database (default maintenance db)
const urlParts = new URL(dbUrl);
urlParts.pathname = '/postgres';
const postgresUrl = urlParts.toString();

console.log('Connecting to maintenance database...');

const client = new Client({
    connectionString: postgresUrl,
});

async function createDb() {
    try {
        await client.connect();

        // Check if db exists
        const checkRes = await client.query("SELECT 1 FROM pg_database WHERE datname = 'parking_db'");
        if (checkRes.rowCount > 0) {
            console.log('✅ Database parking_db already exists.');
        } else {
            console.log('Creating database parking_db...');
            await client.query('CREATE DATABASE parking_db');
            console.log('✅ Database parking_db created successfully!');
        }
    } catch (err: any) {
        console.error('❌ Failed to create database:', err.message);
        if (err.code) console.error('Error code:', err.code);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createDb();
