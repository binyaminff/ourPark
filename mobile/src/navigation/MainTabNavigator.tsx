import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import MySpotsScreen from '../screens/MySpotsScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { GlobalHeader } from '../components/GlobalHeader';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: true,
                header: () => {
                    let title = 'חניות פרטיות';
                    if (route.name === 'MySpots') title = 'החניות שלי';
                    if (route.name === 'Bookings') title = 'ההזמנות שלי';
                    if (route.name === 'Profile') title = 'פרופיל';
                    return <GlobalHeader title={title} />;
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;

                    if (route.name === 'Home') {
                        iconName = focused ? 'map' : 'map-outline';
                    } else if (route.name === 'MySpots') {
                        iconName = focused ? 'business' : 'business-outline';
                    } else if (route.name === 'Bookings') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    height: 85,
                    paddingBottom: 25,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'מפה' }} />
            <Tab.Screen name="MySpots" component={MySpotsScreen} options={{ title: 'ניהול חניות' }} />
            <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'הזמנות' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'פרופיל' }} />
        </Tab.Navigator>
    );
}
