/* eslint-env node */
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  moduleNameMapper: {
    '^next$': require.resolve('next'),
    '^next/navigation$': require.resolve('next/navigation'),
  },
  testEnvironment: 'node', // Use node environment for API route tests
  testEnvironmentOptions: {
    // Enable Web APIs for API route tests
    customExportConditions: [''],
  },
  rootDir: 'src',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.js'],
});
