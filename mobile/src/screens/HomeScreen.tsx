import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Alert, Platform, Text, ActivityIndicator, TextInput, TouchableOpacity, Keyboard, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Use a web-compatible map implementation if we are on Web
let MapView: any;
let Marker: any;
let Polyline: any;
let PROVIDER_GOOGLE: any;
let UrlTile: any;
if (Platform.OS === 'web') {
    const webMaps = require('@teovilla/react-native-web-maps');
    MapView = webMaps.default;
    Marker = webMaps.Marker;
    Polyline = webMaps.Polyline;
} else {
    const nativeMaps = require('react-native-maps');
    MapView = nativeMaps.default;
    Marker = nativeMaps.Marker;
    Polyline = nativeMaps.Polyline;
    PROVIDER_GOOGLE = nativeMaps.PROVIDER_GOOGLE;
    UrlTile = nativeMaps.UrlTile;
}
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../theme/colors';
import { wazeMapStyle } from '../theme/wazeMapStyle';

export default function HomeScreen({ navigation, route }: any) {
    const { t } = useTranslation();
    const [location, setLocation] = useState<any>(null);
    const [spots, setSpots] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [is3D, setIs3D] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const mapRef = useRef<any>(null);

    // Navigation State
    const [navigatingSpot, setNavigatingSpot] = useState<any>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');

    // Check for incoming navigation request from SpotDetailsScreen
    const incomingNavTarget = route?.params?.navigationTarget;

    useEffect(() => {
        if (incomingNavTarget && location) {
            setNavigatingSpot(incomingNavTarget);
            fetchRoute(location.latitude, location.longitude, incomingNavTarget.latitude, incomingNavTarget.longitude);
            // Clear the param so it doesn't re-trigger infinitely if we update state
            navigation.setParams({ navigationTarget: undefined });
        }
    }, [incomingNavTarget, location]);

    // Live location watcher for when navigating
    // Live location watcher for when navigating
    useEffect(() => {
        let locationSubscription: Location.LocationSubscription;

        if (navigatingSpot) {
            (async () => {
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 2000, // עדכון תכוף יותר לניווט חלק
                        distanceInterval: 5,  // עדכון כל 5 מטרים
                    },
                    (newLocation) => {
                        const { latitude, longitude, heading } = newLocation.coords;
                        setLocation(newLocation.coords);

                        // מיקוד המפה על המיקום החדש בזום גבוה
                        mapRef.current?.animateCamera({
                            center: { latitude, longitude },
                            pitch: 60,           // זווית תלת-ממדית לניווט
                            heading: heading, // הפניית המפה לכיוון הנסיעה
                            zoom: 20             // זום מוגדל משמעותית
                        }, { duration: 1000 });
                    }
                );
            })();
        }

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [navigatingSpot]);

    const fetchRoute = async (startLat: number, startLng: number, destLat: number, destLng: number) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const navRoute = data.routes[0];
                const coords = navRoute.geometry.coordinates.map((c: any) => ({
                    latitude: c[1],
                    longitude: c[0]
                }));
                setRouteCoordinates(coords);

                const distKm = (navRoute.distance / 1000).toFixed(1);
                setDistance(`${distKm} km`);

                const durMin = Math.round(navRoute.duration / 60);
                setDuration(`${durMin} min`);

                // Animate to fit route
                mapRef.current?.animateCamera({
                    center: { latitude: startLat, longitude: startLng },
                    pitch: 60,
                    zoom: 16
                }, { duration: 1000 });
            }
        } catch (error) {
            console.error('Error fetching route:', error);
        }
    };

    const handleEndNavigation = () => {
        setNavigatingSpot(null);
        setRouteCoordinates([]);
        // Re-center on user
        mapRef.current?.animateCamera({
            center: { latitude: location.latitude, longitude: location.longitude },
            pitch: 0,
            zoom: 16
        }, { duration: 800 });
        // Refresh local spots
        fetchSpots(location.latitude, location.longitude);
    };

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setIsLoading(true);
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission to access location was denied');
                    setIsLoading(false);
                    return;
                }

                if (!location) {
                    let loc = await Location.getCurrentPositionAsync({});
                    setLocation(loc.coords);
                    await fetchSpots(loc.coords.latitude, loc.coords.longitude);
                } else {
                    await fetchSpots(location.latitude, location.longitude);
                }
                setIsLoading(false);
            })();
        }, [location])
    );

    const fetchSpots = async (lat: number, lng: number) => {
        try {
            const response = await api.get(`/spots/search?lat=${lat}&lng=${lng}`);
            setSpots(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        Keyboard.dismiss();
        setIsSearching(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'ParkingRentalApp/1.0',
                    'Accept-Language': 'en-US,en;q=0.9,he;q=0.8'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const destLat = parseFloat(lat);
                const destLng = parseFloat(lon);

                mapRef.current?.animateCamera({
                    center: { latitude: destLat, longitude: destLng },
                    zoom: 16,
                    pitch: is3D ? 60 : 0,
                }, { duration: 1000 });

                await fetchSpots(destLat, destLng);
            } else {
                Alert.alert('לא נמצא', 'לא הצלחנו למצוא את המיקום הזה.');
            }
        } catch (error) {
            console.error('Search error:', error);
            Alert.alert('שגיאה', 'חיפוש המיקום נכשל.');
        } finally {
            setIsSearching(false);
        }
    };

    const toggle3D = () => {
        const newPitch = is3D ? 0 : 60;
        setIs3D(!is3D);
        mapRef.current?.animateCamera({ pitch: newPitch }, { duration: 500 });
    };

    const onSpotPress = (spot: any) => {
        mapRef.current?.animateCamera({
            center: { latitude: spot.latitude, longitude: spot.longitude },
            zoom: 18,
            pitch: is3D ? 60 : 0,
        }, { duration: 800 });

        // Optional: navigate directly or just focus
        // navigation.navigate('SpotDetails', { spot });
    };

    const renderSpotCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.spotCard}
            activeOpacity={0.9}
            onPress={() => onSpotPress(item)}
            onLongPress={() => navigation.navigate('SpotDetails', { spot: item })}
        >
            <View style={styles.spotCardContent}>
                <View style={styles.spotInfo}>
                    <Text style={styles.spotTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.spotPrice}>${item.pricePerHour} / hr</Text>
                    <Text style={styles.spotAddress} numberOfLines={1}>
                        <Ionicons name="location" size={12} color={colors.textLight} /> {item.address || 'Unknown address'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => navigation.navigate('SpotDetails', { spot: item })}
                >
                    <Text style={styles.bookButtonText}>צפה</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {Platform.OS === 'web' ? (
                <View style={styles.webPlaceholder}>
                    <Text style={styles.webPlaceholderText}>{t('home.mapNotSupported')}</Text>
                </View>
            ) : isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : location ? (
                <>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialCamera={{
                            center: {
                                latitude: location.latitude,
                                longitude: location.longitude,
                            },
                            pitch: 60,
                            heading: location.heading || 0,
                            altitude: 1000,
                            zoom: 17,
                        }}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                        customMapStyle={wazeMapStyle}
                    >
                        {Platform.OS === 'android' && (
                            <UrlTile
                                urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                                maximumZ={19}
                                flipY={false}
                            />
                        )}
                        {!navigatingSpot && spots.map((spot: any) => (
                            <Marker
                                key={spot.id}
                                coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                                title={spot.title}
                                description={`$${spot.pricePerHour}/hr`}
                                onCalloutPress={() => navigation.navigate('SpotDetails', { spot })}
                            />
                        ))}
                        {navigatingSpot && (
                            <Marker
                                coordinate={{ latitude: navigatingSpot.latitude, longitude: navigatingSpot.longitude }}
                                title={navigatingSpot.title}
                                pinColor={colors.primary}
                            />
                        )}
                        {navigatingSpot && routeCoordinates.length > 0 && (
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor={colors.primary}
                                strokeWidth={6}
                            />
                        )}
                    </MapView>

                    {/* Conditional UI based on Navigation State */}
                    {navigatingSpot ? (
                        <View style={styles.navOverlay}>
                            <View style={styles.navHeader}>
                                <Text style={styles.navTitle} numberOfLines={1}>{navigatingSpot.title}</Text>
                            </View>
                            <View style={styles.navFooter}>
                                <View style={styles.navInfoRow}>
                                    <Text style={styles.navDuration}>{duration}</Text>
                                    <Text style={styles.navDistance}>{distance}</Text>
                                </View>
                                <TouchableOpacity style={styles.endNavBtn} onPress={handleEndNavigation}>
                                    <Text style={styles.endNavBtnText}>סיום ניווט</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            {/* Search Bar Overlay */}
                            <View style={styles.searchContainer}>
                                <View style={styles.searchInputWrapper}>
                                    <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder={t('home.searchPlaceholder')}
                                        placeholderTextColor={colors.textLight}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        onSubmitEditing={handleSearch}
                                        returnKeyType="search"
                                    />
                                    {isSearching && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />}
                                </View>
                            </View>

                            {/* 3D/2D Toggle Button */}
                            <TouchableOpacity style={styles.toggleButton} onPress={toggle3D}>
                                <Text style={styles.toggleButtonText}>{is3D ? t('home.toggle2D') : t('home.toggle3D')}</Text>
                            </TouchableOpacity>

                            {/* Missions Button */}
                            <TouchableOpacity
                                style={[styles.toggleButton, styles.missionsButton]}
                                onPress={() => navigation.navigate('BountyList')}
                            >
                                <Ionicons name="cash-outline" size={24} color={colors.card} />
                            </TouchableOpacity>

                            {/* Spots Horizontal List */}
                            {spots.length > 0 && (
                                <View style={styles.spotsListContainer}>
                                    <FlatList
                                        data={spots}
                                        keyExtractor={(item: any) => item.id}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: 10 }}
                                        renderItem={renderSpotCard}
                                    />
                                </View>
                            )}
                        </>
                    )}
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    webPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    webPlaceholderText: {
        fontSize: 16,
        color: colors.textLight,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 80 : 60, // Pushed further down
        left: 20,
        right: 20,
        zIndex: 10,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 25,
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 5,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
    },
    toggleButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 140 : 120, // Pushed further down
        right: 20,
        backgroundColor: colors.card,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 10,
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primaryDark,
    },
    missionsButton: {
        top: Platform.OS === 'ios' ? 194 : 174, // Below the 3D toggle
        backgroundColor: colors.success,     // Green to indicate money/cash
    },
    spotsListContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 90 : 70, // Above the tab bar
        left: 0,
        right: 0,
        height: 100,
    },
    spotCard: {
        backgroundColor: colors.card,
        borderRadius: 15,
        padding: 12,
        marginHorizontal: 10,
        width: Dimensions.get('window').width * 0.75,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        justifyContent: 'center',
    },
    spotCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spotInfo: {
        flex: 1,
        marginRight: 10,
    },
    spotTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    spotPrice: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: 4,
    },
    spotAddress: {
        fontSize: 12,
        color: colors.textLight,
    },
    bookButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    bookButtonText: {
        color: colors.card,
        fontWeight: 'bold',
        fontSize: 14,
    },
    navOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        pointerEvents: 'box-none',
    },
    navHeader: {
        marginTop: Platform.OS === 'ios' ? 60 : 40,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    navTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    navFooter: {
        marginBottom: spacing.xl,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: spacing.lg,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    navInfoRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.md,
    },
    navDuration: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.success,
        marginRight: spacing.sm,
    },
    navDistance: {
        fontSize: 16,
        color: colors.textLight,
        fontWeight: 'bold',
    },
    endNavBtn: {
        backgroundColor: colors.error,
        width: '100%',
        paddingVertical: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    endNavBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    }
});
