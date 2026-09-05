# Çay Bahçesi Topla — Ajan Notları

Türk temalı triple-match mobil oyun. Expo SDK 57 + TypeScript strict + TDD.

## Değişmez kurallar

1. **`src/game/core/**` saf TypeScript.** Platform API'si (`react`, `react-native`, `expo*`, `zustand`) import etme. İki ESLint kuralı birlikte zorluyor: `no-restricted-imports` (dış paketler) + `import/no-restricted-paths` (proje içi katmanlar — göreli `../..` yolları da yakalar). Platform kodu `engine/`, `store/` veya `audio/` katmanına gider.
2. **Çıplak sayı yok.** Ayarlanabilir her değer [src/constants/config.ts](src/constants/config.ts) içinde — oyun sabitleri _ve_ UI ölçüleri (`SPACING`, `TYPO`, `RADIUS`, `OPACITY`, `ICON`).
3. **`any` yok.** TS strict + `noUncheckedIndexedAccess` açık.
4. **Inline style yok.** `StyleSheet.create` kullan. Runtime değeri gerekiyorsa `style={[styles.x, { renk }]}` serbest. ESLint `/[Ss]tyle$/` ile biten **tüm** prop'ları denetler (`contentContainerStyle`, `tabBarStyle`…).
5. **Her feature'a en az 1 test.** `core/` **dosya başına** %90, global %70 — CI'da zorunlu.
6. **Commit öncesi `npm run verify`.**

## Test yazarken (Sprint 1'de pahalıya öğrenildi)

### Sayaç sıfırdan başlayan test VAKUMDUR

```ts
let violations = 0;
playGame({ onBeforeMove: (...) => { if (bad) violations++ } });
expect(violations).toBe(0);   // ← callback hiç çalışmasa da GEÇER
```

Mutasyon testiyle yakalandı: `onBeforeMove` çağrısı tamamen silindiğinde projenin amiral gemisi "no-stuck-state garantisi" testi yine yeşil geçiyordu. **Kural:** bir şeyin _olmadığını_ iddia etmeden önce, denetimin _yapıldığını_ iddia et.

```ts
expect(audits).toBeGreaterThan(SEEDS * 10);
expect(pressureSeen).toBeGreaterThan(0);
expect(violations).toBe(0);
```

### %100 coverage ≈ %67 mutasyon skoru

Sprint 1'de 48 mutant denendi, 16'sı hayatta kaldı. Coverage "çalıştırıldı" demek, "doğrulandı" demek değil. Yeni bir invaryant yazarken sor: **bu kuralı tersine çevirsem hangi test kırılır?** Kırılan yoksa test değil, dekorasyon.

### İnvaryantı DOĞRU eksende yaz — bu hata üç kez tekrarlandı

Aynı hata sınıfı, üç farklı eksende:

| #        | Test neyi ölçüyordu                                                                 | Ekranda/oyunda ne var                                                                                                   | Nasıl anlaşıldı    |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Sprint 1 | "Aynı ailedeki tile'lar farklı forma sahip" — oyunda **hiç gerçekleşmeyen** senaryo | Havuzların %99.83'ünde form çakışması vardı                                                                             | mutasyon           |
| Sprint 2 | `FAMILY_COLOR` (9 taban renk) üzerinde renk körlüğü ΔE                              | Ekranda `TILE_COLOR` **varyantları** görünüyor (25 renk, 277 çift) — min ΔE 10.0 değil **1.66**                         | refactor ajanı     |
| Sprint 2 | `rowWidth` = tile'lar + boşluklar                                                   | Bileşen ayrıca `paddingHorizontal` çiziyordu — 21 kombinasyonun **19'unda** satır 1-8pt taşıyor, test "sığıyor" diyordu | kod inceleme ajanı |

**Ortak belirti — bunu arayın:** ölçülen tablo/fonksiyon **üretimde hiç tüketilmiyordu.** `FAMILY_COLOR` yalnızca kendi testinde geçiyordu. Bir garantinin dayandığı şey üretim kodunda kullanılmıyorsa, garanti yanlış eksende demektir.

**Testi kodun yapısına değil, oyunun gerçeğine göre yaz.** Ölçüm doğru olabilir; sorulması gereken **ölçülen şeyin doğru olup olmadığıdır.**

### Test yardımcıları da ölçülür

`__tests__/helpers/**` bilerek `collectCoverageFrom` içinde. Property testlerinin tamamı `playGame`'e dayanıyor; ölçüm dışında kalırsa "garanti" iddiaları doğrulanmamış koda yaslanır.

### Geçici ölçüm dosyaları: `zz-` öneki

Keşif/tuning dosyalarını `src/**/__tests__/zz-*.test.ts` olarak adlandır — `jest.config.js` `testPathIgnorePatterns` onları DoD kapısından dışlar, `.gitignore` commit'lenmelerini engeller. (Yaşandı: geçici tarama dosyaları `npm run verify`'ı 137 lint hatasıyla düşürdü ve test süresini 6 sn → 96 sn çıkardı.)

## Kod konvansiyonları

### `noUncheckedIndexedAccess`: TEK konvansiyon

İndis kanıtlanabilir şekilde sınır içindeyse **`!` + yerinde gerekçe** yaz. Ulaşılamaz `undefined` dalı **ekleme** — test edilemez ölü kod üretir ve branch coverage'ı yanıltır (Istanbul `||` için sadece operand değerlendirmesini sayar, o dalın erişilebilir olduğunu kanıtlamaz).

```ts
// index < row.length -> undefined imkansiz; yalnizca null anlamli.
const slot = row[index]!;
```

Sınır _dışı_ erişim (`row[i - 1]`) gerçekten `undefined` dönebilir — orada kontrol meşrudur.

### Config'e sayıyı koymak yetmez — İLİŞKİYİ koy

`INSERT_UI.TOUCH_PADDING: 14` yazılmıştı ve yorumu "hitSlop ile HIG/Material eşiğine tamamlanır" diyordu. Aritmetik: `4 + 2×14 = 32pt`, oysa `TOUCH.MIN_TARGET` 48. **Yorum bir şey iddia ediyor, sayı başkasını söylüyordu** — üç ajan bunu birbirinden bağımsız buldu.

Türetilebilen değeri türet, sonra ilişkiyi teste yaz:

```ts
TOUCH_PADDING: (TOUCH.MIN_TARGET - INSERT_INDICATOR_WIDTH) / 2,
```

```ts
expect(INSERT_UI.WIDTH + 2 * INSERT_UI.TOUCH_PADDING).toBeGreaterThanOrEqual(TOUCH.MIN_TARGET);
```

Aynı sınıftan ikinci bulgu: `left = GAP + i*step - GAP/2 - WIDTH/2` formülü **yalnızca `INSERT_UI.WIDTH <= TILE_UI.GAP` olduğu için** doğruydu (4 === 4, tesadüfen). Ne belgeliydi ne test edilmişti. Bir formül iki sabitin ilişkisine dayanıyorsa o ilişki `config.test.ts`'e yazılır.

### Boş-koleksiyon sorununu tipe taşı

Çalışma zamanı guard'ı yerine tip kullan: ne ulaşılamaz `throw` ne sessiz bozulma kalır.

```ts
type NonEmptyPool = readonly [TileId, ...TileId[]];
function assertNonEmptyPool(p: readonly TileId[]): asserts p is NonEmptyPool { ... }
```

## Oyun modeli — ölçülmüş gerçekler

- **Eşleşme oranı 1/3'e çivilidir.** Korunum: hamle başına 1 tile girer, eşleşme başına 3 çıkar. Slot sayısı, tip sayısı, `BOARD_BIAS`, ağırlıklar — hiçbiri bunu değiştiremez. Ölçüldü: 0.329 / 0.328 / 0.326.
- **Zorluk eğrisi tek değişkenden gelir:** `puan/hamle = BASE_PER_MATCH × (1/3) + PERFECT_SORT_BONUS × temizleme_oranı`. Bonus 0 yapılırsa eğri tamamen kaybolur.
- **Model: EKLEME (insertion), sabit slot değil.** Oyuncu tile'ı boş bir slota koymaz, mevcut tile'ların _arasına_ ekler; satır sağa kayar. Kapasite sabittir, satır dolunca oyun biter.
  Neden değiştirildi (ölçümle): sabit-slot + collapse modelinde tahta bir **yığına** dönüşüyordu — dolu bloğun sağındaki tek slot "komşusu olan" slot olduğu için düşünen oyuncu hamlelerinin **%100'ünde** oraya koyuyordu; 80.000 hamlede **0 zincir** oluştu. Yani spec'in "Combo x3!" banner'ı imkânsızdı ve "istediğin yere koy" vaadi karşılıksızdı.
  Ekleme modelinden sonra "sona ekle" oranı **%17.6**'ya düştü — konum seçimi gerçek bir karar.
- **Zincir (cascade) mümkün ama nadir.** İki grubun arasına ekleyip onları birleştirmek gerekir: `[A A B B A A]` + araya B → BBB gider → AAAA gider (2 adım, 7 tile). Açgözlü oyun üçlüyü anında aldığı için aynı tipten iki grup nadiren birlikte bulunur — zincir, grubu bilerek **bölen** oyuncunun ödülü, yani beceri tavanı. `COMBO_MAX` bu yüzden yapısal sınıra (`floor(SLOTS.MAX / MATCH.LENGTH) = 3`) çekildi; 5 ulaşılamazdı.
- **`SAFETY_THRESHOLD` tek taşıyıcı sabittir.** Kapatılırsa kusursuz oyuncu bile %100 kaybediyor.
- Denge sabitleri tahminle değil **ölçümle** seçildi. Değiştirmeden önce simüle et: `src/game/core/__tests__/helpers/policies.ts` içindeki `playGame` + politikalar hazır.

## Sprint 2'de öğrenilenler

### Reanimated 4 Jest'te resolver ister

`react-native-worklets` JSI'ya erişiyor ve testte `Cannot read properties of undefined (reading 'loadUnpackers')` ile patlıyor. Paketin çözümü `react-native-worklets/jest/resolver.js`, ama **doğrudan kullanılamaz**: jest-expo zaten `@react-native/jest-preset/jest/resolver` kuruyor ve Jest tek bir `resolver` kabul ediyor. [jest.resolver.js](jest.resolver.js) ikisini birleştirir.

### Erişilebilirlik kanalını font desteğine emanet etme

Form işaretlerini `⬢ ★ ☾` gibi metin sembolleriyle çizmek cazip. Ama Android'de bir glif eksikse tofu kutusu çıkar ve **renk körlüğü kanalının tamamı kaybolur**. Her form düz `View` ile çiziliyor (borderRadius / transform / üçgen kenarlık hilesi).

### Yerleşimi test edilebilir yap

`computeTileSize` bileşen içinde inline hesaplanabilirdi. Ayrı dosyada olduğu için ilk testte **satırın hiçbir telefona sığmadığı** ortaya çıktı (320pt ekranda 352pt). Sebep: ekleme göstergeleri layout genişliği tüketiyordu. Mutlak konumlandırmaya geçildi. Bu, cihazda görülene kadar fark edilmezdi.

### Store'u `setState` ile değiştirince test render etmez

`useGameStore.setState(...)` React olayı dışında olduğu için bileşen güncellenmez. RNTL'in `act`'ı ile sar:

```ts
await act(async () => {
  useGameStore.setState({ status: 'oyun-bitti' });
});
```

### Platform kontrolünü modül sabitine koyma

`const SUPPORTED = Platform.OS === 'ios'` yazarsan testte platformu değiştiremezsin ve test "fonksiyon var mı" demekten öteye gidemez. Çağrı anında oku (`isSupported()`) — maliyeti bir özellik erişimi, karşılığı gerçek bir test.

### Reanimated: animasyon config'i MODÜL SEVİYESİNDE olmalı

`layout={LinearTransition.duration(X)}` render içinde yazılırsa her render'da **yeni nesne** üretir. Reanimated'in `_configureLayoutAnimation`'ı `currentConfig === previousConfig` **kimlik** kontrolü yapar ([AnimatedComponent.js:224,268](node_modules/react-native-reanimated/lib/module/createAnimatedComponent/AnimatedComponent.js)) — kontrol her zaman düşer ve layout animasyonu **her commit'te yeniden kaydedilir** (`createSerializable` + JSI batch).

Ölçüldü (aynı koşu içinde dönüşümlü A/B, 9 tile): **2.03 ms → 11.56 ms**, commit başına ceza **6.6-9.5 ms** — 16.67 ms kare bütçesinin yarısından fazlası. Jest'te worklet serileştirmesi mock'lu olduğu için cihazdaki maliyet daha yüksek olabilir.

Sessiz tuzak: config'i tekrar render içine alan biri hiçbir testi kırmaz. `SlotRow`/`TilePicker`/`ComboBanner` sabitleri modül seviyesinde tutulmalı.

### `React.memo` yalnızca callback KARARLIYSA kazandırır

Ölçüldü, 12 tile:

| kurulum                  | süre        | render |
| ------------------------ | ----------- | ------ |
| memo yok                 | 5.6 ms      | 12/12  |
| memo + kararlı `onPress` | **0.29 ms** | 0/12   |
| memo + inline `onPress`  | **11.7 ms** | 12/12  |

`memo`'yu `useCallback` olmadan eklemek düz halden **2× yavaş** — karşılaştırma maliyeti eklenir, kazanç sıfır. İkisi birlikte yapılır ya da hiç yapılmaz.

**Optimize ETMEYİN (ölçüldü, bütçenin %0.01'i):** `computeTileSize` (0.0015 ms), `getTileDefinition` ×12 (<0.0001 ms), `tilesOf`+`insertPositions`+`map` (0.0016 ms). `useMemo` sarmalayıcısı bunlardan pahalı.

### Renk metriği: lineer RGB değil CIELAB

Lineer RGB'de Euclid mesafesi karanlık uçta sıkışır; iki koyu renk algısal olarak rahat ayrılsa bile küçük değer verir. Palet ölçümünde tam bu yaşandı — `kahve/nazar/cay` üçlüsü "çok yakın" görünüyordu, CIELAB'da 20+ ΔE ile ayrıktılar. **Yanlış olan palet değil metrikti.**

### Ekran testlerinde tohumu SABİTLE

`GameScreen` `startLevel(level)`'i tohumsuz çağırır → `Math.random()`. Sonuç: **kapsam yüzdesi koşudan koşuya değişiyordu** (ölçüldü: `[level].tsx` 100/96 → 97.22/88 → 97.22/88). Global eşik %70 olduğu için kapı düşmüyordu ama raporlanan rakam tekrarlanabilir değildi. `beforeEach`'te `jest.spyOn(Math, 'random')` + LCG ile sabitlendi; üç ardışık koşu artık birebir aynı.

Yan fayda: `startLevel` tohum için **tam olarak bir** `Math.random()` çağırır (havuz/tepsi tohumlanmış `Rng`'den gelir), yani **random çağrı sayısı = kurulum sayısı**. "Sonraki seviye seviyeyi bir kez kurar" regresyonu böyle ölçülüyor.

### Ekran okuyucu: etiket ≠ geri bildirim

Sprint 2'de etiketleme kusursuzdu — her hedefin adı, rolü, ipucu vardı, `insertLabel` ekleme modelini kelimeye çeviriyordu. Yine de erişilebilirlik denetimi **P0** verdi: _"görme engelli bir oyuncu bu oyunu şu an oynayamaz."_ Sebep: `announceForAccessibility` kod tabanında **sıfır** kez geçiyordu. Oyuncu hamle _yapabiliyor_, hamlenin _ne yaptığını_ öğrenemiyordu.

Kural: **her durum değişikliğinin bir duyuru kanalı olmalı.** `accessibilityLiveRegion` yetmez — yalnızca Android'de çalışır.

Üç ek tuzak aynı denetimden:

- **`allowFontScaling` erişilebilirliği BOZABİLİR.** Glif `Text`'inde açık kalınca iOS AX5 (~3×) ölçeğinde 26pt tile'da 34pt glif oluşuyor, kırpılıyor ve **altındaki `ShapeMark`'ı kapatıyor** — yazıyı büyüten az gören kullanıcı, tam da düşük görüş için tasarlanan birincil form kanalını kaybediyor. Dekoratif, ölçüsü kabına bağlı metinlerde `allowFontScaling={false}` doğru karardır.
- **Mutlak konumlu dekoratif katman `pointerEvents="none"` almalı.** `ComboBanner` `SlotRow`'un üstüne düşüyordu; RN'de dokunma en üstteki hit-test'i geçen View'e gider, **kardeşe düşmez** → satırın ortasındaki ekleme konumları tıklanamaz hale geliyordu.
- **Devre dışı bırakılmayan kontrol yalan söyler.** Oyun bittikten sonra tepsi basılabilir kalıyor, `haptic('sec')` titreşim veriyor, store sessizce reddediyordu. Sprint 0'da ana ekran için yazılan kural burada ihlal edilmişti: _"butonu etkin bırakıp hiçbir şey yapmamak, ekran okuyucu kullanıcısına yerine getirilmeyen bir vaat verir."_

### RNTL: `accessibilityViewIsModal` arkadaki ağacı SORGULARDAN da gizler

Bitiş overlay'ine modal işareti konunca `getByTestId('tepsi-tile-0')` artık bulamaz — bu **istenen davranıştır** (ekran okuyucu odağı overlay'e hapsolur). Arkadaki elemanı test edecekseniz açıkça isteyin:

```ts
screen.getByTestId('tepsi-tile-0', { includeHiddenElements: true });
```

Aynısı `accessibilityElementsHidden` için de geçerli (glif `Text`'i).

### Store singleton + effect sırası = bayat duyuru

`useGameStore` bir singleton. Ekrana geri dönüldüğünde önceki oyunun `moves` değerini taşıyor olabilir. Effect'ler bildirim sırasıyla koşar: `startLevel` etkisi state'i sıfırlayana kadar sonraki effect'in render closure'ı **hâlâ eski `moves`'u görür** ve bayat bir hamleyi duyurur. Testte yakalandı (açılışta 1 yerine 2 duyuru) — üretimde de gerçek bir hataydı.

Çözüm: mount'ta **taban al, duyurma** (`useRef<string | null>(null)`).

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

**Ek tuzak:** `.gitignore`'da `/android` var, yani prebuild'in ürettiği `android/` klasörü **silinmese bile `git status` temiz görünür**. Bu adımı `git status` ile doğrulamak sahte güven verir — `test -d android` ile bak.

### CI hiç çalışmadı

`git remote -v` boş. `.github/workflows/ci.yml` yerel olarak simüle edildi ama GitHub'da bir kez bile koşmadı; `actions/checkout@v7` vb. sürümleri API'den doğrulandı, pratikte değil. İlk push'ta doğrula.

### `jest.resetModules()` React kimliğini bozar

Modül yeniden yüklemek için `resetModules`/`isolateModules` kullanırsan, test edilen modül RNTL'inkinden **farklı bir React** alır → `Cannot read properties of null (reading 'useEffect')`. Modül seviyesindeki yan etkiyi test etmek istiyorsan, hata işleyicisini ayrı bir fonksiyon olarak dışa aç (`warnSplashFailure` kalıbı).

### `tsconfig.json` → `types` alanı açıkça yazılmalı

`expo/tsconfig.base` ile `@types/jest` otomatik yüklenmiyor. `"types": ["jest", "node"]` şart.

### `@types/jest` Jest 29 hattına sabit

`jest-expo@57` tüm zincirini Jest **29** üzerine kuruyor. `@types/jest@30` kurarsan `expo-doctor` düşer. `~29.5.14` kullan.

### `eslint-plugin-react-native` artık yok

`eslint-config-expo@57` düşürdü (upstream bakımsız). `react-native/no-inline-styles` çalışmaz — yerine [eslint.config.js](eslint.config.js) içinde AST seçicili `no-restricted-syntax` var.

### Windows: `node_modules` junction + `git worktree remove --force` = felaket

Sprint 1 bundle'ını ölçmek için worktree'ye `node_modules` junction'ı kuruldu. `git worktree remove --force` **junction'ın içine girip gerçek `node_modules`'ün bir kısmını sildi** (`expo` dahil). Onarım `rm -rf node_modules && npm ci`.

Junction yerine gerçek kopya ya da `--no-checkout` kullanın. (Aynı oturumda `npx --yes jest@30` de ağacı yeniden çözüp `node_modules`'ü boşalttı — geçici araçları `npx --yes <paket>@<farklı sürüm>` ile çalıştırmayın.)

### `expo prebuild` mutasyonu DETERMİNİSTİK DEĞİL

CLAUDE.md "`package.json`'ı sessizce değiştirir" diyordu. Prebuild boyunca 400 kez md5 örneklendi: mutasyon **her koşuda kalıcı olmuyor** — bir koşuda geri döndü, enstrümante koşuda kaldı. Yani "bir kez baktım, temizdi" güvenilmez. Kural sertleşti: prebuild sonrası **her zaman** `git checkout -- package.json`.

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
- **Renk körlüğü tavanı 5.6 ΔE, eşik 10 DEĞİL.** Ekranda görünen 25 rengin 277 aile-çaprazı çiftinde ölçülen en yakın çift. Sprint 2'de 1.66'ydı (iki aile pratikte aynı renkti); kısıtlı optimizasyonla (aile kimliği ΔL* ≤ 14, aile içi ayrım gerilemesin, mürekkep ölü bölgesi dışı) 5.6'ya çıkarıldı. Kısıtsız optimizasyon 9.38 veriyor **ama** `denizKayik`'i `#0D2422`'ye itiyor — artık "deniz" değil. 10'un üzerine çıkmak **varyant sayısını azaltmayı** gerektirir; Sprint 3 kararı. Bugün kabul edilebilir olmasının sebebi formun birincil kanal olması ve bunun matematiksel garanti olması. Test bir **mandaldır (ratchet)**, hedef değil.
- **Web ikincil hedeftir, SPA modunda.** `npm run web` hızlı göz kontrolü için; birincil hedef iOS + Android. `output: "single"` seçildi → sunucu render'ı ve hidrasyon yok. Bu sayede `+html.tsx`, `useClientOnlyValue` (native + web) ve `useColorScheme.web.ts` dosyalarının hepsi silindi; jest-expo çok-platformlu `projects` kurulumu ihtiyacı da ortadan kalktı.

## Komutlar

```bash
npm run verify     # lint + typecheck + coverage — DoD kapısı
npm run doctor     # expo-doctor, SDK uyumu
npm test -- --watch
```
