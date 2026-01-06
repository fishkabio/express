/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 10,
  testMatch: ['**/?(*.)+(spec).ts'],
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            tsconfig: {
              strict: true,
              skipLibCheck: true,
              target: 'ES2022',
              lib: ['ESNext'],
              module: 'commonjs',
              esModuleInterop: true,
              moduleResolution: 'node',
              types: ['node', 'jest'],
              outDir: '<rootDir>/dist-test',
            },
          },
        ],
      },
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests-e2e/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests-e2e/setup.ts'],
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            tsconfig: {
              strict: true,
              skipLibCheck: true,
              target: 'ES2022',
              lib: ['ESNext'],
              module: 'commonjs',
              esModuleInterop: true,
              moduleResolution: 'node',
              types: ['node', 'jest'],
              outDir: '<rootDir>/dist-test',
            },
          },
        ],
      },
    },
  ],
};
