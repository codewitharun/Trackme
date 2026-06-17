const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase v10 stores the React Native auth bundle (with getReactNativePersistence)
// under the "react-native" export condition in @firebase/auth.
// Without these settings Metro loads the browser ESM bundle, which doesn't
// export getReactNativePersistence, causing "Component auth has not been registered yet".
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default'];

module.exports = config;
