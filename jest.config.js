module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/storage/**/*.ts',
    'src/pro/**/*.{ts,tsx}',
    'src/state/**/*.{ts,tsx}',
    'src/format/**/*.ts',
    'src/lib/telemetry/analytics.ts',
    'src/utils/**/*.ts',
    'src/theme/layout.ts',
    '!**/__tests__/**',
  ],
};
