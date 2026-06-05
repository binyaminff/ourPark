import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { Card } from '../components/Card';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';

import * as Location from 'expo-location';

// Use a web-compatible map implementation if we are on Web
let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;
let UrlTile: any;
if (Platform.OS === 'web') {
    const webMaps = require('@teovilla/react-native-web-maps');
    MapView = webMaps.default;
    Marker = webMaps.Marker;
} else {
    const nativeMaps = require('react-native-maps');
    MapView = nativeMaps.default;
    Marker = nativeMaps.Marker;
    PROVIDER_GOOGLE = nativeMaps.PROVIDER_GOOGLE;
    UrlTile = nativeMaps.UrlTile;
}
import { wazeMapStyle } from '../theme/wazeMapStyle';

export default function AddSpotScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [price, setPrice] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [latitude, setLatitude] = useState(0);
    const [longitude, setLongitude] = useState(0);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);

    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const [availableDays, setAvailableDays] = useState<string[]>([]);
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (day: string) => {
        setAvailableDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    // Default times
    const defaultStart = new Date();
    defaultStart.setHours(8, 0, 0, 0);
    const defaultEnd = new Date();
    defaultEnd.setHours(18, 0, 0, 0);

    const [availableStartTime, setAvailableStartTime] = useState(defaultStart);
    const [availableEndTime, setAvailableEndTime] = useState(defaultEnd);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your photos to upload proof of ownership.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setProofImage(result.assets[0].uri);
        }
    };

    const formatAddress = (feature: any) => {
        const p = feature.properties;
        const parts = [];
        if (p.street) {
            let streetStr = p.street;
            if (p.housenumber) streetStr += ` ${p.housenumber}`;
            parts.push(streetStr);
        } else if (p.name) {
            parts.push(p.name);
        }
        if (p.city) parts.push(p.city);
        if (p.state) parts.push(p.state);
        if (p.country) parts.push(p.country);
        return parts.join(', ');
    };

    const handleAddressChange = (text: string) => {
        setAddress(text);

        if (searchTimeout) clearTimeout(searchTimeout);

        if (text.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timeout = setTimeout(async () => {
            try {
                // Using Photon API which handles autocomplete and house numbers much better
                const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`;
                const response = await fetch(url, {
                    headers: {
                        'Accept-Language': 'he,en;q=0.9'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setAddressSuggestions(data.features || []);
                    setShowSuggestions(true);
                }
            } catch (error) {
                console.error('Autocomplete error:', error);
                // Even on error, show suggestions to allow native fallback
                setShowSuggestions(true);
            }
        }, 800);
        setSearchTimeout(timeout);
    };

    const handleSelectSuggestion = (suggestion: any) => {
        const formatted = formatAddress(suggestion);
        setAddress(formatted);
        setLatitude(suggestion.geometry.coordinates[1]);
        setLongitude(suggestion.geometry.coordinates[0]);
        setAddressSuggestions([]);
        setShowSuggestions(false);
    };

    const handleNativeGeocode = async () => {
        setIsSearchingLocation(true);
        try {
            const results = await Location.geocodeAsync(address);
            if (results && results.length > 0) {
                setLatitude(results[0].latitude);
                setLongitude(results[0].longitude);
                setShowSuggestions(false);
                setAddressSuggestions([]);
            } else {
                Alert.alert(t('common.error', 'שגיאה'), 'לא הצלחנו לאתר את הכתובת המדויקת.');
            }
        } catch (error) {
            console.error('Native geocode error:', error);
            Alert.alert(t('common.error', 'שגיאה'), 'נכשל בחיפוש המיקום המדויק.');
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const handleCreateSpot = async () => {
        if (!title || !address || !price || !proofImage || availableDays.length === 0) {
            Alert.alert('שדות חסרים', 'נא למלא את כל שדות החובה, לבחור ימים ולהעלות הוכחת בעלות.');
            return;
        }

        setLoading(true);
        try {
            // NOTE: Location is now determined automatically by Backend Geocoding

            // Format times as HH:mm
            const formatTime = (d: Date) => {
                let hh = d.getHours().toString().padStart(2, '0');
                let mm = d.getMinutes().toString().padStart(2, '0');
                return `${hh}:${mm}`;
            };

            const spotData = {
                title,
                description,
                address,
                pricePerHour: parseFloat(price),
                dailyVerificationCode: verificationCode.trim() ? verificationCode.trim() : undefined,
                latitude: latitude !== 0 ? latitude : undefined,
                longitude: longitude !== 0 ? longitude : undefined,
                availableDays: availableDays,
                availableStartTime: formatTime(availableStartTime),
                availableEndTime: formatTime(availableEndTime),
                proofOfOwnership: proofImage, // Send base64 or URI to backend
                images: []
            };

            const response = await api.post('/spots', spotData);
            const newSpot = response.data;

            setAddress('');
            setTitle('');
            setPrice('');
            setVerificationCode('');
            setDescription('');
            setAvailableDays([]);
            setAvailableStartTime(new Date());
            setAvailableEndTime(new Date());
            setProofImage(null);
            setLatitude(0);
            setLongitude(0);

            Alert.alert(
                t('common.success', 'הצלחה'),
                t('addSpot.setupPlansPrompt'),
                [
                    {
                        text: t('addSpot.setupPlansNo'),
                        style: 'cancel',
                        onPress: () => navigation.navigate('Home')
                    },
                    {
                        text: t('addSpot.setupPlansYes'),
                        onPress: () => navigation.navigate('ManagePlans', { spotId: newSpot.id, spotTitle: newSpot.title })
                    }
                ]
            );
        } catch (error: any) {
            console.error(error);
            Alert.alert('שגיאה', error.response?.data?.error || 'יצירת החניה נכשלה');
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
                    <Text style={styles.headerTitle}>{t('addSpot.title')}</Text>
                    <Text style={styles.subtitle}>{t('addSpot.subtitle')}</Text>

                    <Card style={styles.formCard}>
                        <CustomInput
                            label={t('addSpot.formTitle')}
                            placeholder={t('addSpot.formTitlePlaceholder')}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <View style={[styles.addressContainer, { zIndex: 10 }]}>
                            <CustomInput
                                label={t('addSpot.formAddress')}
                                placeholder={t('addSpot.formAddressPlaceholder')}
                                value={address}
                                onChangeText={handleAddressChange}
                            />
                            {showSuggestions && address.length >= 3 && (
                                <View style={styles.suggestionsContainer}>
                                    {addressSuggestions.length > 0 ? (
                                        addressSuggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.suggestionItem}
                                                onPress={() => handleSelectSuggestion(item)}
                                            >
                                                <Text style={styles.suggestionText}>{formatAddress(item)}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : null}

                                    {/* Always show a fallback to Native Device Geocoding for precise numbers */}
                                    <TouchableOpacity
                                        style={[styles.suggestionItem, { backgroundColor: colors.background }]}
                                        onPress={handleNativeGeocode}
                                    >
                                        <Text style={styles.suggestionText} numberOfLines={1}>
                                            <Ionicons name="search" size={14} color={colors.primary} />
                                            {'  '}חיפוש מדויק ל: "{address}"
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {latitude !== 0 && longitude !== 0 && Platform.OS !== 'web' && (
                            <View style={styles.mapContainer}>
                                <Text style={styles.mapInstruction}>לחץ לחיצה ארוכה וגרור את הסמן למיקום המדויק של החניה.</Text>
                                <MapView
                                    style={styles.map}
                                    region={{
                                        latitude,
                                        longitude,
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005,
                                    }}
                                    customMapStyle={wazeMapStyle}
                                >
                                    {Platform.OS === 'android' && (
                                        <UrlTile
                                            urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                                            maximumZ={19}
                                            flipY={false}
                                        />
                                    )}
                                    <Marker
                                        coordinate={{ latitude, longitude }}
                                        draggable
                                        onDragEnd={(e: any) => {
                                            setLatitude(e.nativeEvent.coordinate.latitude);
                                            setLongitude(e.nativeEvent.coordinate.longitude);
                                        }}
                                    />
                                </MapView>
                            </View>
                        )}

                        <CustomInput
                            label={t('addSpot.formPrice')}
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
                            label={t('addSpot.formDesc')}
                            placeholder={t('addSpot.formDescPlaceholder')}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            style={styles.textArea}
                        />

                        <Text style={styles.sectionDivider}>{t('addSpot.availSchedule')}</Text>

                        <Text style={styles.daysLabel}>בחר ימים זמינים</Text>
                        <View style={styles.daysContainer}>
                            {daysOfWeek.map(day => {
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
                                <Text style={styles.timeLabel}>{t('addSpot.startTime')}</Text>
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
                                <Text style={styles.timeLabel}>{t('addSpot.endTime')}</Text>
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

                        <Text style={styles.sectionDivider}>{t('addSpot.verification')}</Text>
                        <Text style={styles.imageLabel}>{t('addSpot.proofLabel')}</Text>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {proofImage ? (
                                <Image source={{ uri: proofImage }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="document-attach" size={32} color={colors.textLight} />
                                    <Text style={styles.imagePlaceholderText}>{t('addSpot.uploadPlaceholder')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Card>

                    <View style={styles.buttonContainer}>
                        <CustomButton
                            title={t('addSpot.createBtn')}
                            onPress={handleCreateSpot}
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
    imageLabel: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    imagePicker: {
        height: 150,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        marginTop: spacing.xs,
        color: colors.textLight,
        ...typography.body,
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
    addressContainer: {
        position: 'relative',
        zIndex: 10,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 80,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: 200,
        zIndex: 999,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    suggestionItem: {
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionText: {
        ...typography.bodySmall,
        color: colors.text,
    },
    mapContainer: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    mapInstruction: {
        ...typography.caption,
        color: colors.textLight,
        textAlign: 'center',
        padding: spacing.xs,
        backgroundColor: colors.background,
    },
    map: {
        flex: 1,
    },
});
