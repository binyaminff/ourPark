import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { CustomButton } from '../components/CustomButton';
import { CustomInput } from '../components/CustomInput';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme/colors';

// Smart loading of useStripe to support both native Stripe & Expo Go/Web gracefully
let useStripeHook = () => {
    return {
        initPaymentSheet: async (params?: any) => ({ error: null as { message: string } | null }),
        presentPaymentSheet: async () => ({ error: null as { message: string } | null }),
    };
};
let isRealStripeAvailable = false;
try {
    const StripeModule = require('@stripe/stripe-react-native');
    useStripeHook = StripeModule.useStripe;
    isRealStripeAvailable = true;
} catch (e) {
    console.log('Stripe native module not loaded, using Mock useStripe.');
}
import { typography } from '../theme/typography';
import { subscriptionService, SubscriptionPlan } from '../services/subscription.service';
import MakeOfferScreen from './MakeOfferScreen';

export default function SpotDetailsScreen({ route, navigation }: any) {
    const { spot } = route.params;
    const [loading, setLoading] = useState(false);

    // Safely fallback defaults in case of cached old spot objects
    const minHours = spot.minBookingHours || 1;
    const maxHours = spot.maxBookingHours || 24;
    const [duration, setDuration] = useState(minHours);
    const [isAvailable, setIsAvailable] = useState(spot.isAvailable !== false); // Default to true if undefined
    const [newCode, setNewCode] = useState(spot.dailyVerificationCode || '');
    const [updatingCode, setUpdatingCode] = useState(false);

    // Subscription States
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [offerModalVisible, setOfferModalVisible] = useState(false);

    const isOwner = route.params?.currentUserId === spot.ownerId || spot.ownerId === "USER_ID_PLACEHOLDER_FOR_NOW";

    // Load plans
    React.useEffect(() => {
        loadPlans();
    }, [spot.id]);

    const loadPlans = async () => {
        try {
            const spotPlans = await subscriptionService.getSpotPlans(spot.id);
            setPlans(spotPlans);
        } catch (error) {
            console.error('Failed to load plans', error);
        }
    };

    const { initPaymentSheet, presentPaymentSheet } = useStripeHook();

    const handleBook = async () => {
        setLoading(true);
        let isMockFlow = false;
        try {
            const startTime = new Date().toISOString();
            const endTime = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
            const totalPrice = duration * spot.pricePerHour;

            // 1. Create Payment Intent
            const response = await api.post('/bookings/payment-intent', {
                spotId: spot.id,
                amount: totalPrice
            });

            const { paymentIntent, ephemeralKey, customer } = response.data;

            // Determine if we should run the simulated sheet or native sheet
            const isMockIntent = !paymentIntent || paymentIntent.startsWith('pi_mock_');
            isMockFlow = !isRealStripeAvailable || isMockIntent;

            if (isMockFlow) {
                // Premium simulated Google Pay payment sheet flow
                Alert.alert(
                    'תשלום באמצעות Google Pay (סימולציה)',
                    `האם ברצונך לאשר את התשלום בסך ₪${totalPrice.toFixed(2)} באמצעות כרטיס ברירת המחדל שלך ב-Google Pay?`,
                    [
                        {
                            text: 'ביטול',
                            style: 'cancel',
                            onPress: () => setLoading(false)
                        },
                        {
                            text: 'שלם עכשיו',
                            onPress: async () => {
                                // Simulate network delay to make the UI feel reactive
                                setTimeout(async () => {
                                    try {
                                        // 4. Confirm Booking
                                        await api.post('/bookings', {
                                            spotId: spot.id,
                                            startTime,
                                            endTime,
                                            paymentId: 'stripe_mock_confirmed'
                                        });
                                        setLoading(false);
                                        Alert.alert('הצלחה', 'ההזמנה אושרה! מנווט לחניה...', [
                                            {
                                                text: 'אישור',
                                                onPress: () => {
                                                    navigation.navigate('Home', {
                                                        navigationTarget: spot
                                                    });
                                                }
                                            }
                                        ]);
                                    } catch (err: any) {
                                        setLoading(false);
                                        Alert.alert('הזמנה נכשלה', err.response?.data?.error || 'אירעה שגיאה במהלך ההזמנה');
                                    }
                                }, 1500);
                            }
                        }
                    ]
                );
                return;
            }

            // 2. Initialize Payment Sheet (Real Stripe flow)
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'Private Parking',
                customerId: customer,
                customerEphemeralKeySecret: ephemeralKey,
                paymentIntentClientSecret: paymentIntent,
                googlePay: {
                    merchantCountryCode: 'IL',
                    currencyCode: 'ILS',
                    testEnv: false,
                },
            });

            if (initError) {
                Alert.alert('שגיאה', initError.message);
                setLoading(false);
                return;
            }

            // 3. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                Alert.alert('התשלום בוטל', paymentError.message);
            } else {
                // 4. Confirm Booking
                await api.post('/bookings', {
                    spotId: spot.id,
                    startTime,
                    endTime,
                    paymentId: 'stripe_confirmed'
                });
                Alert.alert('הצלחה', 'ההזמנה אושרה! מנווט לחניה...', [
                    {
                        text: 'אישור',
                        onPress: () => {
                            navigation.navigate('Home', {
                                navigationTarget: spot
                            });
                        }
                    }
                ]);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('הזמנה נכשלה', error.response?.data?.error || 'אירעה שגיאה במהלך ההזמנה');
        } finally {
            if (!isMockFlow) {
                setLoading(false);
            }
        }
    };

    const handleToggleAvailability = async () => {
        setLoading(true);
        try {
            const response = await api.post(`/spots/${spot.id}/toggle-availability`);
            setIsAvailable(response.data.isAvailable);
            Alert.alert('סטטוס עודכן', `החניה עכשיו ${response.data.isAvailable ? 'פעילה' : 'לא פעילה'}`);
            // Typically you might want to refresh the parent list here or let context handle it
        } catch (error: any) {
            console.error(error);
            Alert.alert('שגיאה', error.response?.data?.error || 'עדכון זמינות נכשל');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCode = async () => {
        if (!newCode) {
            Alert.alert('שגיאה', 'נא להזין קוד תקין');
            return;
        }
        setUpdatingCode(true);
        try {
            await api.put(`/spots/${spot.id}/code`, { code: newCode });
            Alert.alert('הצלחה', 'קוד הצ׳ק-אין היומי עודכן!');
        } catch (error: any) {
            console.error(error);
            Alert.alert('שגיאה', error.response?.data?.error || 'עדכון קוד נכשל');
        } finally {
            setUpdatingCode(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Card style={styles.mainCard}>
                    <Text style={styles.title}>{spot.title}</Text>
                    <Text style={styles.address}>{spot.address}</Text>

                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>₪{spot.pricePerHour}</Text>
                        <Text style={styles.priceUnit}>/לשעה</Text>
                    </View>

                    {/* Subscription Plans Section */}
                    {plans.length > 0 && (
                        <View style={styles.plansSection}>
                            <Text style={styles.sectionTitle}>מסלולי מנוי זמינים</Text>
                            {plans.map((plan) => (
                                <View key={plan.id} style={styles.planCard}>
                                    <View>
                                        <Text style={styles.planType}>{plan.type === 'FIXED_SCHEDULE' ? 'מסלול קבוע' : 'כרטיסיית כניסות'}</Text>
                                        {plan.type === 'FIXED_SCHEDULE' ? (
                                            <Text style={styles.planDesc}>{plan.specificDays.join(', ')}</Text>
                                        ) : (
                                            <Text style={styles.planDesc}>{plan.occurrencesPerMonth} כניסות בחודש</Text>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.planPrice}>₪{plan.monthlyPrice}</Text>
                                        {!isOwner && (
                                            <CustomButton title="הירשם למנוי" size="small" onPress={() => { }} style={{ marginTop: 5, paddingVertical: 5, minHeight: 30 }} />
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.durationContainer}>
                        <Text style={styles.durationLabel}>משך (בשעות)</Text>
                        <View style={styles.stepperContainer}>
                            <CustomButton
                                title="-"
                                onPress={() => setDuration(Math.max(minHours, duration - 1))}
                                disabled={duration <= minHours}
                                style={styles.stepperButton}
                                textStyle={{ fontSize: 20 }}
                            />
                            <Text style={styles.durationValue}>{duration}</Text>
                            <CustomButton
                                title="+"
                                onPress={() => setDuration(Math.min(maxHours, duration + 1))}
                                disabled={duration >= maxHours}
                                style={styles.stepperButton}
                                textStyle={{ fontSize: 20 }}
                            />
                        </View>
                    </View>

                    <View style={styles.totalPriceContainer}>
                        <Text style={styles.totalPriceLabel}>סה״כ:</Text>
                        <Text style={styles.totalPriceValue}>₪{(duration * spot.pricePerHour).toFixed(2)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>תיאור המקום</Text>
                    <Text style={styles.desc}>{spot.description}</Text>

                    {isOwner && (
                        <View style={styles.ownerPanel}>
                            <View style={styles.ownerHeaderRow}>
                                <View style={styles.ownerHeaderTitles}>
                                    <Text style={styles.sectionTitle}>לוח בקרה לבעלים</Text>
                                    <Text style={styles.desc}>עדכן את הקוד היומי לצורך צ׳ק-אין של שוכרים.</Text>
                                </View>
                                <View style={{ gap: 8 }}>
                                    <CustomButton
                                        title="ערוך פרטים"
                                        variant="outline"
                                        size="small"
                                        onPress={() => navigation.navigate('EditSpot', { spot })}
                                    />
                                    <CustomButton
                                        title="נהל מנויים"
                                        variant="outline"
                                        size="small"
                                        onPress={() => navigation.navigate('ManagePlans', { spotId: spot.id, spotTitle: spot.title })}
                                    />
                                </View>
                            </View>
                            <View style={styles.codeRow}>
                                <CustomInput
                                    label="קוד יומי"
                                    placeholder="לדוגמה: 123456"
                                    value={newCode}
                                    onChangeText={setNewCode}
                                    keyboardType="numeric"
                                    style={styles.codeInput}
                                />
                                <CustomButton
                                    title="שמור קוד"
                                    size="small"
                                    onPress={handleUpdateCode}
                                    isLoading={updatingCode}
                                    style={styles.saveCodeBtn}
                                />
                            </View>
                        </View>
                    )}
                </Card>

                <View style={styles.actionsContainer}>
                    {isOwner ? (
                        <CustomButton
                            title={isAvailable ? "הקפא חניה" : "הפעל חניה"}
                            onPress={handleToggleAvailability}
                            isLoading={loading}
                            style={[styles.bookButton, !isAvailable ? styles.activateButton : {}]}
                            variant={isAvailable ? "secondary" : "primary"}
                        />
                    ) : (
                        <CustomButton
                            title={`שלם ₪${(duration * spot.pricePerHour).toFixed(2)}`}
                            onPress={handleBook}
                            isLoading={loading}
                            style={styles.bookButton}
                            disabled={!isAvailable}
                        />
                    )}

                    <CustomButton
                        title="דווח עקב חניה תפוסה/לא במקום"
                        onPress={() => navigation.navigate('ReportIncident', { spot })}
                        variant="text"
                        textStyle={styles.reportText}
                    />

                    {!isOwner && (
                        <CustomButton
                            title="הצע הצעת מנוי אישית"
                            variant="outline"
                            onPress={() => setOfferModalVisible(true)}
                        />
                    )}
                </View>
            </ScrollView>

            <MakeOfferScreen
                visible={offerModalVisible}
                spotId={spot.id}
                onClose={() => setOfferModalVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flexGrow: 1,
        padding: spacing.lg,
    },
    mainCard: {
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    title: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    address: {
        ...typography.body,
        color: colors.textLight,
        marginBottom: spacing.md,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.md,
    },
    price: {
        ...typography.h2,
        color: colors.primary,
        fontWeight: 'bold',
    },
    priceUnit: {
        ...typography.body,
        color: colors.textLight,
        marginLeft: 4,
    },
    plansSection: {
        backgroundColor: colors.background,
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.md,
        marginTop: spacing.sm,
    },
    planCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    planType: {
        fontWeight: 'bold',
        fontSize: 16,
        color: colors.text,
    },
    planDesc: {
        fontSize: 13,
        color: colors.textLight,
        marginTop: 2,
    },
    planPrice: {
        fontWeight: 'bold',
        fontSize: 16,
        color: colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    desc: {
        ...typography.body,
        color: colors.textLight,
        lineHeight: 24,
    },
    actionsContainer: {
        marginTop: 'auto',
        gap: spacing.md,
    },
    bookButton: {
        marginBottom: spacing.xs,
    },
    activateButton: {
        backgroundColor: colors.success,
    },
    reportText: {
        color: colors.error,
    },
    durationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    durationLabel: {
        ...typography.h3,
        color: colors.text,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepperButton: {
        width: 40,
        height: 40,
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderRadius: 20,
    },
    durationValue: {
        ...typography.h3,
        color: colors.text,
        width: 40,
        textAlign: 'center',
    },
    totalPriceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        backgroundColor: colors.card,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
    },
    totalPriceLabel: {
        ...typography.body,
        fontWeight: 'bold',
        color: colors.text,
    },
    totalPriceValue: {
        ...typography.h2,
        color: colors.primary,
    },
    ownerPanel: {
        marginTop: spacing.xl,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    ownerHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    ownerHeaderTitles: {
        flex: 1,
        paddingRight: spacing.md,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    codeInput: {
        flex: 1,
        marginRight: spacing.md,
    },
    saveCodeBtn: {
        width: 120,
        marginBottom: spacing.xs,
    },
});
