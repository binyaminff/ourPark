import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { CustomButton } from '../components/CustomButton';
import { Card } from '../components/Card';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
    const user = useAuthStore((state: any) => state.user);
    const logout = useAuthStore((state: any) => state.logout);

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'he' : 'en';
        i18n.changeLanguage(nextLang);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('profile.title')}</Text>
                </View>

                {user && (
                    <Card style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Name</Text>
                            <Text style={styles.value}>{user.name}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.value}>{user.email}</Text>
                        </View>
                    </Card>
                )}

                <View style={styles.actionsContainer}>
                    <Card style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>{t('profile.language')}</Text>
                            <CustomButton
                                title={i18n.language === 'en' ? t('profile.hebrew') : t('profile.english')}
                                onPress={toggleLanguage}
                                variant="secondary"
                            />
                        </View>
                    </Card>

                    <CustomButton
                        title={t('profile.logoutBtn')}
                        onPress={logout}
                        variant="outline"
                        style={styles.logoutButton}
                        textStyle={styles.logoutButtonText}
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
    header: {
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    title: {
        ...typography.h1,
        color: colors.text,
    },
    infoCard: {
        marginBottom: spacing.xl,
        padding: spacing.lg,
    },
    infoRow: {
        marginVertical: spacing.sm,
    },
    label: {
        ...typography.caption,
        color: colors.textLight,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
    },
    value: {
        ...typography.body,
        fontWeight: '500',
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    actionsContainer: {
        marginTop: 'auto',
    },
    logoutButton: {
        borderColor: colors.error,
    },
    logoutButtonText: {
        color: colors.error,
    },
});
