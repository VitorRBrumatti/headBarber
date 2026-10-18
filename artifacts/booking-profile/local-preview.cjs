const { execFileSync, spawn } = require('node:child_process')
const assert = require('node:assert/strict')
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { randomBytes } = require('node:crypto')

const mode = process.argv[2]
assert.ok(['build', 'start', 'provision'].includes(mode), 'Use build, start or provision')
const status = execFileSync('npx.cmd', ['--no-install', 'supabase', 'status', '-o', 'env'], {
  encoding: 'utf8', shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
})
const local = Object.fromEntries(status.split(/\r?\n/).filter(line => line.includes('=')).map(line => {
  const [name, ...value] = line.split('=')
  return [name, value.join('=').replace(/^"|"$/g, '')]
}))
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(local.API_URL).hostname), 'Local database required')
assert.ok(local.ANON_KEY && local.SERVICE_ROLE_KEY, 'Local Supabase keys required')
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY || local.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
}
const demoConfigPath = join(__dirname, '.env.demo.local')
if (mode === 'provision' && !existsSync(demoConfigPath)) {
  writeFileSync(demoConfigPath, JSON.stringify({
    DEMO_ACCOUNT_EMAIL: 'headbarber-demo@example.test',
    DEMO_ACCOUNT_PASSWORD: randomBytes(32).toString('hex'),
    DEMO_BOOKING_SLUG: 'headbarber-demo',
  }), { flag: 'wx', mode: 0o600 })
}
if (existsSync(demoConfigPath)) {
  Object.assign(env, JSON.parse(readFileSync(demoConfigPath, 'utf8')))
}
console.log('Using local Supabase only; hosted environment file unchanged.')
const args = mode === 'build' ? ['run', 'build'] : ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', '3002']
const child = mode === 'provision'
  ? spawn(process.execPath, ['scripts/provision-demo.mjs'], { env, stdio: 'inherit', windowsHide: true })
  : spawn('npm.cmd', args, { env, stdio: 'inherit', shell: true, windowsHide: true })
child.on('error', () => { console.error('Local preview could not start'); process.exit(1) })
child.on('exit', code => process.exit(code ?? 1))
