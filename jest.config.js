/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  // tsconfig'deki "@/*" -> "./src/*" alias'inin Jest karsiligi.
  // Ikisi senkron kalmali, yoksa test "Cannot find module '@/...'" der.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)', '<rootDir>/src/**/*.test.ts?(x)'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/app/**', // expo-router ekranlari: e2e/manuel kapsamda
    // .web.ts varyantlari yalnizca web bundle'inda yuklenir; jest-expo'nun
    // native preset'i onlari hicbir zaman calistiramaz -> yapisal olarak %0.
    // Web'i kapsama almak isterseniz jest-expo'nun cok-platformlu
    // "projects" kurulumuna gecmek gerekir (Sprint 3 backlog).
    '!src/**/*.web.{ts,tsx}',
  ],

  // DoD: core >= %90, genel >= %70.
  // Jest glob-bazli esik destekler; boylece tek komutla iki kural birden zorlanir.
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
    './src/game/core/': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },

  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  clearMocks: true,
  restoreMocks: true,
};
