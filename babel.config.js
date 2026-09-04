// babel-preset-expo, react-native-worklets/plugin'i kurulu oldugunu gorunce
// OTOMATIK ekler (bkz. babel-preset-expo/build/configs/expo.js:96-101).
// Reanimated dokumani plugin'i elle eklemeni soyler; Expo projesinde bu
// GEREKSIZ TEKRARDIR. (Olculdu: bu surumlerde elle eklemek cift donusum
// URETMIYOR, cikti bayt bayt ayni -- ama yine de eklemeye gerek yok ve
// gelecekte davranis degisirse risk yaratir.) Elle EKLEME.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
