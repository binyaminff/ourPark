import nodemailer from 'nodemailer';

// You can use a real SMTP service like SendGrid, Mailgun, or Gmail here.
// For now, we use Ethereal Email which generates a fake mailbox automatically if real credentials aren't provided in .env.
export class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        this.initTransporter();
    }

    private async initTransporter() {
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                // Use real SMTP details provided in .env
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
                console.log('📧 Email service initialized with real SMTP credentials');
            } else {
                // Generate test SMTP service account from ethereal.email
                // Only needed if we don't have a real account to test with
                console.log('📧 Creating Ethereal Test Account for emails... Set SMTP variables in .env to use real emails.');
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: testAccount.user, // generated ethereal user
                        pass: testAccount.pass, // generated ethereal password
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
            }
        } catch (error) {
            console.error('Failed to initialize email transporter', error);
        }
    }

    async sendVerificationEmail(to: string, verificationCode: string) {
        if (!this.transporter) {
            console.warn('⚠️ Transporter not initialized yet. Trying to initialize now...');
            await this.initTransporter();
            if (!this.transporter) {
                console.error('❌ Failed to send email: No transporter available');
                return;
            }
        }

        try {
            const info = await this.transporter.sendMail({
                from: '"Private Parking App" <noreply@privateparkingapp.com>',
                to,
                subject: 'Your Registration Code - Private Parking App',
                text: `Welcome! Your verification code is: ${verificationCode}\n\nPlease enter this code in the app to verify your account.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; color: #333;">
                        <h2 style="color: #4CAF50;">Welcome to Private Parking!</h2>
                        <p>Your email verification code is:</p>
                        <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">${verificationCode}</h1>
                        <p>Please enter this code in the app to complete your registration.</p>
                        <br/>
                        <p style="font-size: 12px; color: #888;">If you didn't request this, please ignore this email.</p>
                    </div>
                `,
            });

            console.log('Message sent: %s', info.messageId);

            // Preview only available when sending through an Ethereal account
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('Preview URL: %s', previewUrl);
            }
        } catch (error) {
            console.error('❌ Error sending verification email', error);
            throw error;
        }
    }
}

export const emailService = new EmailService();
