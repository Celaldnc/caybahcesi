# Çay Bahçesi Topla

Türk kültürü temalı casual **triple-match / sort** mobil oyunu.
Çay bardağı, Türk kahvesi fincanı, nazar boncuğu, lokum, simit… 7 slot, 30 seviye, 30–90 saniyelik oturumlar.

> **Durum:** Sprint 0 tamam (iskelet + araç zinciri). Sprint 1 (core oyun mantığı) sırada.

---

## Teknoloji

| Katman       | Seçim                                            | Sürüm           |
| ------------ | ------------------------------------------------ | --------------- |
| Framework    | Expo SDK                                         | 57.0.20         |
| Runtime      | React Native / React                             | 0.86.3 / 19.2.3 |
| Dil          | TypeScript (strict + `noUncheckedIndexedAccess`) | 6.0.3           |
| Routing      | Expo Router                                      | 57.0.19         |
| Animasyon    | Reanimated (+ react-native-worklets)             | 4.5.1 / 0.10.1  |
| Gesture      | react-native-gesture-handler                     | 3.2.1           |
| State        | Zustand                                          | 5.x             |
| Depolama     | `expo-sqlite/kv-store`                           | 57.0.2          |
| Ses / Haptik | expo-audio / expo-haptics                        | 57.x            |
| Test         | Jest + @testing-library/react-native             | 29.7 / 14.0.1   |

### Spec'ten sapmalar ve gerekçeleri

| Spec'te                        | Uygulanan                  | Neden                                                                                                                                                                                                                                                                                           |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo SDK 54+                   | **SDK 57**                 | Eylül 2026'nın güncel sürümü.                                                                                                                                                                                                                                                                   |
| Reanimated v3                  | **v4.5.1**                 | SDK 57 ile gelen sürüm. New Architecture zorunlu; babel plugin `react-native-worklets/plugin`'e taşındı.                                                                                                                                                                                        |
| `expo-av` veya `expo-audio`    | **expo-audio**             | `expo-av` SDK 55'te tamamen kaldırıldı.                                                                                                                                                                                                                                                         |
| `react-native-mmkv`            | **`expo-sqlite/kv-store`** | MMKV v4 NitroModules'a geçti → `react-native-nitro-modules` + **zorunlu dev build**, Expo Go çalışmıyor. `kv-store` da senkron (`getItemSync`) ve Expo Go'da çalışıyor. High-score/level için performans farkı ölçülemez. Depolama `StoragePort` arayüzü arkasında; adapter değişimi ~20 satır. |
| `@testing-library/jest-native` | **kurulmadı**              | Deprecated; matcher'lar RNTL 12.4+ ile ana pakete taşındı.                                                                                                                                                                                                                                      |

---

## Kurulum

```bash
npm ci
npm start          # QR kodu Expo Go ile okut
```

Web önizleme (hızlı göz kontrolü için): `npm run web`

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
│   ├── _layout.tsx       # Kök: GestureHandlerRootView + tema
│   └── (tabs)/           # index (oyun) + settings
├── game/
│   ├── core/             # ⚠ SAF TypeScript — RN/React/Expo import ETMEZ
│   │   └── rng.ts        # Tohumlu rastgelelik (Daily mod + test determinizmi)
│   ├── engine/           # Reanimated/Gesture bileşenleri      (Sprint 2)
│   ├── store/            # Zustand                              (Sprint 2)
│   ├── audio/            # expo-audio sarmalayıcı               (Sprint 3)
│   └── data/             # Tile tanımları, level configleri     (Sprint 1/3)
├── components/           # Paylaşılan UI (Button, Themed…)
├── hooks/
└── constants/            # colors.ts (palet) + config.ts (tüm ayarlanabilir sayılar)
```

### Neden `game/core` saf TypeScript?

Oyun kuralları (eşleşme, skor, seviye, üretici) hiçbir platform API'sine dokunmaz. Sonuçları:

- Testler **milisaniyeler** içinde koşar — mock, emülatör, native preset yok.
- `%90` coverage eşiği gerçekçi hale gelir.
- Kuralları oynamadan UI'ı baştan yazabilirsin.

Bu kural **otomatik zorlanıyor**: [eslint.config.js](eslint.config.js) içindeki `no-restricted-imports`, `src/game/core/**` altında `react`, `react-native`, `expo*` import'unu hata sayar.

### Coverage eşikleri

[jest.config.js](jest.config.js) iki ayrı eşik uygular:

- `src/game/core/` → **%90** (oyun kuralları)
- global → **%70**

> Jest, yola özel eşiği olan dosyaları global kovadan **çıkarır**. Yani "global %70", `core` hariç geri kalan koddur.

---

## Kalite kapıları

**Her commit'te (Husky pre-commit):** `lint-staged` (eslint --fix + prettier) → `typecheck`
**Her push'ta (Husky pre-push):** `npm run verify`
**CI'da ([.github/workflows/ci.yml](.github/workflows/ci.yml)):** `npm ci` → lint → typecheck → coverage → `expo-doctor`

---

## Yol haritası

- [x] **Sprint 0** — İskelet, TS strict, ESLint/Prettier, Jest, Husky, CI
- [ ] **Sprint 1** — Core mantık (tiles, generator, matcher, level, score) TDD ile
- [ ] **Sprint 2** — Render + gesture (SlotRow, TilePicker, animasyonlar)
- [ ] **Sprint 3** — Kalıcılık, ses, 30 seviye, ayarlar
- [ ] **Sprint 4** — EAS build, mağaza yayını

## Lisans

MIT — bkz. [LICENSE](LICENSE)
