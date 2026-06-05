import { create } from 'zustand';
import { setAuthToken } from '../services/api';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login: (user, token) => {
        setAuthToken(token);
        set({ user, token, isAuthenticated: true });
    },
    logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
    },
}));
