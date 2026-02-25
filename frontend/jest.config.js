/** @type {import('jest').Config} */
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: __dirname });
module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
});
