module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*-jest.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*-jest.test.ts',
    '!src/**/__tests__/**',
  ],
};
