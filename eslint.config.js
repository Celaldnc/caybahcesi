// ESLint 9 flat config.
// Neden flat config: ESLint 9+ varsayilani bu; .eslintrc formati 10'da kalkiyor.
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  ...expoConfig,

  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      'ios/**',
      'android/**',
      'coverage/**',
      'expo-env.d.ts',
    ],
  },

  // --- Proje kurallari ---
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // DoD: "Any type kullanma TS strict'te"
      '@typescript-eslint/no-explicit-any': 'error',

      // Kullanilmayan import/degisken -> hata. _ prefix'i kacis kapisi.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // DoD: "console.log production'da yok". warn/error teshis icin serbest.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // DoD: "Inline styles yasak" -> StyleSheet.create kullan.
      //
      // eslint-plugin-react-native, eslint-config-expo 57'de artik bagimlilik
      // degil (upstream bakimsiz kaldigi icin dusuruldu). Ayni kurali ek
      // bagimlilik olmadan AST secicisiyle zorluyoruz.
      //
      // Secici /[Ss]tyle$/ ile biten TUM prop'lari kapsar: style,
      // contentContainerStyle, columnWrapperStyle, tabBarStyle, imageStyle...
      // Sadece `style` yakalansaydi Sprint 2'de FlatList/ScrollView girer girmez
      // kural delinirdi.
      //
      // Yakalanan:       style={{ padding: 8 }}              <- tembel statik inline
      // Serbest:         style={[styles.base, { color }]}    <- tema/runtime rengi
      //   StyleSheet.create calisma zamani degeri alamaz; dinamik rengi dizi
      //   icinde birlestirmek RN'de dogru ve kacinilmaz kalibdir.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name=/[Ss]tyle$/] > JSXExpressionContainer > ObjectExpression',
          message:
            'Inline style yasak. Statik stilleri StyleSheet.create ile tanimla; dinamik deger gerekiyorsa style={[styles.x, { renk }]} kalibini kullan.',
        },
      ],

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',

      // Sprint 1'de core mantigi (matcher/level/score) gelmeden ONCE aciliyor.
      // Sonradan eklemek refactor borcu yaratir; simdi bedava.
      complexity: ['error', 10],
      'max-depth': ['error', 4],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },

  // -------------------------------------------------------------------------
  // game/core saflik muhafizi
  //
  // Kural: core/* asla platform API'si import etmez. Bu sayede Jest'te
  // preset/mock olmadan, milisaniyeler icinde calisir ve %90 coverage
  // ulasilabilir olur.
  //
  // IKI kural birlikte gerekiyor:
  //  1. no-restricted-imports  -> dis paketler (react, react-native, expo, zustand)
  //  2. import/no-restricted-paths -> proje ici katmanlar. Bu kural COZULMUS yola
  //     bakar, dolayisiyla hem '@/game/store/x' hem '../store/x' hem de
  //     '../../components/Themed' ayni sekilde yakalanir. Sadece
  //     no-restricted-imports kullansaydik goreli import'lar sizardi.
  // -------------------------------------------------------------------------
  {
    // .tsx de dahil: uzanti kisitlamasi guvenlik agini uzantı degistirerek
    // atlanabilir kiliyordu.
    files: ['src/game/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'react-native',
                'react-native-*',
                'expo',
                'expo-*',
                '@expo/*',
                // zustand index'i 'zustand/react' -> 'react' zincirini cekiyor.
                // zustand/vanilla saftir, o serbest.
                'zustand',
                'zustand/react',
                'zustand/middleware/immer',
              ],
              message:
                'game/core saf TypeScript olmali (platform API import etmez). Platform kodunu engine/, store/ veya audio/ katmanina tasi.',
            },
          ],
        },
      ],

      // require('react-native') ESM disi oldugu icin no-restricted-imports'un
      // radarina girmiyordu. Core'da require tamamen yasak.
      '@typescript-eslint/no-require-imports': 'error',

      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/game/core',
              from: './src',
              except: ['./game/core'],
              message:
                'game/core yalnizca kendi icinden import edebilir. UI/store/audio/ekran katmanlarina bagimlilik saf mantigi kirletir.',
            },
          ],
        },
      ],
    },
  },

  // Testlerde console serbest (hata ayiklama ciktisi icin).
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },

  // Prettier en sonda: bicimlendirme ile catisan kurallari kapatir.
  prettierRecommended,
];
