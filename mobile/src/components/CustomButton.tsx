import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { typography } from '../theme/typography';

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
    size?: 'default' | 'small';
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
    isLoading?: boolean;
    disabled?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'default',
    style,
    textStyle,
    isLoading = false,
    disabled = false,
}) => {
    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isOutline = variant === 'outline';
    const isText = variant === 'text';

    const getBackgroundColor = () => {
        if (disabled) return colors.border;
        if (isPrimary) return colors.primary;
        if (isSecondary) return colors.primaryLight;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return colors.textLight;
        if (isPrimary) return colors.card;
        if (isSecondary || isOutline || isText) return colors.primary;
        return colors.text;
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                size === 'small' && styles.buttonSmall,
                { backgroundColor: getBackgroundColor() },
                isOutline && styles.outlineStyle,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, size === 'small' && styles.textSmall, { color: getTextColor() }, textStyle]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {

        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        minHeight: 52,

        shadowRadius: 8,
        elevation: 6,

    },
    buttonSmall: {
        minHeight: 36,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    outlineStyle: {

        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    text: {
        ...typography.button,
    },
    textSmall: {
        ...typography.bodySmall,
        fontWeight: 'bold',
    },
});
