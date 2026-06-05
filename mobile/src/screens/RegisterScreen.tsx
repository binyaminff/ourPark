import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export default function RegisterScreen({ navigation }: any) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreeTOS, setAgreeTOS] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isTOSVisible, setIsTOSVisible] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('שגיאה', 'נא למלא את כל השדות');
            return;
        }

        if (!agreeTOS) {
            Alert.alert('שגיאה', 'חובה להסכים לתנאי השימוש כדי להירשם.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/auth/register', { email, password, name });
            Alert.alert('הצלחה', 'החשבון נוצר! נא לאמת את כתובת המייל שלך.');
            navigation.navigate('VerifyEmail', { email, debugToken: response.data.debugToken });
        } catch (error: any) {
            let errorMessage = 'משהו השתבש';
            if (error.response?.data?.error) {
                const errData = error.response.data.error;
                errorMessage = Array.isArray(errData)
                    ? errData.map((e: any) => e.message).join('\n')
                    : errData;
            }
            Alert.alert('הרשמה נכשלה', errorMessage);
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
                        <Text style={styles.title}>יצירת חשבון</Text>
                        <Text style={styles.subtitle}>הצטרף לאפליקציית החניות הפרטיות שלנו</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <CustomInput
                            label="שם מלא"
                            placeholder="הכנס את שמך"
                            value={name}
                            onChangeText={setName}
                        />
                        <CustomInput
                            label="אימייל"
                            placeholder="הכנס את כתובת האימייל שלך"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <CustomInput
                            label="סיסמה"
                            placeholder="צור סיסמה חדשה"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <View style={styles.checkboxContainer}>
                            <TouchableOpacity onPress={() => setAgreeTOS(!agreeTOS)} style={styles.checkboxHitbox}>
                                <View style={[styles.checkbox, agreeTOS && styles.checkboxChecked]}>
                                    {agreeTOS && <Ionicons name="checkmark" size={14} color={colors.card} />}
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.checkboxLabel}>
                                אני מסכים{' '}
                                <Text style={styles.linkText} onPress={() => setIsTOSVisible(true)}>
                                    לתנאי השימוש ומדיניות הפרטיות
                                </Text>
                            </Text>
                        </View>

                        <View style={styles.buttons}>
                            <CustomButton
                                title="הירשם"
                                onPress={handleRegister}
                                isLoading={isLoading}
                            />
                            <CustomButton
                                title="כבר יש לך חשבון? התחבר כאן"
                                onPress={() => navigation.goBack()}
                                variant="text"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* TOS Modal */}
            <Modal visible={isTOSVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>תנאי שימוש ומדיניות פרטיות</Text>
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.modalText}>
                                תקנון האפליקציה OurPark:{'\n\n'}
                                1. כללי:{'\n'}
                                האפליקציה נועדה לחבר בין בעלי חניות פרטיות לבין נהגים המחפשים חניה.{'\n\n'}
                                2. אחריות המשתמש:{'\n'}
                                השימוש באפליקציה הינו באחריות המשתמש בלבד. על בעל החניה לוודא כי הוא רשאי להשכיר את החניה, ועל הנהג לוודא כי הוא חונה בהתאם לחוק ולתנאי בעל החניה.{'\n\n'}
                                3. תשלומים:{'\n'}
                                כל התשלומים יתבצעו דרך המערכת בצורה מאובטחת. אין לשלם מחוץ לאפליקציה.{'\n\n'}
                                4. דיווחים ומחלוקות:{'\n'}
                                במקרה של בעיה, ניתן לדווח לצוות דרך האפליקציה ואנו נטפל בהקדם האפשרי.{'\n\n'}
                                השימוש באפליקציה מהווה הסכמה מלאה לתנאים אלו.
                            </Text>
                        </ScrollView>
                        <CustomButton title="סגור" onPress={() => setIsTOSVisible(false)} />
                    </View>
                </View>
            </Modal>
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
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.primary,
        marginRight: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
    },
    checkboxLabel: {
        ...typography.bodySmall,
        color: colors.textLight,
        flex: 1,
    },
    linkText: {
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    checkboxHitbox: {
        padding: spacing.xs,
        marginLeft: -spacing.xs,
    },
    buttons: {
        width: '100%',
        marginTop: spacing.lg,
        gap: spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.card,
        width: '100%',
        maxHeight: '80%',
        borderRadius: 12,
        padding: spacing.lg,
    },
    modalTitle: {
        ...typography.h2,
        color: colors.primaryDark,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    modalScroll: {
        marginBottom: spacing.lg,
    },
    modalText: {
        ...typography.body,
        color: colors.text,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});
