import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { subscriptionService, SubscriptionPlan } from '../services/subscription.service';
import { CustomButton } from '../components/CustomButton';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function ManagePlansScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { spotId, spotTitle } = route.params as any;
    const { t } = useTranslation();

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form state
    const [type, setType] = useState<'FIXED_SCHEDULE' | 'FLEXIBLE_PASS'>('FIXED_SCHEDULE');
    const [monthlyPrice, setMonthlyPrice] = useState('');
    const [occurrences, setOccurrences] = useState('');
    const [days, setDays] = useState<string[]>([]);

    // Simplification for demo: just hardcoding a few days
    const availableDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    useEffect(() => {
        loadPlans();
        navigation.setOptions({ title: `מנויים: ${spotTitle}` });
    }, [spotId]);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const data = await subscriptionService.getSpotPlans(spotId);
            setPlans(data);
        } catch (error: any) {
            Alert.alert('שגיאה', error.response?.data?.error || 'טעינת המנויים נכשלה');
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (day: string) => {
        if (days.includes(day)) {
            setDays(days.filter(d => d !== day));
        } else {
            setDays([...days, day]);
        }
    };

    const handleCreatePlan = async () => {
        if (!monthlyPrice) {
            Alert.alert('שגיאה', 'נא להזין מחיר חודשי');
            return;
        }

        try {
            await subscriptionService.createPlan({
                spotId,
                type,
                monthlyPrice: parseFloat(monthlyPrice),
                occurrencesPerMonth: type === 'FLEXIBLE_PASS' ? parseInt(occurrences) : undefined,
                specificDays: type === 'FIXED_SCHEDULE' ? days : [],
                startTime: '09:00', // Hardcoded for simplicity in demo
                endTime: '17:00'
            });
            Alert.alert('הצלחה', 'המסלול נוצר בהצלחה');
            setModalVisible(false);
            loadPlans();
        } catch (error: any) {
            Alert.alert('שגיאה', error.response?.data?.error || 'יצירת המסלול נכשלה');
        }
    };

    const renderPlan = ({ item }: { item: SubscriptionPlan }) => (
        <View style={styles.planCard}>
            <View style={styles.planHeader}>
                <Text style={styles.planType}>
                    {item.type === 'FIXED_SCHEDULE' ? 'מסלול קבוע' : 'כרטיסיית כניסות'}
                </Text>
                <Text style={styles.planPrice}>₪{item.monthlyPrice}/חודש</Text>
            </View>

            {item.type === 'FIXED_SCHEDULE' && (
                <Text style={styles.planDetails}>
                    ימים: {item.specificDays.join(', ')} ({item.startTime} - {item.endTime})
                </Text>
            )}

            {item.type === 'FLEXIBLE_PASS' && (
                <Text style={styles.planDetails}>
                    {item.occurrencesPerMonth} כניסות בחודש
                </Text>
            )}

            <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.isActive ? 'פעיל' : 'לא פעיל'}</Text>
            </View>
        </View>
    );

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={plans}
                keyExtractor={(item) => item.id}
                renderItem={renderPlan}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>טרם נוספו מסלולי מנוי.</Text>
                }
            />

            <View style={styles.footer}>
                <CustomButton title="צור מסלול חדש" onPress={() => setModalVisible(true)} />
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>מסלול מנוי חדש</Text>

                        <ScrollView>
                            <Text style={styles.label}>סוג מסלול</Text>
                            <View style={styles.typeSelector}>
                                <CustomButton
                                    title="ימים קבועים"
                                    variant={type === 'FIXED_SCHEDULE' ? 'primary' : 'outline'}
                                    onPress={() => setType('FIXED_SCHEDULE')}
                                    style={{ flex: 1, marginRight: 5 }}
                                />
                                <CustomButton
                                    title="כרטיסייה גמישה"
                                    variant={type === 'FLEXIBLE_PASS' ? 'primary' : 'outline'}
                                    onPress={() => setType('FLEXIBLE_PASS')}
                                    style={{ flex: 1, marginLeft: 5 }}
                                />
                            </View>

                            <Text style={styles.label}>מחיר חודשי (₪)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={monthlyPrice}
                                onChangeText={setMonthlyPrice}
                                placeholder="לדוגמה: 500"
                            />

                            {type === 'FIXED_SCHEDULE' && (
                                <>
                                    <Text style={styles.label}>בחר ימים קבועים</Text>
                                    <View style={styles.daysContainer}>
                                        {availableDays.map(day => (
                                            <Text
                                                key={day}
                                                style={[styles.dayChip, days.includes(day) && styles.dayChipSelected]}
                                                onPress={() => toggleDay(day)}
                                            >
                                                {day}
                                            </Text>
                                        ))}
                                    </View>
                                    <Text style={styles.hint}>בגרסה הנוכחית השעות מוגדרות מ-09:00 עד 17:00</Text>
                                </>
                            )}

                            {type === 'FLEXIBLE_PASS' && (
                                <>
                                    <Text style={styles.label}>כמות כניסות בחודש</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={occurrences}
                                        onChangeText={setOccurrences}
                                        placeholder="לדוגמה: 10"
                                    />
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <CustomButton title="ביטול" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 5 }} />
                            <CustomButton title="שמור מסלול" onPress={handleCreatePlan} style={{ flex: 1, marginLeft: 5 }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContainer: { padding: 20 },
    planCard: {
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
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    planType: { fontSize: 18, fontWeight: '700', color: colors.text },
    planPrice: { fontSize: 18, fontWeight: '700', color: colors.primary },
    planDetails: { fontSize: 14, color: colors.textLight, marginBottom: 10 },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(52, 199, 89, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: colors.success, fontSize: 12, fontWeight: '600' },
    emptyText: { textAlign: 'center', color: colors.textLight, marginTop: 50 },
    footer: { padding: 20, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10, marginTop: 10 },
    input: { backgroundColor: colors.background, color: "white", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, fontSize: 16 },
    typeSelector: { flexDirection: 'row', justifyContent: 'space-between' },
    daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dayChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    dayChipSelected: { backgroundColor: colors.primary, color: '#fff', borderColor: colors.primary },
    hint: { fontSize: 12, color: colors.textLight, marginTop: 8 },
    modalActions: { flexDirection: 'row', marginTop: 30 }
});
