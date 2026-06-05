import api from './api';

export interface SubscriptionPlan {
    id: string;
    spotId: string;
    ownerId: string;
    isActive: boolean;
    type: 'FIXED_SCHEDULE' | 'FLEXIBLE_PASS';
    monthlyPrice: number;
    occurrencesPerMonth?: number;
    specificDays: string[];
    startTime?: string;
    endTime?: string;
}

export interface SubscriptionOffer {
    id: string;
    spotId: string;
    creatorId: string;
    targetUserId: string;
    type: 'FIXED_SCHEDULE' | 'FLEXIBLE_PASS';
    monthlyPrice: number;
    occurrencesPerMonth?: number;
    specificDays: string[];
    startTime?: string;
    endTime?: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    spot?: any;
    creator?: any;
    targetUser?: any;
}

export const subscriptionService = {
    // ---- PLANS ----
    createPlan: async (data: Partial<SubscriptionPlan>) => {
        const response = await api.post('/subscriptions/plans', data);
        return response.data;
    },

    getSpotPlans: async (spotId: string) => {
        const response = await api.get(`/subscriptions/spots/${spotId}/plans`);
        return response.data as SubscriptionPlan[];
    },

    subscribeToPlan: async (planId: string) => {
        const response = await api.post(`/subscriptions/plans/${planId}/subscribe`);
        return response.data;
    },

    // ---- OFFERS (Negotiation) ----
    createOffer: async (data: Partial<SubscriptionOffer>) => {
        const response = await api.post('/subscriptions/offers', data);
        return response.data;
    },

    getMyOffers: async () => {
        const response = await api.get('/subscriptions/offers');
        return response.data as SubscriptionOffer[];
    },

    respondToOffer: async (offerId: string, accept: boolean) => {
        const response = await api.post(`/subscriptions/offers/${offerId}/respond`, { accept });
        return response.data;
    },

    // ---- MY SUBSCRIPTIONS ----
    getMySubscriptions: async () => {
        const response = await api.get('/subscriptions');
        return response.data;
    }
};
