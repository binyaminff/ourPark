import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { subscriptionService, SubscriptionOffer } from '../services/subscription.service';
import { CustomButton } from '../components/CustomButton';
import { useAuthStore } from '../store/authStore';

export default function OffersScreen() {
    const navigation = useNavigation();
    const user = useAuthStore((state: any) => state.user);

    const [offers, setOffers] = useState<SubscriptionOffer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOffers();
    }, []);

    const loadOffers = async () => {
        try {
            setLoading(true);
            const data = await subscriptionService.getMyOffers();
            setOffers(data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to load offers');
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (offerId: string, accept: boolean) => {
        try {
            await subscriptionService.respondToOffer(offerId, accept);
            Alert.alert('Success', `Offer ${accept ? 'Accepted' : 'Rejected'}`);
            loadOffers();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to respond to offer');
        }
    };

    const renderOffer = ({ item }: { item: SubscriptionOffer }) => {
        const isTarget = item.targetUserId === user?.id;

        return (
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>{item.spot?.title || 'Parking Spot'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <Text style={styles.typeLabel}>
                        {item.type === 'FIXED_SCHEDULE' ? 'Fixed Schedule' : 'Flexible Pass'}
                    </Text>
                    <Text style={styles.price}>₪{item.monthlyPrice}/mo</Text>
                </View>

                {item.type === 'FIXED_SCHEDULE' && (
                    <Text style={styles.subtext}>
                        Days: {item.specificDays?.join(', ') || 'None'}
                    </Text>
                )}

                {item.type === 'FLEXIBLE_PASS' && (
                    <Text style={styles.subtext}>
                        {item.occurrencesPerMonth} visits/month
                    </Text>
                )}

                <Text style={styles.roleText}>
                    {isTarget ? `From: ${item.creator?.name || 'User'}` : `To: ${item.targetUser?.name || 'Owner'}`}
                </Text>

                {isTarget && item.status === 'PENDING' && (
                    <View style={styles.actions}>
                        <CustomButton
                            title="Reject"
                            variant="outline"
                            style={{ flex: 1, marginRight: 5 }}
                            onPress={() => handleRespond(item.id, false)}
                        />
                        <CustomButton
                            title="Accept"
                            style={{ flex: 1, marginLeft: 5 }}
                            onPress={() => handleRespond(item.id, true)}
                        />
                    </View>
                )}
            </View>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return colors.warning;
            case 'ACCEPTED': return colors.success;
            case 'REJECTED': return colors.error;
            case 'CANCELLED': return colors.textLight;
            default: return colors.primary;
        }
    };

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={offers}
                keyExtractor={(item) => item.id}
                renderItem={renderOffer}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>You don't have any subscription negotiations.</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContainer: { padding: 20 },
    card: {
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    typeLabel: { fontSize: 16, color: colors.text },
    price: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    subtext: { fontSize: 14, color: colors.textLight, marginBottom: 8 },
    roleText: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', marginBottom: 15 },
    actions: { flexDirection: 'row', marginTop: 10 },
    emptyText: { textAlign: 'center', color: colors.textLight, marginTop: 50 },
});
