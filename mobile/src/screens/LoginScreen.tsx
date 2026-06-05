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
import { useAuthStore } from '../store/authStore';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const login = useAuthStore((state) => state.login);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('שגיאה', 'נא להזין אימייל וסיסמה');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            login(response.data.user, response.data.token);
            // Navigation to MainTabs is handled automatically by AppNavigator
        } catch (error: any) {
            Alert.alert('התחברות נכשלה', error.message || 'שם משתמש או סיסמה שגויים');
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
                        <Text style={styles.title}>OurPark</Text>
                        <Text style={styles.subtitle}>השכרת חניות פרטיות</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <CustomInput
                            label="אימייל"
                            placeholder="הכנס את האימייל שלך"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <CustomInput
                            label="סיסמה"
                            placeholder="הכנס את הסיסמה שלך"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <View style={styles.buttons}>
                            <CustomButton
                                title="התחבר"
                                onPress={handleLogin}
                                isLoading={isLoading}
                            />
                            <CustomButton
                                title="אין לך חשבון? הירשם כאן"
                                onPress={() => navigation.navigate('Register')}
                                variant="text"
                            />
                        </View>
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
        justifyContent: 'center',
    },
    headerContainer: {
        marginBottom: spacing.xxl,
        alignItems: 'center',
    },
    title: {
        ...typography.h1,
        color: colors.primaryDark,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.textLight,
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
    },
    buttons: {
        width: '100%',
        marginTop: spacing.lg,
        gap: spacing.md,
    },
});
