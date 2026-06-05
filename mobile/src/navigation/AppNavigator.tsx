import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AddSpotScreen from '../screens/AddSpotScreen';
import SpotDetailsScreen from '../screens/SpotDetailsScreen';
import EditSpotScreen from '../screens/EditSpotScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import BountyListScreen from '../screens/BountyListScreen';
import BountyDetailScreen from '../screens/BountyDetailScreen';
import MainTabNavigator from './MainTabNavigator';
import { GlobalHeader } from '../components/GlobalHeader';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated);

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: true,
                    header: ({ route, options }) => {
                        return <GlobalHeader title={options.title || route.name} />;
                    },
                    contentStyle: { backgroundColor: colors.background }
                }}
            >
                {!isAuthenticated ? (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="VerifyEmail" component={require('../screens/VerifyEmailScreen').default} options={{ title: 'Verify Email' }} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
                        <Stack.Screen name="AddSpot" component={AddSpotScreen} options={{ title: 'פרסם חניה' }} />
                        <Stack.Screen name="SpotDetails" component={SpotDetailsScreen} options={{ title: 'פרטי חניה' }} />
                        <Stack.Screen name="EditSpot" component={EditSpotScreen} options={{ title: 'ערוך קוד וחניה' }} />
                        <Stack.Screen name="ManagePlans" component={require('../screens/ManagePlansScreen').default} options={{ title: 'ניהול מנויים' }} />
                        <Stack.Screen name="Offers" component={require('../screens/OffersScreen').default} options={{ title: 'הצעות ומשא ומתן' }} />
                        <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} options={{ title: 'דיווח על בעיה' }} />
                        <Stack.Screen name="BountyList" component={BountyListScreen} options={{ title: 'בקשות חניה' }} />
                        <Stack.Screen name="BountyDetail" component={BountyDetailScreen} options={{ title: 'פרטי בקשה' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer >
    );
}
