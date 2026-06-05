import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/colors';
import { typography } from '../theme/typography';
import { wazeMapStyle } from '../theme/wazeMapStyle';

let MapView: any;
let Marker: any;
let Polyline: any;
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
    UrlTile = nativeMaps.UrlTile;
}

export default function InAppNavigationScreen({ route, navigation }: any) {
    const { destinationLat, destinationLng, title } = route.params;

    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let locationSubscription: Location.LocationSubscription;

        const startTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is required for navigation.');
                navigation.goBack();
                return;
            }

            const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setCurrentLocation(initialLoc);
            fetchRoute(initialLoc.coords.latitude, initialLoc.coords.longitude);

            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                (newLocation) => {
                    setCurrentLocation(newLocation);
                    // For a real nav app, we'd recalculate route if they deviate, but we'll keep it simple
                }
            );
        };

        startTracking();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, []);

    const fetchRoute = async (startLat: number, startLng: number) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const navRoute = data.routes[0];
                const coords = navRoute.geometry.coordinates.map((c: any) => ({
                    latitude: c[1],
                    longitude: c[0]
                }));
                setRouteCoordinates(coords);

                // Convert distance meters to km or miles
                const distKm = (navRoute.distance / 1000).toFixed(1);
                setDistance(`${distKm} km`);

                // Convert duration seconds to mins
                const durMin = Math.round(navRoute.duration / 60);
                setDuration(`${durMin} min`);
            }
        } catch (error) {
            console.error('Error fetching route:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !currentLocation) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Locating & calculating route...</Text>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={Platform.OS !== 'web'}
                followsUserLocation
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
                    coordinate={{ latitude: destinationLat, longitude: destinationLng }}
                    title={title || 'Destination'}
                    pinColor={colors.primary}
                />

                {routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor="#3B82F6"
                        strokeWidth={6}
                    />
                )}
            </MapView>

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{title || 'Navigating...'}</Text>
            </View>

            <View style={styles.bottomCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.duration}>{duration}</Text>
                    <Text style={styles.distance}>{distance}</Text>
                </View>
                <TouchableOpacity style={styles.endBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.endBtnText}>End Navigation</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        position: 'relative'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        ...typography.body,
        color: colors.textLight,
        marginTop: spacing.md,
    },
    map: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.sm,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    backBtn: {
        padding: spacing.xs,
        marginRight: spacing.sm,
    },
    title: {
        ...typography.h3,
        color: colors.text,
        flex: 1,
    },
    bottomCard: {
        position: 'absolute',
        bottom: spacing.xl,
        left: spacing.lg,
        right: spacing.lg,
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
    infoRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.md,
    },
    duration: {
        ...typography.h2,
        color: colors.success,
        marginRight: spacing.sm,
    },
    distance: {
        ...typography.body,
        color: colors.textLight,
        fontWeight: 'bold',
    },
    endBtn: {
        backgroundColor: colors.error,
        width: '100%',
        paddingVertical: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    endBtnText: {
        ...typography.h3,
        color: 'white',
    }
});
