import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { typography } from '../theme/typography';

interface CustomInputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export const CustomInput: React.FC<CustomInputProps> = ({
    label,
    error,
    containerStyle,
    style,
    ...props
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    error ? styles.inputError : null,
                    style,
                ]}
                placeholderTextColor={colors.textLight}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
        width: '100%',
    },
    label: {
        ...typography.bodySmall,
        color: colors.text,
        marginBottom: spacing.xs,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.body.fontSize,
        color: colors.text,
        minHeight: 52,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
});
