const { chromium } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

(async () => {
  const status = execFileSync('npx.cmd', ['--no-install', 'supabase', 'status', '-o', 'env'], {
    encoding: 'utf8', shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const local = Object.fromEntries(status.split(/\r?\n/).filter(line => line.includes('=')).map(line => {
    const [key, ...value] = line.split('=');
    return [key, value.join('=').replace(/^"|"$/g, '')];
  }));
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(local.API_URL).hostname));
  const config = JSON.parse(readFileSync('artifacts/booking-profile/.env.demo.local', 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3002/demo');
  await page.getByRole('link', { name: 'Testar agendamento' }).click();
  await page.waitForURL('**/booking/headbarber-demo');
  await page.getByRole('button', { name: /Lucas Rocha/ }).waitFor();
  await page.screenshot({ path: 'artifacts/auth-demo/demo-booking-working.png', fullPage: true });
  console.log('Public demo booking loads its real professionals');
  await page.goto('http://localhost:3002/demo');
  await page.getByRole('button', { name: 'Abrir painel demo' }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: /Visão geral|O dia na barbearia/ }).first().waitFor();
  await page.screenshot({ path: 'artifacts/auth-demo/demo-dashboard-working.png', fullPage: true });
  console.log('Demo entry redirects to the dashboard with a valid session');
  await browser.close();

  const client = createClient(local.API_URL, local.ANON_KEY, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email: config.DEMO_ACCOUNT_EMAIL, password: config.DEMO_ACCOUNT_PASSWORD });
  assert.equal(login.error, null);
  const before = await client.from('services').select('id,name').limit(1).single();
  assert.equal(before.error, null);
  const blocked = await client.from('services').update({ name: 'Forbidden demo edit' }).eq('id', before.data.id).select();
  assert.equal(blocked.error?.code, '42501');
  const after = await client.from('services').select('name').eq('id', before.data.id).single();
  assert.equal(after.data.name, before.data.name);
  await client.auth.signOut({ scope: 'local' });
  console.log('Demo catalog edits remain blocked by the database; original data preserved');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
