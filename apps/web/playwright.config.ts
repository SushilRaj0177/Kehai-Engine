import { defineConfig, devices } from "@playwright/test";

// Browser layout tests. They mock the API, so no database or server is
// needed: Playwright starts the web app itself (or uses E2E_BASE_URL).
const PORT = 3210;
export const MOCK_API = "http://kehai-api.test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 7"],
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next dev -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        env: { API_URL: MOCK_API },
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
