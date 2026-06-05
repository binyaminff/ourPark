import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function VerifyEmailScreen({ route, navigation }: any) {
    const { email, debugToken } = route.params || {};
    const [code, setCode] = useState(debugToken || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleVerify = async () => {
        if (!code) {
            Alert.alert('שגיאה', 'נא להזין את קוד האימות');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/verify-email', { email, code });
            Alert.alert('הצלחה', 'האימייל אומת בהצלחה! כעת ניתן להתחבר.');
            navigation.navigate('Login');
        } catch (error: any) {
            let errorMessage = 'האימות נכשל';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            Alert.alert('שגיאה', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>אימות אימייל</Text>
                        <Text style={styles.subtitle}>הכנס את הקוד בן 6 הספרות שנשלח ל-{email}</Text>
                        {!!debugToken && (
                            <Text style={styles.debugText}>(קוד לבאג: {debugToken})</Text>
                        )}
                    </View>

                    <View style={styles.formContainer}>
                        <CustomInput
                            label="קוד אימות"
                            placeholder="לדוגמה: 123456"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="numeric"
                        />

                        <View style={styles.buttons}>
                            <CustomButton
                                title="אמת עכשיו"
                                onPress={handleVerify}
                                isLoading={isLoading}
                            />
                            <CustomButton
                                title="חזור להתחברות"
                                onPress={() => navigation.navigate('Login')}
                                variant="outline"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
    headerContainer: { marginBottom: spacing.xxl, alignItems: 'center' },
    title: { ...typography.h1, color: colors.primaryDark, marginBottom: spacing.xs, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textLight, textAlign: 'center' },
    debugText: { fontSize: 12, color: colors.warning, marginTop: spacing.sm, textAlign: 'center' },
    formContainer: { width: '100%' },
    buttons: { width: '100%', marginTop: spacing.lg, gap: spacing.md },
});
