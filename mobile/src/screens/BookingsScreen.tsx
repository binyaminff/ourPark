import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../services/api';
import { Card } from '../components/Card';
import { CustomButton } from '../components/CustomButton';
import { CustomInput } from '../components/CustomInput';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../services/LocationTaskService';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function BookingsScreen({ navigation }: any) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/bookings/my-bookings');
            setBookings(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleStartParking = async (bookingId: string) => {
        setActionLoading(true);
        try {
            await api.post(`/bookings/${bookingId}/start`);

            // Start background location tracking on successful check-in
            await startBackgroundLocationTracking();

            Alert.alert('צ\'ק-אין בוצע', 'התחלתם את החניה בהצלחה.');
            setVerifyingId(null);
            fetchBookings();
        } catch (error: any) {
            console.error(error);
            Alert.alert('התחלה נכשלה', error.response?.data?.error || 'קוד לא תקין או שגיאת שרת');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStopParking = async (bookingId: string) => {
        setActionLoading(true);
        try {
            // Virtual Handshake: Prove they have left the spot
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('הגישה למיקום נדחתה', 'אנו צריכים אישור מיקום כדי לוודא שעזבת את החניה.');
                setActionLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;

            await api.post(`/bookings/${bookingId}/end`, { lat, lng });

            // Stop tracking on checkout
            await stopBackgroundLocationTracking();

            Alert.alert('החניה הסתיימה', 'החניה הסתיימה בהצלחה. המשך יום נעים!');
            fetchBookings();
        } catch (error: any) {
            console.error(error);
            Alert.alert('צ\'ק-אאוט נכשל', error.response?.data?.error || 'סיום החניה נכשל');
        } finally {
            setActionLoading(false);
        }
    };

    const handleNavigate = (lat: number, lng: number, title?: string) => {
        if (!lat || !lng) {
            Alert.alert('מיקום לא זמין', 'אין קואורדינטות זמינות עבור חניה זו.');
            return;
        }
        navigation.navigate('Home', {
            navigationTarget: {
                latitude: lat,
                longitude: lng,
                title: title || 'חניה'
            }
        });
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>לא נמצאו הזמנות פעילות.</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.headerTitle}>ההזמנות שלי</Text>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={bookings}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={renderEmpty}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Card style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.spotTitle} numberOfLines={1}>
                                        {item.spot?.title || 'חניה לא ידועה'}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        item.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusPending
                                    ]}>
                                        <Text style={styles.statusText}>{
                                            item.status === 'CONFIRMED' ? 'מאושר' :
                                                item.status === 'PENDING' ? 'ממתין' :
                                                    item.status === 'ACTIVE' ? 'פעיל' :
                                                        item.status === 'COMPLETED' ? 'הושלם' :
                                                            item.status === 'CANCELLED' ? 'בוטל' : item.status
                                        }</Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.detailsRow}>
                                    <Text style={styles.label}>זמן:</Text>
                                    <Text style={styles.value}>
                                        {formatDate(item.startTime)} - {formatDate(item.endTime)}
                                    </Text>
                                </View>

                                <View style={styles.detailsRow}>
                                    <Text style={styles.label}>סה"כ לתשלום:</Text>
                                    <Text style={styles.priceValue}>₪{item.totalPrice}</Text>
                                </View>

                                {item.spot?.dailyVerificationCode && ['PENDING', 'ACTIVE'].includes(item.status) && (
                                    <View style={styles.codeContainer}>
                                        <Text style={styles.codeLabel}>קוד גישה:</Text>
                                        <Text style={styles.codeValue}>{item.spot.dailyVerificationCode}</Text>
                                    </View>
                                )}

                                {item.status === 'PENDING' && (
                                    <View style={styles.actionContainer}>
                                        {verifyingId === item.id ? (
                                            <View>
                                                <Text style={styles.confirmText}>האם הגעת לחניה?</Text>
                                                <View style={styles.row}>
                                                    <CustomButton
                                                        title="ביטול"
                                                        variant="secondary"
                                                        style={styles.halfBtn}
                                                        onPress={() => setVerifyingId(null)}
                                                    />
                                                    <CustomButton
                                                        title="אישור הגעה"
                                                        style={styles.halfBtn}
                                                        isLoading={actionLoading}
                                                        onPress={() => handleStartParking(item.id)}
                                                    />
                                                </View>
                                            </View>
                                        ) : (
                                            <View>
                                                <View style={styles.row}>
                                                    <CustomButton
                                                        title="דווח תפוס"
                                                        variant="secondary"
                                                        style={[styles.halfBtn, { borderColor: colors.error }]}
                                                        textStyle={{ color: colors.error }}
                                                        onPress={() => navigation.navigate('ReportIncident', { spot: item.spot })}
                                                    />
                                                    <CustomButton
                                                        title="התחל חניה"
                                                        style={styles.halfBtn}
                                                        onPress={() => setVerifyingId(item.id)}
                                                    />
                                                </View>
                                                <CustomButton
                                                    title="נווט לחניה"
                                                    variant="outline"
                                                    style={{ marginTop: spacing.sm }}
                                                    onPress={() => handleNavigate(item.spot?.latitude, item.spot?.longitude, item.spot?.title)}
                                                />
                                            </View>
                                        )}
                                    </View>
                                )}

                                {item.status === 'ACTIVE' && (
                                    <View style={styles.actionContainer}>
                                        <CustomButton
                                            title="נווט לחניה"
                                            variant="outline"
                                            style={{ marginBottom: spacing.sm }}
                                            onPress={() => handleNavigate(item.spot?.latitude, item.spot?.longitude, item.spot?.title)}
                                        />
                                        <CustomButton
                                            title="סיים חניה עכשיו"
                                            variant="secondary"
                                            isLoading={actionLoading}
                                            onPress={() => handleStopParking(item.id)}
                                        />
                                        <Text style={styles.helpText}>אנו נאמת את מיקומך כדי לאשר עזיבה.</Text>
                                    </View>
                                )}

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
    headerTitle: {
        ...typography.h1,
        color: colors.text,
        marginVertical: spacing.lg,
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
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...typography.body,
        color: colors.textLight,
    },
    card: {
        marginBottom: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
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
        backgroundColor: colors.border,
    },
    statusConfirmed: {
        backgroundColor: colors.success + '20', // 20% opacity
    },
    statusPending: {
        backgroundColor: colors.warning + '20',
    },
    statusText: {
        ...typography.caption,
        fontWeight: 'bold',
        color: colors.text,
        textTransform: 'capitalize',
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
        marginVertical: spacing.xs,
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
    priceValue: {
        ...typography.body,
        color: colors.primary,
        fontWeight: 'bold',
    },
    actionContainer: {
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    halfBtn: {
        width: '48%',
    },
    helpText: {
        ...typography.caption,
        color: colors.textLight,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    confirmText: {
        ...typography.body,
        textAlign: 'center',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    codeContainer: {
        backgroundColor: colors.primaryLight + '30',
        padding: spacing.sm,
        borderRadius: 8,
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codeLabel: {
        ...typography.body,
        fontWeight: 'bold',
        color: colors.primaryDark,
    },
    codeValue: {
        ...typography.h3,
        color: colors.primaryDark,
        letterSpacing: 2,
    }
});
