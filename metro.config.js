const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// --- 100ms PACKAGE.JSON RESOLUTION FIX ---
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Catch the broken relative path from the 100ms library
  if (
    moduleName === '../../package.json' &&
    context.originModulePath.includes('@100mslive/react-native-hms')
  ) {
    return {
      filePath: require.resolve('@100mslive/react-native-hms/package.json'),
      type: 'sourceFile',
    };
  }
  
  // Let Metro resolve everything else normally
  return context.resolveRequest(context, moduleName, platform);
};
// -----------------------------------------

// Wrap the newly modified config in NativeWind and export it
module.exports = withNativeWind(config, { input: "./global.css" });