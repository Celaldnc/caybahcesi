// babel-preset-expo, react-native-worklets/plugin'i kurulu oldugunu gorunce
// OTOMATIK ekler (bkz. babel-preset-expo/build/configs/expo.js).
// Reanimated dokumaninin dedigi gibi elle eklersen plugin iki kez calisir
// ve worklet'ler sessizce bozulur. Elle EKLEME.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
