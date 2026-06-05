import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../services/api';
import { Card } from '../components/Card';
import { CustomButton } from '../components/CustomButton';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function BountyListScreen({ navigation }: any) {
    const [bounties, setBounties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchBounties();
        }, [])
    );

    const fetchBounties = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('נדרשת הרשאה', 'נדרש אישור מיקום כדי למצוא בקשות חניה באזור.');
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            const response = await api.get(`/bounties?lat=${latitude}&lng=${longitude}`);
            setBounties(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>אין בקשות חניה באזור שלך כרגע.</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>בקשות חניה / משימות</Text>
                    <Text style={styles.headerSubtitle}>הרווח כסף מאימות חניות פנויות</Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={bounties}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={renderEmpty}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Card style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.spotTitle}>{item.spot?.title || 'חניה לא ידועה'}</Text>
                                        <Text style={styles.rewardText}>תגמול: ₪{item.rewardAmount.toFixed(2)}</Text>
                                    </View>
                                </View>
                                <CustomButton
                                    title="צפה במשימה"
                                    onPress={() => navigation.navigate('BountyDetail', { bounty: item })}
                                />
                            </Card>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, paddingHorizontal: spacing.lg },
    header: { marginVertical: spacing.lg },
    headerTitle: { ...typography.h1, color: colors.text },
    headerSubtitle: { ...typography.body, color: colors.textLight, marginTop: spacing.xs },
    listContent: { paddingBottom: spacing.xxl },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { marginTop: spacing.xl, alignItems: 'center' },
    emptyText: { ...typography.body, color: colors.textLight, textAlign: 'center' },
    card: { marginBottom: spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    spotTitle: { ...typography.h3, color: colors.text },
    rewardText: { ...typography.body, color: colors.success, fontWeight: 'bold', marginTop: spacing.xs },
});
