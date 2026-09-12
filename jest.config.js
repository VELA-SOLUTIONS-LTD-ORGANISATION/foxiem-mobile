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
    'src/utils/**/*.{ts,tsx}',
    'src/storage/**/*.{ts,tsx}',
    'src/state/counterLogic.ts',
    'src/state/reminders.ts',
    'src/notifications/reminderNotifications.ts',
    'src/theme/layout.ts',
    '!**/__tests__/**',
  ],
};
