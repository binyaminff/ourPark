import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background Location Error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];

        if (location) {
            try {
                // Silently ping the backend for anti-fraud tracking
                await api.post('/location/ping', {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    accuracy: location.coords.accuracy,
                });
                console.log('Background ping sent successfully');
            } catch (err) {
                console.log('Failed to send background ping', err);
            }
        }
    }
});

export const startBackgroundLocationTracking = async () => {
    try {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            console.log('Foreground location permission denied');
            return;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            console.log('Background location permission denied');
            return;
        }

        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!hasStarted) {
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 15 * 60 * 1000, // Ping every 15 minutes roughly
                distanceInterval: 100, // Or every 100 meters
                deferredUpdatesInterval: 15 * 60 * 1000,
                showsBackgroundLocationIndicator: false,
                foregroundService: {
                    notificationTitle: "Parking anti-fraud active",
                    notificationBody: "Monitoring location for your parking session.",
                    notificationColor: "#ffffff",
                }
            });
            console.log('Background location tracking started');
        }
    } catch (error) {
        console.error('Error starting background tracking:', error);
    }
};

export const stopBackgroundLocationTracking = async () => {
    try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log('Background location tracking stopped');
        }
    } catch (error) {
        console.error('Error stopping background tracking:', error);
    }
};
