import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import * as SecureStore from 'expo-secure-store';
import awsconfig from './src/aws-exports';
import AppNavigator from './src/navigation/AppNavigator';

// Configure Amplify v6 for Expo Go compatibility
// On Native (iOS/Android), we use SecureStore because Expo Go doesn't include Amplify's native secure storage.
if (Platform.OS !== 'web') {
  console.log('[AMPLIFY] Setting up SecureStore for Expo Go...');
  cognitoUserPoolsTokenProvider.setKeyValueStorage({
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    getItem: (key) => SecureStore.getItemAsync(key),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
    clear: async () => {
      // SecureStore doesn't have a global clear, but Amplify handles keys individually
    },
  });
}

console.log('[AMPLIFY] Initializing Amplify for Splitify...');

Amplify.configure({
  ...awsconfig,
  Auth: {
    Cognito: {
      userPoolId: awsconfig.aws_user_pools_id,
      userPoolClientId: awsconfig.aws_user_pools_web_client_id,
      loginWith: {
        email: true,
        oauth: {
          domain: awsconfig.oauth.domain,
          scopes: awsconfig.oauth.scope,
          redirectSignIn: awsconfig.oauth.redirectSignIn.split(','),
          redirectSignOut: awsconfig.oauth.redirectSignOut.split(','),
          responseType: awsconfig.oauth.responseType as 'code' | 'token',
        }
      }
    }
  }
});

console.log('[AMPLIFY] ✅ Amplify initialized successfully');

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
