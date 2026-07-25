# Reusable ImgBB Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, reusable ImgBB upload to Barber and Product forms and make their public-booking images and booking progress responsive and resilient.

**Architecture:** A same-origin authenticated Next.js Route Handler validates image bytes, consumes an atomic Supabase quota, and calls ImgBB with a server-only key. A reusable client component uploads one file, exposes a hidden URL field to existing form actions, and renders preview/loading/error states. The booking UI consumes the existing `avatar_url` and `image_url` fields with a reusable fallback image and separate mobile/desktop progress layouts.

**Tech Stack:** Next.js 16.2 App Router Route Handlers, React 19, TypeScript 5, Supabase/Postgres/RLS, ImgBB API v1, Vitest 4, pgTAP, Playwright.

## Global Constraints

- Apply image upload only to Barbers and Products; Services must remain unchanged.
- Maximum file size is exactly 5 MiB (`5 * 1024 * 1024` bytes).
- Accepted formats are JPEG, PNG, and WebP; reject SVG, GIF, and arbitrary content.
- Keep `IMGBB_API_KEY` server-only and never log, serialize, or commit it.
- Allow at most 10 upload attempts per authenticated user in a rolling 10-minute window.
- Preserve existing external URLs already stored in `barbers.avatar_url` and `products.image_url`.
- Removing or replacing a URL does not promise deletion from ImgBB.
- Mobile booking uses a compact summary; desktop uses a complete seven-step track that cannot overflow.
- Follow TDD: write each behavior test, observe the expected failure, then add only enough production code to pass.
- Before changing Next.js code, use the bundled Next.js 16.2 documentation under `node_modules/next/dist/docs/`; Route Handlers use Web `Request`/`Response` and `request.formData()`.
- Before schema work, check the current Supabase changelog/docs, discover CLI commands with `--help`, create the migration with `supabase migration new`, and run database advisors when available.
- Preserve all unrelated staged and unstaged work already present in the repository.
- Never run a plain `git commit` in this worktree: use `git commit --only` with the explicit feature paths so the existing staged add-on work is not swept into this feature.
- `src/app/booking/[slug]/booking-client.tsx` already contains pre-existing work. Modify and verify it, but leave it out of this feature's commits unless that earlier work has been committed separately first.

---

## File Structure

### New files

- `supabase/migrations/*_image_upload_quota.sql` — CLI-generated migration containing the private attempt table and the restricted atomic quota function.
- `supabase/tests/database/image_upload_quota_test.sql` — pgTAP authorization, quota-window, and privilege tests.
- `tests/unit/image-upload-quota-contract.test.ts` — migration and RPC wiring contract.
- `src/lib/image-upload/contracts.ts` — shared limits, MIME types, response/error types.
- `src/lib/image-upload/file-validation.ts` — file size, MIME, and magic-byte validation.
- `src/lib/image-upload/imgbb.ts` — server-only ImgBB request and response normalization.
- `src/lib/image-upload/quota.ts` — authenticated Supabase RPC adapter.
- `src/lib/image-upload/route-handler.ts` — dependency-injected HTTP behavior.
- `src/app/api/images/upload/route.ts` — production Route Handler wiring.
- `src/components/ui/image-upload-state.ts` — pure state reducer for upload UI.
- `src/components/ui/image-upload.tsx` — reusable file picker, preview, spinner, retry, replace, and remove UI.
- `src/components/ui/image-with-fallback.tsx` — resilient remote image renderer.
- `tests/unit/image-upload-validation.test.ts` — byte validation tests.
- `tests/unit/imgbb-client.test.ts` — provider response, timeout, and secret-safety tests.
- `tests/unit/image-upload-route.test.ts` — authentication/origin/quota/status tests.
- `tests/unit/image-upload-state.test.ts` — component state transitions.
- `tests/unit/image-upload-forms-contract.test.ts` — Barber/Product integration and Service non-integration.
- `tests/unit/booking-media-responsive.test.ts` — public image fallback and progress layout contract.

### Modified files

- `.env.example` — document `IMGBB_API_KEY` without a value.
- `.env.local` — store the provided key locally; never stage this ignored file.
- `src/components/dashboard/barber-form.tsx` — replace manual avatar URL input with `ImageUpload`.
- `src/components/dashboard/product-form.tsx` — replace manual image URL input with `ImageUpload`.
- `src/app/booking/[slug]/booking-client.tsx` — resilient Barber photos and corrected fixed-header spacing.
- `src/app/booking/[slug]/booking-product-step.tsx` — resilient Product thumbnails.
- `src/app/booking/[slug]/booking-progress.tsx` — compact mobile progress and contained desktop track.

---

### Task 1: Persistent Supabase upload quota

**Files:**

- Create via CLI: `supabase/migrations/*_image_upload_quota.sql` (use the exact timestamped path printed by `supabase migration new image_upload_quota`)
- Create: `supabase/tests/database/image_upload_quota_test.sql`
- Create: `tests/unit/image-upload-quota-contract.test.ts`

**Interfaces:**

- Produces RPC: `public.consume_image_upload_quota(p_barbershop_id uuid) returns table(allowed boolean, retry_after_seconds integer)`
- Produces table: `public.image_upload_attempts(id, user_id, barbershop_id, created_at)`
- Security contract: no direct `anon` or `authenticated` table privileges; RPC executable only by `authenticated`.

- [ ] **Step 1: Confirm current Supabase guidance and CLI syntax**

Run:

```powershell
npx.cmd supabase --version
npx.cmd supabase migration new --help
npx.cmd supabase test db --help
```

Expected: commands print the installed version and supported flags. If the CLI cannot write telemetry under the sandbox, rerun these read-only commands with the required workspace approval instead of guessing syntax.

- [ ] **Step 2: Write the failing migration contract**

Create `tests/unit/image-upload-quota-contract.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationDirectory = join(process.cwd(), 'supabase', 'migrations')

function quotaMigration() {
  const filename = readdirSync(migrationDirectory).find((name) =>
    name.endsWith('_image_upload_quota.sql'),
  )
  expect(filename).toBeDefined()
  return readFileSync(join(migrationDirectory, filename!), 'utf8')
}

describe('image upload quota migration', () => {
  it('exposes only the authenticated atomic quota function', () => {
    const sql = quotaMigration()
    expect(sql).toContain('create table public.image_upload_attempts')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('create or replace function public.consume_image_upload_quota')
    expect(sql).toContain('revoke all on public.image_upload_attempts')
    expect(sql).toContain('grant execute on function public.consume_image_upload_quota(uuid) to authenticated')
    expect(sql).toContain('public.get_user_barbershop_id')
    expect(sql).toContain('pg_advisory_xact_lock')
  })
})
```

- [ ] **Step 3: Run the contract and observe the missing migration failure**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-quota-contract.test.ts
```

Expected: FAIL because no `_image_upload_quota.sql` migration exists.

- [ ] **Step 4: Create the migration through the CLI**

Run:

```powershell
npx.cmd supabase migration new image_upload_quota
```

Expected: Supabase prints the exact new timestamped migration path. Do not invent or rename the timestamp.

- [ ] **Step 5: Implement the atomic quota migration**

In the generated migration, implement this exact shape:

```sql
create table public.image_upload_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index image_upload_attempts_user_created_idx
on public.image_upload_attempts (user_id, created_at desc);

alter table public.image_upload_attempts enable row level security;
revoke all on public.image_upload_attempts from public, anon, authenticated;
grant all on public.image_upload_attempts to service_role;

create or replace function public.consume_image_upload_quota(p_barbershop_id uuid)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_count integer;
  v_oldest timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(v_user_id);
  if v_tenant_id is null or v_tenant_id <> p_barbershop_id then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_user_id::text),
    pg_catalog.hashtext('image_upload')
  );

  delete from public.image_upload_attempts
  where user_id = v_user_id
    and created_at < timezone('utc', now()) - interval '24 hours';

  select count(*), min(created_at)
  into v_count, v_oldest
  from public.image_upload_attempts
  where user_id = v_user_id
    and created_at >= timezone('utc', now()) - interval '10 minutes';

  if v_count >= 10 then
    return query select false, greatest(
      1,
      ceil(extract(epoch from (
        v_oldest + interval '10 minutes' - timezone('utc', now())
      )))::integer
    );
    return;
  end if;

  insert into public.image_upload_attempts(user_id, barbershop_id)
  values (v_user_id, p_barbershop_id);

  return query select true, 0;
end;
$$;

revoke all on function public.consume_image_upload_quota(uuid) from public, anon;
grant execute on function public.consume_image_upload_quota(uuid) to authenticated;
```

- [ ] **Step 6: Add pgTAP behavior and privilege tests**

Create `supabase/tests/database/image_upload_quota_test.sql` with fixtures for two barbershops and two authenticated users. Assert:

```sql
select plan(9);
select has_table('public', 'image_upload_attempts');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.image_upload_attempts'::regclass), 'RLS enabled');
select ok(not has_table_privilege('anon','public.image_upload_attempts','SELECT'), 'anon cannot read attempts');
select ok(not has_table_privilege('authenticated','public.image_upload_attempts','INSERT'), 'authenticated cannot insert directly');
select function_returns('public','consume_image_upload_quota',array['uuid'],'record');
```

Then set an authenticated JWT claim, call the function 10 times and assert each call is allowed; assert call 11 is blocked with positive `retry_after_seconds`; switch to the other tenant and assert `FORBIDDEN`; backdate the first user's events by 11 minutes as `postgres` and assert the next call is allowed.

- [ ] **Step 7: Run RED/GREEN database verification**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-quota-contract.test.ts
npx.cmd supabase test db supabase/tests/database/image_upload_quota_test.sql
```

Expected: both PASS. If the local Supabase stack is unavailable, record that exact environment blocker; do not claim the pgTAP test passed.

- [ ] **Step 8: Run advisors and commit only quota files**

Run the advisor command discovered from `npx.cmd supabase --help`, fix findings attributable to this migration, then:

```powershell
git add -- 'supabase/migrations/*_image_upload_quota.sql' supabase/tests/database/image_upload_quota_test.sql tests/unit/image-upload-quota-contract.test.ts
git commit --only -m "feat: add persistent image upload quota" -- 'supabase/migrations/*_image_upload_quota.sql' supabase/tests/database/image_upload_quota_test.sql tests/unit/image-upload-quota-contract.test.ts
```

---

### Task 2: File validation and server-only ImgBB client

**Files:**

- Create: `src/lib/image-upload/contracts.ts`
- Create: `src/lib/image-upload/file-validation.ts`
- Create: `src/lib/image-upload/imgbb.ts`
- Create: `tests/unit/image-upload-validation.test.ts`
- Create: `tests/unit/imgbb-client.test.ts`

**Interfaces:**

- Produces `MAX_IMAGE_BYTES = 5 * 1024 * 1024`.
- Produces `validateImageFile(file: File): Promise<ImageValidationResult>`.
- Produces `uploadToImgBb(input: { file: File; apiKey: string; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<{ url: string }>`.

- [ ] **Step 1: Write failing byte-validation tests**

Use minimal byte fixtures:

```ts
const jpeg = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xdb])], 'photo.jpg', { type: 'image/jpeg' })
const png = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'photo.png', { type: 'image/png' })
const webp = new File([new TextEncoder().encode('RIFF0000WEBP')], 'photo.webp', { type: 'image/webp' })

await expect(validateImageFile(jpeg)).resolves.toMatchObject({ ok: true, mime: 'image/jpeg' })
await expect(validateImageFile(png)).resolves.toMatchObject({ ok: true, mime: 'image/png' })
await expect(validateImageFile(webp)).resolves.toMatchObject({ ok: true, mime: 'image/webp' })
```

Add separate tests for empty files, a file of `MAX_IMAGE_BYTES + 1`, SVG, GIF, mismatched MIME/signature, and random bytes. Assert the exact Portuguese messages from the design.

- [ ] **Step 2: Run validation tests and observe the missing-module failure**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-validation.test.ts
```

Expected: FAIL because the validation module does not exist.

- [ ] **Step 3: Implement shared contracts and magic-byte validation**

Define:

```ts
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ImageUploadCode =
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_TYPE'
  | 'INVALID_SIGNATURE'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MISCONFIGURED'
```

Read only the first 12 bytes in `validateImageFile`; check the exact JPEG, PNG, and `RIFF....WEBP` signatures and require the detected type to equal `file.type`.

- [ ] **Step 4: Run validation tests to GREEN**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-validation.test.ts
```

Expected: PASS with all valid and invalid cases.

- [ ] **Step 5: Write failing ImgBB client tests**

Test a mocked `fetchImpl` that inspects:

```ts
expect(url.toString()).toBe('https://api.imgbb.com/1/upload')
expect(init?.method).toBe('POST')
expect(init?.body).toBeInstanceOf(FormData)
expect((init?.body as FormData).get('key')).toBe('server-secret')
expect((init?.body as FormData).get('image')).toBe(file)
```

Return the documented ImgBB response and expect `{ url: 'https://i.ibb.co/example/photo.webp' }`. Add tests rejecting non-2xx responses, `success: false`, malformed JSON, non-HTTPS URLs, non-`i.ibb.co` hosts, and timeout/abort. Assert thrown errors never contain the API key or raw provider body.

- [ ] **Step 6: Run ImgBB tests and observe the missing-module failure**

Run:

```powershell
npm.cmd test -- tests/unit/imgbb-client.test.ts
```

Expected: FAIL because `imgbb.ts` does not exist.

- [ ] **Step 7: Implement the server-only provider adapter**

Start `imgbb.ts` with:

```ts
import 'server-only'
```

Use `POST`, `FormData`, an `AbortController`, a 15-second default timeout, and `finally` to clear the timer. Parse unknown JSON defensively and accept only `https://i.ibb.co/...`. Throw stable internal error codes/messages without including the key, file bytes, delete URL, or provider response.

- [ ] **Step 8: Run both suites and commit**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-validation.test.ts tests/unit/imgbb-client.test.ts
git add -- src/lib/image-upload/contracts.ts src/lib/image-upload/file-validation.ts src/lib/image-upload/imgbb.ts tests/unit/image-upload-validation.test.ts tests/unit/imgbb-client.test.ts
git commit --only -m "feat: validate images and upload to imgbb" -- src/lib/image-upload/contracts.ts src/lib/image-upload/file-validation.ts src/lib/image-upload/imgbb.ts tests/unit/image-upload-validation.test.ts tests/unit/imgbb-client.test.ts
```

Expected: tests PASS before the commit.

---

### Task 3: Authenticated same-origin upload endpoint

**Files:**

- Create: `src/lib/image-upload/quota.ts`
- Create: `src/lib/image-upload/route-handler.ts`
- Create: `src/app/api/images/upload/route.ts`
- Create: `tests/unit/image-upload-route.test.ts`
- Modify: `.env.example`
- Modify locally only: `.env.local`

**Interfaces:**

- Consumes `validateImageFile`, `uploadToImgBb`, and `consume_image_upload_quota`.
- Produces `POST /api/images/upload`.
- Success response: HTTP 200 `{ "url": "https://i.ibb.co/..." }`.
- Error response: `{ "error": string, "code": ImageUploadCode, "retryAfterSeconds"?: number }`.

- [ ] **Step 1: Write failing route behavior tests**

Create a dependency-injected `handleImageUpload(request, deps)` contract and test with Web `Request` objects. Cover:

```ts
const request = new Request('https://headbarber.test/api/images/upload', {
  method: 'POST',
  headers: { origin: 'https://headbarber.test' },
  body: formData,
})

const response = await handleImageUpload(request, {
  getContext: async () => ({ supabase: fakeSupabase, barbershopId: 'shop-a' }),
  isConfigured: () => true,
  consumeQuota: async () => ({ allowed: true, retryAfterSeconds: 0 }),
  upload: async () => ({ url: 'https://i.ibb.co/a/photo.webp' }),
})
expect(response.status).toBe(200)
await expect(response.json()).resolves.toEqual({ url: 'https://i.ibb.co/a/photo.webp' })
```

Add independent tests for missing/mismatched `Origin`, unauthenticated context, missing file, invalid file, denied quota with HTTP 429 and `Retry-After`, missing key with HTTP 503, and provider failure with HTTP 502. Assert validation occurs before quota and quota before provider upload.

- [ ] **Step 2: Run the route suite and observe the missing-module failure**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-route.test.ts
```

Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Implement the quota adapter**

Implement:

```ts
export async function consumeImageUploadQuota(
  supabase: SupabaseClient,
  barbershopId: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const { data, error } = await supabase.rpc('consume_image_upload_quota', {
    p_barbershop_id: barbershopId,
  })
  if (error) throw new Error('Não foi possível validar o limite de uploads.')
  const row = data?.[0]
  return {
    allowed: row?.allowed === true,
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
  }
}
```

Use the project Supabase client type without introducing `any`.

- [ ] **Step 4: Implement the dependency-injected handler**

`handleImageUpload` must:

1. require `request.headers.get('origin') === new URL(request.url).origin`;
2. reject an absent server configuration through `deps.isConfigured()`;
3. reject `content-length` above `MAX_IMAGE_BYTES + 262_144` before parsing;
4. call `request.formData()` and require exactly one `File` at `image`;
5. authenticate with `getBarbershopId`;
6. validate the file;
7. consume quota;
8. call the provider;
9. map stable errors to 400/401/403/413/429/502/503;
10. add `Cache-Control: no-store`;
11. never include stack traces or external bodies.

- [ ] **Step 5: Wire the production Route Handler**

Create `src/app/api/images/upload/route.ts`:

```ts
import { getBarbershopId } from '@/utils/get-barbershop'
import { uploadToImgBb } from '@/lib/image-upload/imgbb'
import { consumeImageUploadQuota } from '@/lib/image-upload/quota'
import { handleImageUpload } from '@/lib/image-upload/route-handler'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handleImageUpload(request, {
    getContext: getBarbershopId,
    isConfigured: () => Boolean(process.env.IMGBB_API_KEY),
    consumeQuota: consumeImageUploadQuota,
    upload: (file) => {
      const apiKey = process.env.IMGBB_API_KEY
      if (!apiKey) throw new Error('MISCONFIGURED')
      return uploadToImgBb({ file, apiKey })
    },
  })
}
```

Keep the actual configuration error mapping in the handler, not in the response body.

- [ ] **Step 6: Document and configure the secret**

Add only this placeholder to `.env.example`:

```dotenv
IMGBB_API_KEY=
```

Add the user-provided value to ignored `.env.local` without printing it, and verify:

```powershell
git check-ignore .env.local
git diff -- .env.example
git grep -n "IMGBB_API_KEY" -- ':!.env.example'
```

Expected: `.env.local` is ignored; tracked source contains only the environment variable name, never its value.

- [ ] **Step 7: Run the route suite and commit tracked files**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-route.test.ts
git add -- .env.example src/app/api/images/upload/route.ts src/lib/image-upload/quota.ts src/lib/image-upload/route-handler.ts tests/unit/image-upload-route.test.ts
git commit --only -m "feat: add protected image upload endpoint" -- .env.example src/app/api/images/upload/route.ts src/lib/image-upload/quota.ts src/lib/image-upload/route-handler.ts tests/unit/image-upload-route.test.ts
```

Expected: tests PASS and `.env.local` is not staged.

---

### Task 4: Reusable upload UI and form integrations

**Files:**

- Create: `src/components/ui/image-upload-state.ts`
- Create: `src/components/ui/image-upload.tsx`
- Create: `tests/unit/image-upload-state.test.ts`
- Create: `tests/unit/image-upload-forms-contract.test.ts`
- Modify: `src/components/dashboard/barber-form.tsx`
- Modify: `src/components/dashboard/product-form.tsx`

**Interfaces:**

- Produces:

```ts
interface ImageUploadProps {
  name: 'avatar_url' | 'image_url'
  label: string
  initialUrl: string | null
  shape?: 'circle' | 'square'
  onUploadingChange?: (uploading: boolean) => void
}
```

- The component always renders a hidden input with the current URL or an empty string.
- Barber and Product submit buttons are disabled while either form submission or upload is pending.

- [ ] **Step 1: Write failing state-transition tests**

Define reducer events and assert:

```ts
expect(reduceImageUploadState(initial, { type: 'upload-started', previewUrl: 'blob:test' }))
  .toMatchObject({ status: 'uploading', previewUrl: 'blob:test', error: '' })

expect(reduceImageUploadState(uploading, { type: 'upload-succeeded', url: 'https://i.ibb.co/a.webp' }))
  .toEqual({ status: 'idle', currentUrl: 'https://i.ibb.co/a.webp', previewUrl: null, error: '' })

expect(reduceImageUploadState(withExistingUrl, { type: 'upload-failed', error: 'Falhou' }))
  .toMatchObject({ status: 'idle', currentUrl: existingUrl, previewUrl: null, error: 'Falhou' })

expect(reduceImageUploadState(withExistingUrl, { type: 'removed' }).currentUrl).toBeNull()
```

- [ ] **Step 2: Run the reducer suite and observe the missing-module failure**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-state.test.ts
```

Expected: FAIL because the reducer does not exist.

- [ ] **Step 3: Implement the pure reducer**

Use a discriminated union for `idle` and `uploading` states. Preserve the prior persisted URL during a failed upload. Do not put `File`, API responses, or secrets in reducer state.

- [ ] **Step 4: Run the reducer suite to GREEN**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing form integration contract**

Read the three form source files and assert:

```ts
expect(barberForm).toContain('<ImageUpload')
expect(barberForm).toContain('name="avatar_url"')
expect(productForm).toContain('<ImageUpload')
expect(productForm).toContain('name="image_url"')
expect(barberForm).not.toContain('type="url"')
expect(productForm).not.toContain('name="image_url"\\n            type="url"')
expect(serviceForm).not.toContain('<ImageUpload')
expect(serviceForm).not.toContain('image_url')
```

Also read `image-upload.tsx` and assert it contains `LoaderCircle`, `animate-spin`, `role="status"`, `aria-live="polite"`, and a same-origin fetch to `/api/images/upload`. Assert both forms include `isUploading` in submit-button disabling.

- [ ] **Step 6: Run the form contract and observe the expected failure**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-forms-contract.test.ts
```

Expected: FAIL because both forms still render manual URL inputs.

- [ ] **Step 7: Implement `ImageUpload`**

The component must:

- use a visually hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`;
- validate size/type immediately using shared contracts;
- support click, keyboard, and drag/drop;
- create and revoke local object URLs;
- send `FormData` key `image` to `/api/images/upload`;
- show an animated circular `LoaderCircle` with `animate-spin`;
- render `role="status"` and `aria-live="polite"` with `Enviando imagem...`;
- keep the old URL when upload fails;
- render exact retryable error text;
- provide `Trocar imagem` and `Remover imagem`;
- emit `onUploadingChange(true/false)` in `try/finally`;
- render `<input type="hidden" name={name} value={currentUrl ?? ''}>`;
- disable all image controls while uploading.

- [ ] **Step 8: Integrate Barber and Product forms**

Add `isUploading` state to each form. Replace the URL input with:

```tsx
<ImageUpload
  name="avatar_url"
  label="Foto do profissional"
  initialUrl={barber?.avatar_url ?? null}
  shape="circle"
  onUploadingChange={setIsUploading}
/>
```

and:

```tsx
<ImageUpload
  name="image_url"
  label="Imagem do produto"
  initialUrl={product?.image_url ?? null}
  onUploadingChange={setIsUploading}
/>
```

Use a stable `key` based on the edited entity ID so switching Sheet records resets internal state. Disable submit with `disabled={isPending || isUploading}` and use `Enviando imagem...` as the button text while uploading.

- [ ] **Step 9: Run component and integration tests, lint changed files, and commit**

Run:

```powershell
npm.cmd test -- tests/unit/image-upload-state.test.ts tests/unit/image-upload-forms-contract.test.ts
npm.cmd run lint -- src/components/ui/image-upload.tsx src/components/ui/image-upload-state.ts src/components/dashboard/barber-form.tsx src/components/dashboard/product-form.tsx
git add -- src/components/ui/image-upload.tsx src/components/ui/image-upload-state.ts src/components/dashboard/barber-form.tsx src/components/dashboard/product-form.tsx tests/unit/image-upload-state.test.ts tests/unit/image-upload-forms-contract.test.ts
git commit --only -m "feat: add reusable image upload fields" -- src/components/ui/image-upload.tsx src/components/ui/image-upload-state.ts src/components/dashboard/barber-form.tsx src/components/dashboard/product-form.tsx tests/unit/image-upload-state.test.ts tests/unit/image-upload-forms-contract.test.ts
```

Expected: both suites PASS and lint reports no errors.

---

### Task 5: Resilient booking images and responsive progress

**Files:**

- Create: `src/components/ui/image-with-fallback.tsx`
- Create: `tests/unit/booking-media-responsive.test.ts`
- Modify: `src/app/booking/[slug]/booking-client.tsx`
- Modify: `src/app/booking/[slug]/booking-product-step.tsx`
- Modify: `src/app/booking/[slug]/booking-progress.tsx`

**Interfaces:**

- Produces:

```ts
interface ImageWithFallbackProps {
  src: string | null
  alt: string
  className: string
  fallback: React.ReactNode
}
```

- `BookingProgress` retains its existing public props.

- [ ] **Step 1: Write the failing responsive/media contract**

Assert source and server-rendered output contain:

```ts
expect(progressHtml).toContain('Etapa 1 de 7')
expect(progressSource).toContain('sm:hidden')
expect(progressSource).toContain('hidden')
expect(progressSource).toContain('sm:grid')
expect(progressSource).toContain('grid-cols-7')
expect(progressSource).not.toContain('last:flex-none')
expect(bookingClientSource).toContain('max-w-3xl')
expect(bookingClientSource).toContain('<ImageWithFallback')
expect(productStepSource).toContain('<ImageWithFallback')
```

Also assert the mobile progress has a bounded bar and the desktop connector is absolutely contained within each grid cell.

- [ ] **Step 2: Run the contract and observe the current-layout failure**

Run:

```powershell
npm.cmd test -- tests/unit/booking-media-responsive.test.ts
```

Expected: FAIL because the desktop progress is flex-based and no reusable fallback image exists.

- [ ] **Step 3: Implement the resilient image component**

Use local `failed` state:

```tsx
if (!src || failed) return fallback

return (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
)
```

Reset `failed` when `src` changes. Keep native `<img>` because existing tenant-managed URLs may use different hosts and must remain compatible.

- [ ] **Step 4: Replace Barber and Product image branches**

For Barber, pass `alt={item.name}` and the existing `UserRound` placeholder. For Product, pass `alt={product.name}` and the existing `Package` placeholder. Preserve current dimensions and `object-cover`.

- [ ] **Step 5: Rebuild progress without overflow**

Mobile:

```tsx
<div className="flex items-center justify-between gap-4 py-4 sm:hidden">
  {/* Etapa X de 7, current name, bounded progress bar */}
</div>
```

Desktop:

```tsx
<ol className="hidden grid-cols-7 py-5 sm:grid" aria-label="Progresso do agendamento">
  {steps.map((step, index) => (
    <li key={step.id} className="relative flex min-w-0 flex-col items-center text-center">
      {index < steps.length - 1 ? (
        <span className="absolute left-1/2 top-4 h-px w-full bg-white/10" aria-hidden="true" />
      ) : null}
      {/* circle above connector, bounded label below */}
    </li>
  ))}
</ol>
```

Give the fixed progress wrapper an inner `mx-auto w-full max-w-3xl px-4 sm:px-6`. Remove component-level bottom margins and redundant fixed-background styles.

- [ ] **Step 6: Correct fixed-header spacing**

Set the main content spacing to provide a visible gap below both fixed bars:

```tsx
<main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-40 sm:px-6 sm:pt-48">
```

Confirm the summary bar remains reachable and no `w-screen`, negative horizontal margin, or progress width creates page-level overflow.

- [ ] **Step 7: Run focused tests and commit**

Run:

```powershell
npm.cmd test -- tests/unit/booking-media-responsive.test.ts tests/unit/booking-ui.test.ts tests/unit/booking-selection.test.ts
npm.cmd run lint -- src/components/ui/image-with-fallback.tsx src/app/booking/[slug]/booking-client.tsx src/app/booking/[slug]/booking-product-step.tsx src/app/booking/[slug]/booking-progress.tsx
git add -- src/components/ui/image-with-fallback.tsx src/app/booking/[slug]/booking-product-step.tsx src/app/booking/[slug]/booking-progress.tsx tests/unit/booking-media-responsive.test.ts
git commit --only -m "fix: make booking media and progress responsive" -- src/components/ui/image-with-fallback.tsx src/app/booking/[slug]/booking-product-step.tsx src/app/booking/[slug]/booking-progress.tsx tests/unit/booking-media-responsive.test.ts
```

Expected: focused booking suites PASS and lint reports no errors.
`booking-client.tsx` remains outside this commit because it had staged changes before this plan; its verified working-tree edit is handed back together with the existing work.

---

### Task 6: End-to-end verification and security review

**Files:**

- Modify only if verification exposes a defect in files owned by Tasks 1–5.
- Do not commit `.env.local`, provider responses, screenshots containing secrets, or `.superpowers/brainstorm`.

**Interfaces:**

- Consumes all prior tasks.
- Produces fresh evidence for database behavior, unit behavior, production compilation, mobile/desktop layout, and one real ImgBB upload.

- [ ] **Step 1: Verify no secret or Service image support leaked**

Run:

```powershell
git grep -n "IMGBB_API_KEY"
git grep -n "image_url" -- src/app/dashboard/servicos src/components/dashboard/service-form.tsx
git status --short
```

Expected: tracked files contain only the environment variable name/placeholder; Service files contain no image field; `.env.local` is absent from status.

- [ ] **Step 2: Run all unit tests**

Run:

```powershell
npm.cmd test
```

Expected: all Vitest files PASS with zero failures.

- [ ] **Step 3: Run database tests and advisors**

Run the exact commands discovered in Task 1.

Expected: all pgTAP tests PASS, the migration list includes `image_upload_quota`, and no new security/performance advisor finding is attributable to this change.

- [ ] **Step 4: Run full lint and production build**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: both commands exit 0 with no errors.

- [ ] **Step 5: Exercise a real upload locally**

With the development server and local authenticated session:

1. open a Barber form;
2. upload a JPEG/PNG/WebP under 5 MB;
3. confirm spinner and `Enviando imagem...`;
4. save and reopen the Barber;
5. repeat for a Product;
6. verify the returned public URL uses HTTPS on `i.ibb.co`;
7. remove a Product image and confirm the saved field becomes `null`;
8. confirm a file over 5 MB and a GIF are rejected before upload.

Expected: all behaviors match the specification without exposing the key in browser source, requests, or console logs.

- [ ] **Step 6: Verify responsive public booking**

Use Playwright or browser device emulation at:

- mobile: 390 × 844;
- tablet boundary: 640 × 900;
- desktop: 1440 × 1000.

Check:

- mobile shows only compact progress;
- desktop shows all seven steps without horizontal page scroll;
- content begins below fixed header/progress with visible breathing room;
- Barber and Product images appear;
- invalid URLs switch to placeholders;
- keyboard focus can select cards and navigate buttons.

- [ ] **Step 7: Review the final diff against every acceptance criterion**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

Separate this feature's files from unrelated pre-existing changes. Fix only defects introduced by this plan.

- [ ] **Step 8: Commit verification fixes only if needed**

If verification required code changes, first add a failing regression test, implement the minimal fix, rerun the relevant focused suite and the full verification commands, then:

```powershell
git add -- src/lib/image-upload src/app/api/images/upload/route.ts src/components/ui/image-upload.tsx src/components/ui/image-upload-state.ts src/components/ui/image-with-fallback.tsx src/components/dashboard/barber-form.tsx src/components/dashboard/product-form.tsx src/app/booking/[slug]/booking-product-step.tsx src/app/booking/[slug]/booking-progress.tsx tests/unit/image-upload-validation.test.ts tests/unit/imgbb-client.test.ts tests/unit/image-upload-route.test.ts tests/unit/image-upload-state.test.ts tests/unit/image-upload-forms-contract.test.ts tests/unit/booking-media-responsive.test.ts
git commit --only -m "fix: address image upload verification findings" -- src/lib/image-upload src/app/api/images/upload/route.ts src/components/ui/image-upload.tsx src/components/ui/image-upload-state.ts src/components/ui/image-with-fallback.tsx src/components/dashboard/barber-form.tsx src/components/dashboard/product-form.tsx src/app/booking/[slug]/booking-product-step.tsx src/app/booking/[slug]/booking-progress.tsx tests/unit/image-upload-validation.test.ts tests/unit/imgbb-client.test.ts tests/unit/image-upload-route.test.ts tests/unit/image-upload-state.test.ts tests/unit/image-upload-forms-contract.test.ts tests/unit/booking-media-responsive.test.ts
```

Keep `src/app/booking/[slug]/booking-client.tsx` out for the same pre-existing-change reason. If no fixes were needed, do not create an empty commit.
