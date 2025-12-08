// metro.config.js (in frontend/)
const { getDefaultConfig } = require('expo/metro-config');

console.log(">> METRO CONFIG LOADED <<");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🔑 Firebase Auth fix for Expo SDK 53/54 + Hermes:
// - Allow `.cjs` files to be resolved
// - Disable package.exports resolution that breaks Firebase
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'cjs',
];

config.resolver.unstable_enablePackageExports = false;

module.exports = config;