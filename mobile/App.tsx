import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { startBackgroundLocationTracking } from './src/services/LocationTaskService';
import './src/i18n';

// Smart loading of StripeProvider to support both native Stripe & Expo Go/Web gracefully
let StripeProvider: any;
try {
  const StripeModule = require('@stripe/stripe-react-native');
  StripeProvider = StripeModule.StripeProvider;
} catch (e) {
  console.log('Stripe native module not loaded, using Mock Provider.');
  StripeProvider = ({ children }: any) => <>{children}</>;
}

export default function App() {
  useEffect(() => {
    // Optionally start tracking globally or wait for a booking
    // For now we register the task definition purely by importing it
  }, []);

  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey="pk_test_51OuXk2A2kX2Xk2Xk2Xk" // Standard safe test publisher key for initialization
        merchantIdentifier="merchant.com.anonymous.mobile"
      >
        <AppNavigator />
      </StripeProvider>
    </SafeAreaProvider>
  );
}
