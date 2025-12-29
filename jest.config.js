/**
 * Jest Configuration for SPFx Legal Workflow
 *
 * Configured for:
 * - TypeScript with ts-jest
 * - React 17 with Testing Library
 * - SPFx module mocks
 * - Path aliases matching tsconfig
 */

module.exports = {
  // Use ts-jest preset for TypeScript
  preset: 'ts-jest',

  // Test environment for React
  testEnvironment: 'jsdom',

  // Root directories for tests
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true,
      },
    ],
  },

  // Module name mapper for path aliases (matching tsconfig paths)
  moduleNameMapper: {
    // Path aliases from tsconfig
    '^@appTypes/(.*)$': '<rootDir>/src/types/$1',
    '^@components/(.*)$': '<rootDir>/src/extensions/legalWorkflow/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '^@sp/(.*)$': '<rootDir>/src/sp/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',

    // Mock CSS/SCSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // Mock static assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
  },

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Module directories
  moduleDirectories: ['node_modules', 'src'],

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.module.scss.ts',
    '!src/**/*.manifest.json',
    '!src/**/loc/**',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**',
    '!src/index.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Transform ignore patterns - don't transform node_modules except specific packages
  transformIgnorePatterns: [
    '/node_modules/(?!(spfx-toolkit|@pnp|@fluentui|@microsoft/sp-|zustand)/)',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,
};
