import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { CustomButton } from '../components/CustomButton';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function BountyDetailScreen({ route, navigation }: any) {
    const { bounty } = route.params;
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [status, setStatus] = useState(bounty.status); // OPEN or CLAIMED

    const takePhoto = async () => {
        Alert.alert('מצלמה', 'צולם תצלום (דמו)');
        setPhoto('https://via.placeholder.com/300'); // Mocking camera API
    };

    const claimBounty = async () => {
        setClaiming(true);
        try {
            await api.post(`/bounties/${bounty.id}/claim`);
            setStatus('CLAIMED');
            Alert.alert('המשימה התקבלה', 'יש לך 15 דקות לצלם ולשלוח תמונת אימות.');
        } catch (error: any) {
            Alert.alert('שגיאה', error.response?.data?.error || 'קבלת המשימה נכשלה');
        } finally {
            setClaiming(false);
        }
    };

    const submitBounty = async () => {
        if (!photo) {
            Alert.alert('חסרה תמונה', 'אנא צלם תמונה של החניה הפנויה תחילה.');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/bounties/${bounty.id}/submit`, { photoUrl: photo });
            Alert.alert('הצלחה', `הרווחת ₪${bounty.rewardAmount.toFixed(2)}!`);
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('שגיאה', error.response?.data?.error || 'שליחת האימות נכשלה');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.headerTitle}>פרטי משימה</Text>

                <Card style={styles.card}>
                    <Text style={styles.label}>חניית יעד</Text>
                    <Text style={styles.value}>{bounty.spot?.title}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.label}>תגמול</Text>
                    <Text style={styles.rewardValue}>₪{bounty.rewardAmount.toFixed(2)}</Text>
                </Card>

                {status === 'OPEN' ? (
                    <View style={styles.actionsContainer}>
                        <Text style={styles.instruction}>קבל משימה זו כדי לאמת שהחניה אכן פנויה כרגע.</Text>
                        <CustomButton
                            title="קבל משימה"
                            onPress={claimBounty}
                            isLoading={claiming}
                        />
                    </View>
                ) : (
                    <View style={styles.actionsContainer}>
                        <Text style={styles.instruction}>1. גש למיקום החניה.</Text>
                        <Text style={styles.instruction}>2. צלם תמונה ברורה המוכיחה שהחניה ריקה כרגע.</Text>

                        <View style={styles.photoContainer}>
                            {photo ? (
                                <Image source={{ uri: photo }} style={styles.photo} />
                            ) : (
                                <View style={styles.placeholderBox}>
                                    <Text style={styles.placeholderText}>לא צולם תצלום</Text>
                                </View>
                            )}
                        </View>

                        <CustomButton
                            title={photo ? "צלם שוב" : "צלם תמונה"}
                            onPress={takePhoto}
                            variant="outline"
                            style={styles.photoButton}
                        />

                        <CustomButton
                            title="שלח אימות"
                            onPress={submitBounty}
                            isLoading={loading}
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flexGrow: 1, padding: spacing.lg },
    headerTitle: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
    card: { padding: spacing.lg, marginBottom: spacing.xl },
    label: { ...typography.caption, color: colors.textLight, textTransform: 'uppercase' },
    value: { ...typography.h3, color: colors.text, marginTop: spacing.xs },
    rewardValue: { ...typography.h2, color: colors.success, marginTop: spacing.xs },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
    actionsContainer: { marginTop: spacing.md },
    instruction: { ...typography.body, color: colors.text, marginBottom: spacing.md, lineHeight: 22 },
    photoContainer: { alignItems: 'center', marginBottom: spacing.md },
    photo: { width: '100%', height: 200, borderRadius: 8 },
    placeholderBox: { width: '100%', height: 150, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { color: colors.textLight, ...typography.bodySmall },
    photoButton: { marginBottom: spacing.md },
});
