import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function ReportIncidentScreen({ route, navigation }: any) {
    const { spot } = route.params;
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const takePhoto = async () => {
        Alert.alert('מצלמה', 'צולם תצלום (דמו)');
        setPhoto('https://via.placeholder.com/300');
    };

    const submitReport = async () => {
        if (!description) {
            Alert.alert('שדה חסר', 'נא לספק תיאור של הבעיה');
            return;
        }

        setLoading(true);
        try {
            await api.post('/incidents', {
                spotId: spot.id,
                description,
                evidence: {
                    imageUrl: photo || 'https://via.placeholder.com/300',
                    latitude: 0,
                    longitude: 0
                }
            });
            Alert.alert('הדיווח נשלח', 'אנו נבדוק את המקרה ונזכה במידת הצורך.');
            navigation.popToTop();
        } catch (error: any) {
            Alert.alert('שגיאה', error.response?.data?.error || 'שליחת הדיווח נכשלה');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.headerTitle}>דיווח על בעיה</Text>
                <Text style={styles.subtitle}>עדכן אותנו אם חונה רכב זר או אם יש בעיה אחרת בחניה.</Text>

                <Card style={styles.card}>
                    <Text style={styles.spotInfoLabel}>מיקום</Text>
                    <Text style={styles.spotInfoText}>{spot.title}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>תצלום הוכחה</Text>
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

                    <View style={styles.divider} />

                    <CustomInput
                        label="תיאור"
                        placeholder="תאר מה קרה (לדוגמה: רכב מ.ר 1234567 חונה במקום)"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={styles.textArea}
                    />
                </Card>

                <View style={styles.actionsContainer}>
                    <CustomButton
                        title="שלח דיווח"
                        onPress={submitReport}
                        isLoading={loading}
                        style={styles.submitButton}
                    />
                </View>
            </ScrollView>
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
    headerTitle: {
        ...typography.h1,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.textLight,
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    card: {
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    spotInfoLabel: {
        ...typography.caption,
        color: colors.textLight,
        textTransform: 'uppercase',
    },
    spotInfoText: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.xs,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.lg,
    },
    sectionTitle: {
        ...typography.bodySmall,
        color: colors.text,
        fontWeight: '600',
        marginBottom: spacing.sm,
    },
    photoContainer: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    photo: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    placeholderBox: {
        width: '100%',
        height: 150,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: colors.textLight,
        ...typography.bodySmall,
    },
    photoButton: {
        marginBottom: spacing.xs,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    actionsContainer: {
        marginTop: 'auto',
    },
    submitButton: {
        backgroundColor: colors.error,
    },
});
