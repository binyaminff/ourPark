import { AuthController } from './src/controllers/auth.controller';

const authController = new AuthController();

async function run() {
    const req: any = {
        body: {
            email: 'test' + Date.now() + '@test.com',
            password: 'password',
            name: 'test'
        }
    };
    const res: any = {
        status: (code: number) => {
            console.log("status called with:", code);
            return res;
        },
        json: (data: any) => {
            console.log("json called with:", data);
            return res;
        }
    };

    try {
        await authController.register(req, res);
    } catch (e: any) {
        console.error("Error thrown by register:", e);
    }
}

run();
