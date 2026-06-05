import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use computer's LAN IP dynamically to allow access from physical devices and emulator
const getBaseUrl = () => {
    if (Platform.OS === 'web') return 'http://localhost:3000';
    
    // Expo Go provides the host URI (e.g. 192.168.1.112:8081)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        return `http://${ip}:3000`;
    }
    
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
    return 'http://localhost:3000'; // Default
};

const BASE_URL = getBaseUrl();

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;
