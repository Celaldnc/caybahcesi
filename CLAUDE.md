# Çay Bahçesi Topla — Ajan Notları

Türk temalı triple-match mobil oyun. Expo SDK 57 + TypeScript strict + TDD.

## Değişmez kurallar

1. **`src/game/core/**` saf TypeScript.** `react`, `react-native`, `expo*` import etme. ESLint bunu hata sayar (`no-restricted-imports`). Platform kodu `engine/` veya `store/` katmanına gider.
2. **Çıplak sayı yok.** Ayarlanabilir her değer [src/constants/config.ts](src/constants/config.ts) içinde.
3. **`any` yok.** TS strict + `noUncheckedIndexedAccess` açık.
4. **Inline style yok.** `StyleSheet.create` kullan. Runtime değeri gerekiyorsa `style={[styles.x, { renk }]}` kalıbı serbest — ESLint sadece doğrudan `style={{…}}` biçimini engeller.
5. **Her feature'a en az 1 test.** `core/` %90, global %70 coverage eşiği CI'da zorunlu.
6. **Commit öncesi `npm run verify`.**

## Bu projede yanan tuzaklar (tekrar düşme)

### RNTL v14: `render` ve `fireEvent` **async**

```tsx
await render(<Button label="Oyna" onPress={fn} />);
await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
```

`await` unutulursa test `render function has not been called` ile patlar — ama **typecheck temiz geçer**, çünkü dönen Promise kullanılmıyor.
Ayrıca `toHaveAccessibilityHint` matcher'ı v14'te **yok**; `toHaveProp('accessibilityHint', …)` veya `getByHintText` kullan.

### Reanimated 4: babel plugin'i **elle ekleme**

`babel-preset-expo`, `react-native-worklets` kurulu olduğunu görünce plugin'i otomatik ekler (`babel-preset-expo/build/configs/expo.js:96`). Reanimated dokümanının dediği gibi `babel.config.js`'e elle eklersen plugin iki kez çalışır ve worklet'ler sessizce bozulur.

### `tsconfig.json` → `types` alanı açıkça yazılmalı

`expo/tsconfig.base` ile `@types/jest` otomatik yüklenmiyor; `describe/it/expect` bulunamıyor. `"types": ["jest", "node"]` şart.

### `@types/jest` sürümü Jest 29 hattına sabit

`jest-expo@57` tüm zincirini Jest **29** üzerine kuruyor. `@types/jest@30` kurarsan `expo-doctor` düşer. `~29.5.14` kullan.

### `eslint-plugin-react-native` artık yok

`eslint-config-expo@57` bu plugin'i düşürdü (upstream bakımsız). `react-native/no-inline-styles` kuralı çalışmaz — yerine [eslint.config.js](eslint.config.js) içinde AST seçicili `no-restricted-syntax` var.

### Windows: satır sonları

[.gitattributes](.gitattributes) ile depo LF'e sabit. Dosya yazarken CRLF üretme (Python'da `newline='\n'` ver); yoksa Prettier "Delete ␍" hatası yağar.

### Türkçe kesme işareti JSX içinde

`'` karakteri `react/no-unescaped-entities` kuralını tetikler. Tipografik `’` (U+2019) kullan — hem doğru tipografi hem lint temiz.

### `app.json`'da `newArchEnabled` yok

SDK 55'ten beri New Architecture zorunlu; bayrak şemadan kaldırıldı. Eklersen `expo-doctor` düşer.

## Bilinen, kabul edilmiş durumlar

- `npm audit`: 14 moderate açık. Hepsi Expo'nun **build-time** zincirinden geliyor (`decode-uri-component` ← `query-string` ← `expo-router`; `uuid` ← `xcode` ← `@expo/config-plugins`). Uygulama çalışma zamanına ulaşmıyorlar. `npm audit fix --force` Expo'yu kırar — **çalıştırma**. Upstream düzeltmesi bekleniyor.
- `src/**/*.web.{ts,tsx}` coverage dışı: jest-expo'nun native preset'i onları hiç yükleyemez.

## Komutlar

```bash
npm run verify     # lint + typecheck + coverage — DoD kapısı
npm run doctor     # expo-doctor, SDK uyumu
npm test -- --watch
```
