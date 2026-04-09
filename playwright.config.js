import { defineConfig, devices } from "@playwright/test";

const FRONTEND_PORT = 4173;
const BACKEND_PORT = 3001;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: "node scripts/reset-test-db.mjs && node server/src/index.js",
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(BACKEND_PORT),
        CLIENT_URL: FRONTEND_URL,
      },
    },
    {
      command: `npm run dev --workspace client -- --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        VITE_SERVER_URL: BACKEND_URL,
        VITE_SOCKET_SERVER_URL: BACKEND_URL,
      },
    },
  ],
});
