import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { Card } from '../components/Card';
import { CustomButton } from '../components/CustomButton';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function MySpotsScreen({ navigation }: any) {
    const [spots, setSpots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchMySpots();
        }, [])
    );

    const fetchMySpots = async () => {
        setLoading(true);
        try {
            const response = await api.get('/spots/my-spots');
            setSpots(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('שגיאה', 'טעינת החניות שלך נכשלה.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAvailability = async (spotId: string, currentStatus: boolean) => {
        try {
            await api.post(`/spots/${spotId}/toggle-availability`);
            // Optimistically update UI
            setSpots(prev =>
                prev.map(spot =>
                    spot.id === spotId ? { ...spot, isAvailable: !currentStatus } : spot
                )
            );
        } catch (error: any) {
            console.error(error);
            Alert.alert('שגיאה', error.response?.data?.error || 'שינוי זמינות החניה נכשל');
        }
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="car-sport-outline" size={64} color={colors.border} />
            <Text style={styles.emptyText}>עדיין לא פרסמת חניות.</Text>
            <CustomButton
                title="פרסם חניה ראשונה"
                onPress={() => navigation.navigate('AddSpot')}
                style={styles.emptyButton}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>החניות שלי</Text>
                    {spots.length > 0 && (
                        <CustomButton
                            title="+ הוסף חניה"
                            size="small"
                            onPress={() => navigation.navigate('AddSpot')}
                            variant="primary"
                            style={styles.headerButton}
                        />
                    )}
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={spots}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={renderEmpty}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Card style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.spotTitle} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        item.isAvailable ? styles.statusActive : styles.statusInactive
                                    ]}>
                                        <Text style={styles.statusText}>
                                            {item.isAvailable ? 'פעיל' : 'לא פעיל'}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>

                                <View style={styles.divider} />

                                <View style={styles.detailsRow}>
                                    <Text style={styles.label}>מחיר:</Text>
                                    <Text style={styles.value}>₪{item.pricePerHour}/שעה</Text>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Text style={styles.label}>קוד אימות יומי:</Text>
                                    <Text style={styles.value}>{item.dailyVerificationCode || 'אין דורש'}</Text>
                                </View>

                                <View style={styles.actionRow}>
                                    <CustomButton
                                        title={item.isAvailable ? "השהה פרסום" : "הפעל שוב"}
                                        variant="secondary"
                                        size="small"
                                        style={styles.actionBtn}
                                        onPress={() => handleToggleAvailability(item.id, item.isAvailable)}
                                    />
                                    <View style={styles.spacer} />
                                    <CustomButton
                                        title="ערוך פרטים"
                                        size="small"
                                        style={styles.actionBtn}
                                        onPress={() => navigation.navigate('EditSpot', { spot: item })}
                                    />
                                </View>
                            </Card>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    headerTitle: {
        ...typography.h1,
        color: colors.text,
    },
    headerButton: {
        marginLeft: spacing.sm,
    },
    listContent: {
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: spacing.xxl,
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyText: {
        ...typography.body,
        color: colors.textLight,
        marginVertical: spacing.md,
        textAlign: 'center',
    },
    emptyButton: {
        marginTop: spacing.md,
        minWidth: 200,
    },
    card: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    spotTitle: {
        ...typography.h3,
        color: colors.text,
        flex: 1,
        marginRight: spacing.sm,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
    },
    statusActive: {
        backgroundColor: colors.success + '20',
    },
    statusInactive: {
        backgroundColor: colors.error + '20',
    },
    statusText: {
        ...typography.caption,
        fontWeight: 'bold',
        color: colors.text,
    },
    addressText: {
        ...typography.bodySmall,
        color: colors.textLight,
        marginBottom: spacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    label: {
        ...typography.bodySmall,
        color: colors.textLight,
    },
    value: {
        ...typography.bodySmall,
        color: colors.text,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    actionBtn: {
        flex: 1,
    },
    spacer: {
        width: spacing.sm,
    }
});
