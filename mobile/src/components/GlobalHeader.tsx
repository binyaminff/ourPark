import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

export const GlobalHeader = ({ title, showLogo = true }: { title?: string, showLogo?: boolean }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.container,
            { paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + spacing.sm }
        ]}>
            <View style={styles.content}>
                {showLogo && (
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                )}
                <Text style={styles.title}>{title || 'חניות פרטיות להשכרה'}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 100,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 32,
        height: 32,
        borderRadius: 6,
        marginRight: spacing.sm,
    },
    title: {
        ...typography.h2,
        color: colors.primary,
        fontWeight: 'bold',
    }
});
