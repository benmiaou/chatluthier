/**
 * Jest configuration
 * Two projects: backend (Node/CommonJS) and frontend (jsdom + Babel for TS/JSX + import.meta)
 */
module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/jest/unit/**/*.test.js', '<rootDir>/tests/jest/integration/**/*.test.js'],
      collectCoverageFrom: [
        'srv/**/*.js',
        '!srv/server.js',
        '!srv/server-with-logs.js',
        '!srv/sockets/**', // WebSocket server has integration tests
      ],
      coverageThreshold: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
      },
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
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
      ],
      coverageThreshold: {
        global: {
          branches: 40,
          functions: 40,
          lines: 40,
          statements: 40,
        },
      },
    },
  ],
  // npm test:jest runs all
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageReporters: ['text', 'text-summary', 'html'],
  coverageDirectory: 'coverage',
};
