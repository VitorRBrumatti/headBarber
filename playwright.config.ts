import { defineConfig, devices } from '@playwright/test'
import { execFileSync } from 'node:child_process'

function localSupabaseEnvironment() {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const output = execFileSync(
    executable,
    ['supabase', 'status', '-o', 'env'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  )
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter((line) => line.includes('='))
      .map((line) => {
        const [name, ...value] = line.split('=')
        return [name, value.join('=').replace(/^"|"$/g, '')]
      }),
  )
}

const localSupabase = localSupabaseEnvironment()

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: localSupabase.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: localSupabase.ANON_KEY,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        localSupabase.PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: localSupabase.SERVICE_ROLE_KEY,
    },
  },
})
