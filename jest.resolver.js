const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');

/**
 * Jest modul cozucusu.
 *
 * NEDEN GEREKLI: `react-native-worklets` (Reanimated 4'un bagimliligi)
 * `NativeWorklets.native.ts` icinde JSI'ya erisiyor ve Jest'te
 * "Cannot read properties of undefined (reading 'loadUnpackers')" ile
 * patliyor. Paketin kendi cozumu `react-native-worklets/jest/resolver.js`:
 * worklets modullerini cozerken `.native` uzantilarini eleyip web/JS
 * surumlerini sectiriyor.
 *
 * Onu dogrudan kullanamiyoruz cunku jest-expo preset'i zaten
 * `@react-native/jest-preset/jest/resolver` kuruyor ve Jest tek bir
 * `resolver` kabul ediyor. Bu dosya ikisini BIRLESTIRIR: worklets icin
 * uzantilari eler, sonra her durumda RN cozucusune devreder.
 */
module.exports = (request, options) => {
  const isWorklets =
    request.includes('react-native-worklets') ||
    (typeof options.basedir === 'string' && options.basedir.includes('react-native-worklets'));

  if (!isWorklets) {
    return reactNativeResolver(request, options);
  }

  return reactNativeResolver(request, {
    ...options,
    extensions: options.extensions?.filter((extension) => !extension.includes('native')),
  });
};
