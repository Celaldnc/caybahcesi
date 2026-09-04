# Çay Bahçesi Topla — Ajan Notları

Türk temalı triple-match mobil oyun. Expo SDK 57 + TypeScript strict + TDD.

## Değişmez kurallar

1. **`src/game/core/**` saf TypeScript.** Platform API'si (`react`, `react-native`, `expo*`, `zustand`) import etme. İki ESLint kuralı birlikte zorluyor: `no-restricted-imports` (dış paketler) + `import/no-restricted-paths` (proje içi katmanlar — göreli `../..` yolları da yakalar). Platform kodu `engine/`, `store/` veya `audio/` katmanına gider.
2. **Çıplak sayı yok.** Ayarlanabilir her değer [src/constants/config.ts](src/constants/config.ts) içinde — oyun sabitleri _ve_ UI ölçüleri (`SPACING`, `TYPO`, `RADIUS`, `OPACITY`, `ICON`).
3. **`any` yok.** TS strict + `noUncheckedIndexedAccess` açık.
4. **Inline style yok.** `StyleSheet.create` kullan. Runtime değeri gerekiyorsa `style={[styles.x, { renk }]}` serbest. ESLint `/[Ss]tyle$/` ile biten **tüm** prop'ları denetler (`contentContainerStyle`, `tabBarStyle`…).
5. **Her feature'a en az 1 test.** `core/` **dosya başına** %90, global %70 — CI'da zorunlu.
6. **Commit öncesi `npm run verify`.**

## Bu projede yanan tuzaklar (tekrar düşme)

### RNTL v14: `render` ve `fireEvent` **async**

```tsx
await render(<Button label="Oyna" onPress={fn} />);
await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
```

`await` unutulursa test `render function has not been called` ile patlar — ama **typecheck temiz geçer**, çünkü dönen Promise kullanılmıyor. Negatif iddialı testlerde (`expect(fn).not.toHaveBeenCalled()`) ise **sessizce geçer**.
Kaldırılan API'ler: `toHaveAccessibilityHint` (→ `toHaveProp('accessibilityHint', …)` veya `getByHintText`), `UNSAFE_getByType` (→ açık `testID` ver).
TODO(sprint-1): `@typescript-eslint/no-floating-promises` ile bu sınıf hatayı derlemede yakala.

### `useColorScheme` `null` döndürebilir — RN'in tip beyanı yanlış

```
Appearance.d.ts:51    useColorScheme(): ColorSchemeName      <- null YOK
useColorScheme.js:23  export default function (): ?ColorSchemeName   <- null VAR
Appearance.js:76      let colorScheme = null                 <- kaynağı
```

`strict: true` bunu göremez. Bu yüzden [useColorScheme.ts](src/components/useColorScheme.ts) **izin listesi** kullanır (`=== 'dark' ? 'dark' : 'light'`), blok listesi değil. Regresyon testi: [useColorScheme.test.tsx](src/components/__tests__/useColorScheme.test.tsx).
**Genel ders:** `node_modules` içindeki `.d.ts` dosyaları tip güvenliğinin sınırıdır. Bir üçüncü parti değerini indeksliyorsan (`Colors[x]`), izin listesiyle daralt.

### `useSyncExternalStore`: `getSnapshot` referansı kararlı olmalı

`() => client` yazarsan ve çağıran obje/dizi geçerse, `Object.is` her render'da farklı referans görür → `forceStoreRerender` → **sonsuz döngü**. React'in "getSnapshot should be cached" DEV uyarısı bu durumda **ateşlenmez** (aynı render'daki iki çağrı aynı referansı döner) — sessiz donma. Anlık görüntü daima **boolean/primitif** olsun ve `subscribe`/`getSnapshot` modül seviyesinde sabit tutulsun. (Bu tuzağa düşen `useClientOnlyValue` SPA geçişiyle tamamen silindi; kural Sprint 2'de store yazarken geçerli.)

### Web `output: "single"` (SPA) — `+html.tsx` çalışmaz

`web.output` `single` iken Expo kendi `index.html`'ini üretir; `+html.tsx` **hiç okunmaz** (deneysel olarak doğrulandı: export çıktısında `+html.tsx`'teki renk yok). HTML kabuğunu özelleştirmek için `app.json` → `web.*` anahtarlarını kullan:
`lang: "tr"` gerçekten `<html lang="tr">` üretir. `web.backgroundColor` ise SPA çıktısında karşılıksızdır (PWA manifest üretilmiyor) — üst seviye `expo.backgroundColor` kullan, `expo-system-ui` ile native'de de çalışır.
Aynı sebeple hidrasyon yoktur: `useClientOnlyValue` gibi "sunucuda X, istemcide Y" sarmalayıcılarına gerek yok.

### Reanimated 4: babel plugin'i elle **ekleme**

`babel-preset-expo`, `react-native-worklets` kurulu olduğunu görünce plugin'i otomatik ekler ([expo.js:96-101](node_modules/babel-preset-expo/build/configs/expo.js)). Dokümanın dediği gibi elle eklemek **gereksiz tekrardır**. (Ölçüldü: bu sürümlerde çift dönüşüm üretmiyor, çıktı bayt bayt aynı — ama gerek yok ve gelecekte davranış değişirse risk.)

### `expo prebuild` `package.json`'ı sessizce değiştirir

`"android": "expo start --android"` → `expo run:android` yapar. `--no-install` bunu engellemez. CI'a prebuild eklersen working tree kirlenir. Çalıştırdıysan `git checkout -- package.json`.

### `jest.resetModules()` React kimliğini bozar

Modül yeniden yüklemek için `resetModules`/`isolateModules` kullanırsan, test edilen modül RNTL'inkinden **farklı bir React** alır → `Cannot read properties of null (reading 'useEffect')`. Modül seviyesindeki yan etkiyi test etmek istiyorsan, hata işleyicisini ayrı bir fonksiyon olarak dışa aç (`warnSplashFailure` kalıbı).

### `tsconfig.json` → `types` alanı açıkça yazılmalı

`expo/tsconfig.base` ile `@types/jest` otomatik yüklenmiyor. `"types": ["jest", "node"]` şart.

### `@types/jest` Jest 29 hattına sabit

`jest-expo@57` tüm zincirini Jest **29** üzerine kuruyor. `@types/jest@30` kurarsan `expo-doctor` düşer. `~29.5.14` kullan.

### `eslint-plugin-react-native` artık yok

`eslint-config-expo@57` düşürdü (upstream bakımsız). `react-native/no-inline-styles` çalışmaz — yerine [eslint.config.js](eslint.config.js) içinde AST seçicili `no-restricted-syntax` var.

### Windows: satır sonları

[.gitattributes](.gitattributes) ile depo LF'e sabit. Python'la dosya yazarken `newline='\n'` ver; yoksa Prettier "Delete ␍" hatası yağar.

### Türkçe kesme işareti JSX içinde

`'` karakteri `react/no-unescaped-entities` tetikler. Tipografik `’` (U+2019) kullan — hem doğru tipografi hem lint temiz. Ekleri de doğru yaz: "Sprint 3’te", "Seviye 3’ü" (ünlü uyumu).

### `app.json`'da `newArchEnabled` yok

SDK 55'ten beri New Architecture zorunlu; bayrak şemadan kaldırıldı. Eklersen `expo-doctor` düşer.

### `expo-audio` varsayılanları mikrofon izni ekler

Düz string olarak yazılırsa Android'e `RECORD_AUDIO` + `FOREGROUND_SERVICE`, iOS'a `NSMicrophoneUsageDescription` ekler. Bir match-3 oyunu için Play Data Safety / Apple review sorunudur. [app.json](app.json)'da açıkça kapatıldı:
`["expo-audio", { "microphonePermission": false, "recordAudioAndroid": false, "enableBackgroundPlayback": false }]`

### Jest coverage eşiği: **GLOB** kullan, PATH değil

`'./src/game/core/'` bir **PATH** grubudur → eşiği _toplama_ uygular; core büyüdükçe iyi test edilmiş dosyalar kötüleri maskeler. `'./src/game/core/**/*.ts'` bir **GLOB**'dur → eşiği **dosya başına** uygular. Ayrıca yola özel eşiği olan dosyalar global kovadan **çıkarılır**.

## Bilinen, kabul edilmiş durumlar

- **`npm audit`: 14 moderate.** `npm audit --audit-level=high` → exit 0, yüksek/kritik yok.
  - `uuid` ← `xcode` ← `@expo/config-plugins`: gerçekten **yalnızca build-time** (prebuild/Node), Metro'ya girmiyor.
  - `decode-uri-component` ← `query-string` ← `expo-router`: **bundle'a giriyor** (expo-router runtime modülleri modül seviyesinde `require` ediyor). Ancak açık yalnızca `parse()` yolundan erişilebilir ve expo-router o fonksiyonu fork'layıp native `URLSearchParams`'a çevirmiş — çağrılmıyor. Yani _sömürülebilir değil, ama "build-time only" de değil_: gemide taşınan ölü kod. Uygulama kodundan **asla** `queryString.parse` çağırma.
  - `npm audit fix --force` Expo'yu kırar — **çalıştırma**.
- **Kalan tek coverage boşluğu** (bilinçli): `(tabs)/index.tsx`'teki devre dışı butonun boş `onPress`'i — Sprint 2'de router'a bağlanacak.
- **Web ikincil hedeftir, SPA modunda.** `npm run web` hızlı göz kontrolü için; birincil hedef iOS + Android. `output: "single"` seçildi → sunucu render'ı ve hidrasyon yok. Bu sayede `+html.tsx`, `useClientOnlyValue` (native + web) ve `useColorScheme.web.ts` dosyalarının hepsi silindi; jest-expo çok-platformlu `projects` kurulumu ihtiyacı da ortadan kalktı.

## Komutlar

```bash
npm run verify     # lint + typecheck + coverage — DoD kapısı
npm run doctor     # expo-doctor, SDK uyumu
npm test -- --watch
```
