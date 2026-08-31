# HeadBarber — Codex Instructions

## Goal

Solve the requested task with the **smallest useful context and smallest safe diff**.

Do not explore the repository broadly when targeted search can answer the question.

## Context and Token Budget

1. Start from the user's request. **Search before reading.**
2. Prefer `rg -n`, `rg --files`, filename/symbol search, and narrow directory listings.
3. Open only the **1–3 most relevant files first**. Expand only when evidence shows it is necessary.
4. For large files, read the relevant function, component, or section instead of dumping the whole file.
5. Do not reread unchanged files or repeat searches that already answered the question.
6. **Stop exploring as soon as the implementation path is clear.**
7. Never scan generated/dependency output unless specifically required:

   * `node_modules/`
   * `.next/`
   * `coverage/`
   * `playwright-report/`
   * `test-results/`
8. Do not read `package-lock.json` unless changing/debugging dependencies or lockfile behavior.
9. Do not load README, docs, product/design documentation, or agent skills by default.
10. For simple/local tasks, skip long plans and explanations. **Inspect → change → validate → report.**

## Project Map

Use this map instead of rediscovering the repository on every task:

* `src/app/` — Next.js App Router pages, layouts, route handlers and application flows.
* `src/components/` — reusable UI/components.
* `src/lib/` — application and integration helpers, including plans, Stripe, image upload and WhatsApp.
* `src/utils/` — shared utilities.
* `src/proxy.ts` — request/proxy-related logic.
* `PRODUCT.md` — product and UX principles. Read only for UI, UX, product behavior or design decisions.
* `design-system/` — visual/design references. Read only for visual/UI work.
* `docs/` — consult only when the task points to documented functionality or architecture.
* `.agents/skills/supabase/` — load only for relevant Supabase work.
* `.agents/skills/supabase-postgres-best-practices/` — load only for Postgres, SQL, RLS, database or related Supabase work.

## Stack

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS 4
* Supabase
* Stripe
* Vitest
* Playwright

## Next.js 16 Rule

This project uses Next.js 16 and may differ from older training knowledge.

When touching a **Next.js-specific API, convention, behavior or file structure**, locate the exact relevant documentation under:

`node_modules/next/dist/docs/`

Read **only the needed file or section**.

Do not scan the documentation tree wholesale.

Prefer installed-version documentation over memory.

## Implementation Rules

* Make the narrowest change that fully solves the request.
* Reuse existing project patterns before inventing abstractions.
* Do not refactor unrelated code.
* Do not rename unrelated symbols.
* Do not reorder unrelated files.
* Do not mass-format the repository.
* Do not add dependencies when existing code or platform APIs can reasonably solve the task.
* Do not change behavior outside the requested scope unless required for correctness.
* Preserve server/client boundaries.
* Preserve existing TypeScript conventions.
* Avoid comments that merely restate obvious code.
* Prefer editing existing code over creating new abstractions for one-use behavior.
* If the request is slightly underspecified, infer from adjacent code and established patterns instead of exploring the entire repository.

## Search Strategy

Before opening many files:

1. Search for the relevant route, component, function, database table, string, error, API endpoint or symbol.
2. Inspect its definition.
3. Inspect direct callers/imports only when required.
4. Implement once the dependency path is understood.

Avoid repository-wide architectural exploration for isolated changes.

## Sensitive Paths

For:

* authentication;
* Supabase;
* database/RLS;
* billing;
* subscriptions;
* Stripe;
* webhooks;
* secrets;

inspect the direct caller, implementation and immediately related persistence/config before changing code.

Never:

* expose or commit secrets;
* weaken authentication to make a flow work;
* bypass RLS;
* remove authorization checks;
* break tenant/user isolation.

Keep payment/webhook operations idempotent when applicable.

Avoid schema/migration changes unless the task actually requires them.

## Supabase Rule

Do **not** automatically load every Supabase skill or database document.

For Supabase/database tasks:

1. Determine the exact affected table/query/auth flow.
2. Load only the relevant project code.
3. Load `.agents/skills/supabase/` or `supabase-postgres-best-practices` only when their guidance materially helps the task.

Avoid repeatedly rereading the same skill during one task.

## UI/Product Work

Only for UI/UX tasks, inspect `PRODUCT.md` and relevant design-system material.

Preserve HeadBarber's:

* professional appearance;
* premium but restrained style;
* direct interface;
* strong readability;
* low visual clutter;
* responsive behavior;
* accessible interaction states.

Do not load product/design files for unrelated backend tasks.

## Large Files

For large source files:

* search for the component/function first;
* inspect a narrow line range where possible;
* expand context incrementally;
* do not dump an entire large file merely to edit one function.

## Dependencies

Before installing a package:

1. Check whether the project already has a dependency providing the functionality.
2. Check whether Node.js, React or browser APIs can solve it simply.
3. Add a new dependency only when it clearly reduces complexity or is necessary.

Never inspect the entire lockfile to understand installed packages. Use `package.json`.

## Validation Ladder

Validation must be proportional to the change.

Do **not** automatically run every expensive command.

### Level 1 — Local inspection

Always start with:

* edited code;
* affected imports;
* direct references.

### Level 2 — Targeted validation

Run targeted lint/test for affected behavior when available.

### Level 3 — Unit/integration suite

Run:

`npm test`

only when the change has meaningful impact beyond a very narrow isolated edit.

### Level 4 — E2E

Run:

`npm run test:e2e`

only for:

* relevant end-to-end user flows;
* booking;
* authentication;
* subscriptions/payments;
* cross-page behavior;
* or when explicitly requested.

### Level 5 — Build

Run:

`npm run build`

for:

* deployment changes;
* Next.js configuration;
* server/client boundary changes;
* significant cross-cutting modifications;
* or when explicitly requested.

Do not repeatedly rerun an unchanged failing command unless new evidence justifies it.

## Available Commands

* `npm run dev`
* `npm run build`
* `npm run lint`
* `npm test`
* `npm run test:e2e`

## Avoid Waste

Do not:

* investigate unrelated TODOs;
* fix unrelated lint errors;
* refactor nearby code “while here”;
* inspect every directory before starting;
* summarize files already understood;
* explain obvious implementation details repeatedly;
* generate long plans for straightforward tasks;
* run E2E/build for trivial visual/text changes;
* search the web when repository code or installed documentation already answers the question;
* reread files just to reconfirm information already established.

## Working Memory

During larger tasks, maintain a compact mental/task summary containing only:

* objective;
* relevant files;
* discovered constraints;
* decisions made;
* remaining work.

Use that summary rather than reopening files solely to reconstruct context.

## Done Condition

Stop when:

1. the requested behavior is implemented;
2. directly affected code is consistent;
3. appropriate validation has passed or a real blocker has been identified.

Do not continue exploring after the task is solved.

## Final Response

Keep the final response concise.

Report only:

* what changed;
* important files changed;
* validation performed and result;
* any real remaining risk or blocker.

Do not paste full diffs, extensive reasoning or unrelated suggestions unless requested.
