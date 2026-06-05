import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { subscriptionService } from '../services/subscription.service';
import { CustomButton } from '../components/CustomButton';

interface MakeOfferScreenProps {
    visible: boolean;
    spotId: string;
    onClose: () => void;
}

export default function MakeOfferScreen({ visible, spotId, onClose }: MakeOfferScreenProps) {
    const [type, setType] = useState<'FIXED_SCHEDULE' | 'FLEXIBLE_PASS'>('FIXED_SCHEDULE');
    const [monthlyPrice, setMonthlyPrice] = useState('');
    const [occurrences, setOccurrences] = useState('');
    const [days, setDays] = useState<string[]>([]);

    const availableDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const toggleDay = (day: string) => {
        if (days.includes(day)) {
            setDays(days.filter(d => d !== day));
        } else {
            setDays([...days, day]);
        }
    };

    const handleSendOffer = async () => {
        if (!monthlyPrice) {
            Alert.alert('שגיאה', 'נא להזין מחיר חודשי מוצע');
            return;
        }

        try {
            await subscriptionService.createOffer({
                spotId,
                type,
                monthlyPrice: parseFloat(monthlyPrice),
                occurrencesPerMonth: type === 'FLEXIBLE_PASS' ? parseInt(occurrences) || 10 : undefined,
                specificDays: type === 'FIXED_SCHEDULE' ? days : [],
                startTime: '09:00', // Hardcoded for demo
                endTime: '17:00'
            });
            Alert.alert('הצלחה', 'ההצעה נשלחה לבעל החניה!');
            onClose();
        } catch (error: any) {
            Alert.alert('שגיאה', error.response?.data?.error || 'שליחת ההצעה נכשלה');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>הצעת מנוי אישית</Text>

                    <ScrollView>
                        <Text style={styles.desc}>הצע לבעל החניה הסדר מנוי מותאם אישית.</Text>

                        <Text style={styles.label}>סוג מסלול מבוקש</Text>
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

                        <Text style={styles.label}>מחיר חודשי מוצע (₪)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={monthlyPrice}
                            onChangeText={setMonthlyPrice}
                            placeholder="לדוגמה: 400"
                        />

                        {type === 'FIXED_SCHEDULE' && (
                            <>
                                <Text style={styles.label}>בחר ימים מבוקשים</Text>
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
                            </>
                        )}

                        {type === 'FLEXIBLE_PASS' && (
                            <>
                                <Text style={styles.label}>מספר כניסות מבוקש בחודש</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={occurrences}
                                    onChangeText={setOccurrences}
                                    placeholder="לדוגמה: 15"
                                />
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <CustomButton title="ביטול" variant="outline" onPress={onClose} style={{ flex: 1, marginRight: 5 }} />
                        <CustomButton title="שלח הצעה" onPress={handleSendOffer} style={{ flex: 1, marginLeft: 5 }} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
    desc: { fontSize: 14, color: colors.textLight, marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10, marginTop: 10 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, fontSize: 16 },
    typeSelector: { flexDirection: 'row', justifyContent: 'space-between' },
    daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dayChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    dayChipSelected: { backgroundColor: colors.primary, color: '#fff', borderColor: colors.primary },
    modalActions: { flexDirection: 'row', marginTop: 30 }
});
