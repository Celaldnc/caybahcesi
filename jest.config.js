const ts = require('typescript');

// -----------------------------------------------------------------------------
// Alias'lar TEK KAYNAKTAN: tsconfig.json.
//
// Onceden `moduleNameMapper` elle kopyalanmisti. Alias'in uc tuketicisi var:
// TypeScript (tsconfig'i okur), Metro (tsconfig'den otomatik turetir --
// @expo/cli/.../createTypescriptResolver.js) ve Jest. Yalnizca Jest elle
// kopyaydi, yani sessizce ayrisabilecek tek yer orasiydi.
//
// ts.readConfigFile JSONC yorumlarini da parse eder, bu yuzden tsconfig'deki
// aciklama satirlari sorun cikarmaz.
// -----------------------------------------------------------------------------
const { config: tsconfig } = ts.readConfigFile(require.resolve('./tsconfig.json'), ts.sys.readFile);
const tsPaths = tsconfig.compilerOptions?.paths ?? {};

/** tsconfig `paths` -> Jest `moduleNameMapper`. */
const moduleNameMapper = Object.fromEntries(
  Object.entries(tsPaths).map(([alias, targets]) => [
    `^${alias.replace('/*', '/(.*)')}$`,
    `<rootDir>/${String(targets[0]).replace('./', '').replace('/*', '/$1')}`,
  ]),
);

/** DoD esikleri. Tek yerde dursun ki dort metrikte tekrarlanmasin. */
const CORE_MIN = 90;
const GLOBAL_MIN = 70;
const asThreshold = (pct) => ({
  statements: pct,
  branches: pct,
  functions: pct,
  lines: pct,
});

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  moduleNameMapper,

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],

  // Kesif/olcum dosyalari (zz-*) DoD kapisina girmez.
  // Yasandi: denge taramasi icin yazilan gecici dosyalar testMatch'e uydu ve
  // `npm run verify` lint'te 137 hatayla dustu, test suresi 6 sn -> 96 sn cikti.
  // Isim onekiyle ayirmak, kesif yapmayi ucuz ve kapiyi temiz tutuyor.
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/zz-'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    // ...ama test YARDIMCILARI olculur. Property testlerinin tamami bunlara
    // dayaniyor; olcum disinda kalirlarsa "garanti" iddialari dogrulanmamis
    // koda yaslanir. Mutasyon denetimi bu bosluktan gecen hatalar buldu.
    'src/**/__tests__/helpers/**/*.ts',

    // Saf veri dosyalari. Herhangi bir test onlari import ettigi anda %100
    // olurlar ve hicbir mantik dogrulamadan global yuzdeyi sisirirler.
    // Iceriklerini `constants/__tests__/config.test.ts` invariant testleri korur.
    '!src/constants/**',
  ],

  coverageThreshold: {
    global: asThreshold(GLOBAL_MIN),

    // GLOB ('**/*.ts'), PATH ('./src/game/core/') DEGIL.
    //
    // Fark kritik: PATH grubu tum core dosyalarini TOPLAYIP esigi agregaya
    // uygular. O zaman core buyudukce iyi test edilmis dosyalar kotu test
    // edilmisleri maskeler -- 60 fonksiyonluk bir core'da 6 tamamen test
    // edilmemis fonksiyon esigi gecebilir. GLOB grubu esigi DOSYA BASINA
    // uygular; tek bir zayif dosya kapiyi kapatir.
    './src/game/core/**/*.ts': asThreshold(CORE_MIN),
  },

  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  clearMocks: true,
  restoreMocks: true,
};
