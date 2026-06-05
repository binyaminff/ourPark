// @ts-nocheck
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
console.log('__dirname:', __dirname);
console.log('Looking for .env at:', envPath);

try {
    const fs = require('fs');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log('--- .env content (first 100 chars) ---');
        console.log(envContent.substring(0, 100));
        console.log('--- end .env content ---');
    } else {
        console.log('❌ .env file NOT found at expected path!');
    }
} catch (e) {
    console.error('Error reading .env file:', e.message);
}

const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
    console.error('Dotenv error:', result.error);
}

console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
    try {
        console.log('Attempting to connect with:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));
        await client.connect();
        console.log('✅ Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err: any) {
        console.error('❌ Connection failed:', err.message);
        if (err.code) console.error('Error code:', err.code);
        process.exit(1);
    }
}

testConnection();
