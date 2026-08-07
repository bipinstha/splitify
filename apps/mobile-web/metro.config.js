const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ALIAS: Redirect @aws-amplify/react-native to our local Expo-compatible polyfill
// This fixes the "Unknown error" in Expo Go by avoiding custom native modules.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@aws-amplify/react-native': path.resolve(__dirname, 'src/utils/amplify-expo-polyfill.ts'),
};

// Add support for .mjs files which are used by lucide-react-native
config.resolver.sourceExts.push('mjs');

module.exports = config;
