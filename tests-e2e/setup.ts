import { initializeTestServer, teardownTestServer } from './test-setup';

// Initialize the test server once before all tests
beforeAll(async () => {
  await initializeTestServer();
});

// Teardown the test server after all tests
afterAll(async () => {
  await teardownTestServer();
});
