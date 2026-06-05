import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { Card } from '../components/Card';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function EditSpotScreen({ route, navigation }: any) {
    const { spot } = route.params;

    const [title, setTitle] = useState(spot.title || '');
    const [description, setDescription] = useState(spot.description || '');
    const [price, setPrice] = useState(spot.pricePerHour ? spot.pricePerHour.toString() : '');
    const [verificationCode, setVerificationCode] = useState(spot.dailyVerificationCode || '');

    const [availableDays, setAvailableDays] = useState<string[]>(spot.availableDays || []);
    const ObjectDaysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (day: string) => {
        setAvailableDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const parseTime = (timeString: string) => {
        if (!timeString) return new Date();
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const [availableStartTime, setAvailableStartTime] = useState(parseTime(spot.availableStartTime));
    const [availableEndTime, setAvailableEndTime] = useState(parseTime(spot.availableEndTime));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleUpdateSpot = async () => {
        if (!title || !price || availableDays.length === 0) {
            Alert.alert('שדות חסרים', 'נא למלא את כל שדות החובה ולבחור ימים זמינים.');
            return;
        }

        setLoading(true);
        try {
            const formatTime = (d: Date) => {
                let hh = d.getHours().toString().padStart(2, '0');
                let mm = d.getMinutes().toString().padStart(2, '0');
                return `${hh}:${mm}`;
            };

            const spotData = {
                title,
                description,
                pricePerHour: parseFloat(price),
                dailyVerificationCode: verificationCode.trim() ? verificationCode.trim() : undefined,
                availableDays: availableDays,
                availableStartTime: formatTime(availableStartTime),
                availableEndTime: formatTime(availableEndTime),
            };

            await api.put(`/spots/${spot.id}`, spotData);
            Alert.alert('הצלחה', 'פרטי החניה עודכנו בהצלחה!');
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            Alert.alert('שגיאה', error.response?.data?.error || 'עדכון החניה נכשל');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.headerTitle}>עריכת פרטי חניה</Text>
                    <Text style={styles.subtitle}>עדכן את המחיר, הזמינות או התיאור של החניה שלך.</Text>

                    <Card style={styles.formCard}>
                        <CustomInput
                            label="כותרת"
                            placeholder="לדוגמה: חניה מקורה במרכז העיר"
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Address and Location cannot be edited post-verification */}
                        <Text style={styles.lockedLabel}>כתובת (נעול)</Text>
                        <View style={styles.lockedField}>
                            <Text style={styles.lockedText}>{spot.address}</Text>
                        </View>

                        <CustomInput
                            label="מחיר לשעה (₪)"
                            placeholder="10"
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="numeric"
                        />

                        <CustomInput
                            label="קוד אימות (אופציונלי)"
                            placeholder="לדוגמה: 1A2B3C או קוד שער"
                            value={verificationCode}
                            onChangeText={setVerificationCode}
                            autoCapitalize="characters"
                        />

                        <CustomInput
                            label="תיאור"
                            placeholder="פרטים נוספים על החניה שלך"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            style={styles.textArea}
                        />

                        <Text style={styles.sectionDivider}>לוח זמנים וזמינות</Text>

                        <Text style={styles.daysLabel}>בחר ימים זמינים</Text>
                        <View style={styles.daysContainer}>
                            {ObjectDaysOfWeek.map(day => {
                                const isSelected = availableDays.includes(day);
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                                        onPress={() => toggleDay(day)}
                                    >
                                        <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.halfWidth, styles.timePickerContainer]}>
                                <Text style={styles.timeLabel}>שעת התחלה</Text>
                                <TouchableOpacity
                                    style={styles.timeTrackerBox}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Text style={styles.timeText}>
                                        {availableStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>
                                {showStartPicker && (
                                    <DateTimePicker
                                        value={availableStartTime}
                                        mode="time"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowStartPicker(Platform.OS === 'ios');
                                            if (selectedDate) setAvailableStartTime(selectedDate);
                                        }}
                                    />
                                )}
                            </View>
                            <View style={[styles.halfWidth, styles.timePickerContainer]}>
                                <Text style={styles.timeLabel}>שעת סיום</Text>
                                <TouchableOpacity
                                    style={styles.timeTrackerBox}
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <Text style={styles.timeText}>
                                        {availableEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>
                                {showEndPicker && (
                                    <DateTimePicker
                                        value={availableEndTime}
                                        mode="time"
                                        display="default"
                                        onChange={(event, selectedDate) => {
                                            setShowEndPicker(Platform.OS === 'ios');
                                            if (selectedDate) setAvailableEndTime(selectedDate);
                                        }}
                                    />
                                )}
                            </View>
                        </View>

                        <Text style={styles.sectionDivider}>אימות</Text>
                        <Text style={styles.lockedLabel}>הוכחת בעלות (נעול)</Text>
                        <Text style={{ ...typography.caption, color: colors.textLight, marginTop: spacing.xs }}>
                            לא ניתן לשנות הוכחת בעלות לאחר אישור הרישום הראשוני.
                        </Text>
                    </Card>

                    <View style={styles.buttonContainer}>
                        <CustomButton
                            title="שמור שינויים"
                            onPress={handleUpdateSpot}
                            isLoading={loading}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.lg,
    },
    headerTitle: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.textLight,
        marginBottom: spacing.xl,
    },
    formCard: {
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        marginTop: 'auto',
        marginBottom: spacing.md,
    },
    sectionDivider: {
        ...typography.h3,
        color: colors.primary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.xs,
    },
    lockedLabel: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textLight,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    lockedField: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    lockedText: {
        ...typography.body,
        color: colors.textLight,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    timePickerContainer: {
        marginBottom: spacing.md,
    },
    timeLabel: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    timeTrackerBox: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        height: 50,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    timeText: {
        ...typography.body,
        color: colors.text,
    },
    daysLabel: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    dayChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dayChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    dayChipText: {
        ...typography.bodySmall,
        color: colors.text,
    },
    dayChipTextSelected: {
        color: 'white',
        fontWeight: 'bold',
    },
});
