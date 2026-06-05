import { AuthService } from './src/services/auth.service';

const authService = new AuthService();

async function run() {
    try {
        await authService.register({
            email: 'test' + Date.now() + '@test.com',
            password: 'password',
            name: 'test'
        });
        console.log("Success");
    } catch (e: any) {
        console.error("Error occurred:", e);
    }
}

run();
