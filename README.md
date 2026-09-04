# Çay Bahçesi Topla

Türk kültürü temalı casual **triple-match / sort** mobil oyunu.
Çay bardağı, Türk kahvesi fincanı, nazar boncuğu, lokum, simit… 7 slot, 30 seviye, 30–90 saniyelik oturumlar.

> **Durum:** Sprint 0 tamam (iskelet + araç zinciri + kalite kapıları). Sprint 1 (core oyun mantığı) sırada.

---

## Teknoloji

| Katman        | Seçim                                            | Kurulu sürüm    |
| ------------- | ------------------------------------------------ | --------------- |
| Framework     | Expo SDK                                         | 57.0.20         |
| Runtime       | React Native / React                             | 0.86.3 / 19.2.3 |
| Dil           | TypeScript (strict + `noUncheckedIndexedAccess`) | 6.0.3           |
| Routing       | Expo Router                                      | 57.0.19         |
| Animasyon     | Reanimated + react-native-worklets               | 4.5.1 / 0.10.1  |
| Gesture       | react-native-gesture-handler                     | 2.32.0          |
| State         | Zustand                                          | 5.0.15          |
| Depolama      | `expo-sqlite/kv-store`                           | 57.0.2          |
| Ses / Haptik  | expo-audio / expo-haptics                        | 57.0.4 / 57.0.2 |
| Test          | Jest + @testing-library/react-native             | 29.7.0 / 14.0.1 |
| Lint / Format | ESLint + Prettier                                | 9.39.5 / 3.9.6  |

### Spec'ten sapmalar ve gerekçeleri

| Spec'te                        | Uygulanan                  | Neden                                                                                                                                                                                                                     |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo SDK 54+                   | **SDK 57**                 | Eylül 2026'nın güncel sürümü.                                                                                                                                                                                             |
| Reanimated v3                  | **v4.5.1**                 | SDK 57 ile gelen sürüm. New Architecture zorunlu; babel plugin `react-native-worklets/plugin`'e taşındı ve `babel-preset-expo` tarafından otomatik ekleniyor.                                                             |
| Gesture Handler v3             | **v2.32.0**                | npm'de `latest` 3.2.1, ama `npx expo install` SDK 57 ile uyumlu olanı seçiyor. Uyumlu sürüm kazanır.                                                                                                                      |
| `expo-av` veya `expo-audio`    | **expo-audio**             | `expo-av` SDK 55'te tamamen kaldırıldı.                                                                                                                                                                                   |
| `react-native-mmkv`            | **`expo-sqlite/kv-store`** | MMKV v4 NitroModules'a geçti → `react-native-nitro-modules` + **zorunlu dev build**, Expo Go çalışmıyor. `kv-store` da senkron (`getItemSync`) ve Expo Go'da çalışıyor. High-score/level için performans farkı ölçülemez. |
| `@testing-library/jest-native` | **kurulmadı**              | Deprecated; matcher'lar RNTL 12.4+ ile ana pakete taşındı.                                                                                                                                                                |

---

## Kurulum

```bash
npm ci
npm start          # QR kodu Expo Go ile okut
```

Web önizleme (hızlı göz kontrolü, birincil hedef değil): `npm run web`
Web `output: "single"` (SPA) modunda — sunucu render'ı ve hidrasyon yok.

## Komutlar

| Komut                | Ne yapar                                                  |
| -------------------- | --------------------------------------------------------- |
| `npm start`          | Expo dev server                                           |
| `npm run lint`       | ESLint, 0 warning toleransı                               |
| `npm run lint:fix`   | Otomatik düzeltme + format                                |
| `npm run typecheck`  | `tsc --noEmit`                                            |
| `npm test`           | Jest                                                      |
| `npm run test:watch` | Jest izleme modu                                          |
| `npm run test:ci`    | Coverage + eşik kontrolü                                  |
| `npm run doctor`     | `expo-doctor` (SDK uyum denetimi)                         |
| **`npm run verify`** | **lint + typecheck + test:ci — commit öncesi DoD kapısı** |

---

## Mimari

```
src/
├── app/                  # Expo Router ekranları (dosya-tabanlı yönlendirme)
│   ├── _layout.tsx       # Kök: GestureHandlerRootView + tema + splash
│   ├── +not-found.tsx
│   └── (tabs)/           # index (oyun) + settings
├── game/
│   ├── core/             # ⚠ SAF TypeScript — platform API import ETMEZ
│   │   ├── types.ts      # Tile/Slot/SlotRow/LevelConfig veri modeli
│   │   ├── rng.ts        # Tohumlu rastgelelik (Daily mod + test determinizmi)
│   │   ├── tiles.ts      # 25 tile, 9 aile, aileye yayan havuz seçimi
│   │   ├── matcher.ts    # 3-yanyana tespit, kaldırma, sıkıştırma, zincir
│   │   ├── generator.ts  # Tray üretimi + no-stuck-state garantisi
│   │   ├── score.ts      # Combo, uzun eşleşme bonusu, perfect-sort
│   │   └── level.ts      # 30 seviyelik formül tabanlı zorluk eğrisi
│   ├── engine/           # Reanimated/Gesture bileşenleri      (Sprint 2)
│   ├── store/            # Zustand                              (Sprint 2)
│   ├── audio/            # expo-audio sarmalayıcı               (Sprint 3)
│   └── data/             # Tile tanımları, level configleri     (Sprint 1/3)
├── components/           # Button, Screen, Themed, useColorScheme
├── hooks/                #                                      (Sprint 2)
└── constants/
    ├── colors.ts         # Palette (ham) + Colors (anlamsal token)
    └── config.ts         # Oyun sabitleri + UI ölçekleri
```

### Neden `game/core` saf TypeScript?

Oyun kuralları (eşleşme, skor, seviye, üretici) hiçbir platform API'sine dokunmaz. Sonuçları:

- Testler **milisaniyeler** içinde koşar — mock, emülatör, native preset yok.
- `%90` coverage eşiği gerçekçi hale gelir.
- Kuralları oynamadan UI'ı baştan yazabilirsin.

Bu kural **iki ESLint kuralıyla birlikte** zorlanıyor ([eslint.config.js](eslint.config.js)):

- `no-restricted-imports` → dış paketler (`react`, `react-native`, `expo*`, `zustand`)
- `import/no-restricted-paths` → proje içi katmanlar. Bu kural **çözülmüş yola** bakar, dolayısıyla `@/game/store/x` ve `../../store/x` aynı şekilde yakalanır.

Ayrıca core'da `require()` yasak (`no-restricted-imports` yalnızca ESM `import`'a bakar) ve kural `.tsx` dosyalarını da kapsar.

### Renk sistemi

İki katman: `Palette` (ham marka renkleri) → `Colors` (anlamsal token'lar). Bileşenler **her zaman** `Colors[tema].token` kullanır.

Kontrast oranları WCAG 2.1 relative luminance formülüyle ölçüldü. Button primary etiket/zemin: **9.33:1 (light)** / **9.20:1 (dark)** — AAA. Sekme etiketi renkleri küçük metin eşiğini (4.5:1) karşılayacak şekilde seçildi: 5.06:1 / 5.26:1.

> ⚠ **Sprint 1/2 uyarısı:** Palette'teki tile renkleri renk körlüğü altında ayırt edilemiyor (ör. `lokumPembe` ↔ `fistikYesil` protanopide 1.04:1). Tile'lar **yalnızca renkle** ayrılamaz — her tile'a ayırt edici sembol/şekil zorunlu (WCAG 1.4.1).

### No-stuck-state garantisi

Spec'in "tüh, mahsur kaldım durumu oluşturma" maddesi somut bir sözleşmeye çevrildi: boş slot sayısı `SAFETY_THRESHOLD`'a düştüğünde tray, ya üçlü tamamlayan ya da bitişik çift kuran bir tile **içermek zorunda**.

Bu garanti ölçümle doğrulanıyor, iddia edilmiyor:

| Oyuncu                  | Kayıp oranı (lvl 1 / lvl 30) |
| ----------------------- | ---------------------------- |
| Yerleştirmesini düşünen | %0 / %0                      |
| %10 hata payı olan      | %2 / %2                      |
| %30 hata payı olan      | %25 / %47                    |
| Tamamen rastgele        | %100 / %100                  |

Yani **üretici adil, kayıp oyuncunun yerleştirme hatasından gelir.** Bir _sort_ oyununda yerleştirme zaten becerinin kendisidir.

### Denge: tahminle değil ölçümle

`src/constants/config.ts`'teki her denge sabiti simülasyonla seçildi. Ölçülen yapısal gerçekler:

- **Eşleşme oranı korunum gereği 1/3'e çivili** — slot/tip sayısından bağımsız.
- Dolayısıyla `puan/hamle = BASE_PER_MATCH × (1/3) + PERFECT_SORT_BONUS × temizleme_oranı`; zorluk eğrisinin tamamı temizleme oranından gelir.
- Sonuç: 30 seviyenin **30'u da** p50 olarak 30-90 sn hedef bandında.

### Coverage eşikleri

[jest.config.js](jest.config.js) iki ayrı eşik uygular:

- `src/game/core/**/*.ts` → **%90, dosya başına** (GLOB grubu)
- global → **%70**

> İki not: (1) Jest, yola özel eşiği olan dosyaları global kovadan **çıkarır** — "global %70" core hariç geri kalandır. (2) GLOB kullanılıyor, PATH değil; PATH olsaydı eşik _toplama_ uygulanır ve core büyüdükçe iyi test edilmiş dosyalar kötüleri maskelerdi.

`src/constants/**` kapsam dışıdır: saf `as const` veri, herhangi bir test import ettiği anda %100 olur ve hiçbir mantık doğrulamadan yüzdeyi şişirir. İçeriğini [config.test.ts](src/constants/__tests__/config.test.ts) invariant sözleşmeleri korur.

**Başka dışlama yoktur** — ekranlar dahil tüm `src/` ölçülüyor. Kapsanmayan tek şey, devre dışı "Oyna" butonunun Sprint 2'de bağlanacak boş `onPress`'i.

---

## Kalite kapıları

**Her commit'te (Husky pre-commit):** `lint-staged` (eslint --fix + prettier) → `typecheck`
**Her push'ta (Husky pre-push):** `npm run verify`
**CI'da ([.github/workflows/ci.yml](.github/workflows/ci.yml)):** `npm ci` → lint → typecheck → coverage → `expo-doctor`

---

## Yol haritası

- [x] **Sprint 0** — İskelet, TS strict, ESLint/Prettier, Jest, Husky, CI, multi-agent kalite kapısı
- [x] **Sprint 1** — Core mantık (tiles, generator, matcher, level, score) TDD ile
- [ ] **Sprint 2** — Render + gesture (SlotRow, TilePicker, animasyonlar)
- [ ] **Sprint 3** — Kalıcılık, ses, 30 seviye, ayarlar
- [ ] **Sprint 4** — EAS build, mağaza yayını

## Lisans

MIT — bkz. [LICENSE](LICENSE)
