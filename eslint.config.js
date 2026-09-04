// ESLint 9 flat config.
// Neden flat config: ESLint 9+ varsayilani bu; .eslintrc formati 10'da tamamen kalkiyor.
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

      // DoD: "console.log production'da yok". warn/error debug icin serbest.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // DoD: "Inline styles yasak" -> StyleSheet.create kullan.
      //
      // eslint-plugin-react-native, eslint-config-expo 57'de artik bagimlilik
      // degil (upstream bakimsiz kaldigi icin dusuruldu). Ayni kurali ek
      // bagimlilik olmadan AST secicisiyle zorluyoruz.
      //
      // Yakalanan:      style={{ padding: 8 }}        <- tembel statik inline
      // Serbest birakilan: style={[styles.base, { color }]}  <- tema/runtime rengi
      //   StyleSheet.create calisma zamani degeri alamaz; dinamik rengi dizi
      //   icinde birlestirmek RN'de dogru ve kacinilmaz kalibdir.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression",
          message:
            'Inline style yasak. Statik stilleri StyleSheet.create ile tanimla; dinamik deger gerekiyorsa style={[styles.x, { renk }]} kalibini kullan.',
        },
      ],

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // --- game/core saflik muhafizi ---
  // Kural: core/* asla React Native API'si import etmez. Bu sayede Jest'te
  // preset/mock olmadan, milisaniyeler icinde calisir ve %90 coverage ulasilabilir olur.
  {
    files: ['src/game/core/**/*.ts'],
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
                '@/components/*',
                '@/hooks/*',
                '@/game/engine/*',
                '@/game/store/*',
              ],
              message:
                'game/core saf TypeScript olmali (RN/React import etmez). Platform kodunu engine/ veya store/ katmanina tasi.',
            },
          ],
        },
      ],
    },
  },

  // Testlerde console ve devDependency import'u serbest
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },

  // Prettier en sonda: bicimlendirme ile catisan kurallari kapatir.
  prettierRecommended,
];
