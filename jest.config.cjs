/**
 * Jest configuration
 * Two projects: backend (Node/CommonJS) and frontend (jsdom + Babel for TS/JSX + import.meta)
 */
module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/jest/unit/**/*.test.js'],
      // No transform: backend code is CommonJS
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/jest/frontend/**/*.test.ts?(x)'],
      transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/jest/setup.js'],
      setupFiles: ['<rootDir>/tests/jest/setup.js'],
      moduleNameMapper: {
        // Stub CSS/image imports
        '\\.(css|scss|png|jpg|svg)$': '<rootDir>/tests/jest/__mocks__/fileMock.js',
      },
    },
  ],
  // npm test:jest runs all
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
