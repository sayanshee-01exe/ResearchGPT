import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(repoRoot, "frontend");

const E2E_PORT = 5174;
const E2E_API_PORT = 8001;

// E2E runs against throwaway data files so the developer's real users.json and
// sessions.json are never touched.
const e2eDataDir = path.join(repoRoot, ".e2e-data");

export default defineConfig({
  testDir: path.join(repoRoot, "tests", "e2e"),
  outputDir: path.join(repoRoot, "tests", "test-results"),
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
    // The product's reference design is the dark theme; light still works and
    // is covered explicitly in landing.spec.ts.
    colorScheme: "dark",
  },
  webServer: [
    {
      command: `uv run uvicorn backend.api:app --port ${E2E_API_PORT}`,
      cwd: repoRoot,
      url: `http://localhost:${E2E_API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        PAPEER_USERS_FILE: path.join(e2eDataDir, "users.json"),
        PAPEER_SESSIONS_FILE: path.join(e2eDataDir, "sessions.json"),
      },
    },
    {
      command: `npx vite --port ${E2E_PORT} --strictPort`,
      cwd: frontendDir,
      url: `http://localhost:${E2E_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_TARGET: `http://localhost:${E2E_API_PORT}` },
    },
  ],
});
