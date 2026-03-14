# CLAUDE.md — AI Development Rules for Threadcount

This file contains the rules for working with an AI assistant (Claude) in this repository. These rules are always in effect. Read this file before doing anything else.

---

## The Most Important Rule: The User Is a Beginner

**The owner of this repo has zero coding background.**

This means:
- Every explanation must be written in plain, everyday English — no jargon without a clear definition
- Never assume the user knows what a function, hook, migration, or type is without explaining it
- When something goes wrong, explain what went wrong, why it went wrong, and exactly what to do to fix it — step by step
- When a terminal command is needed, write the exact command. Do not say "run the install command" — write `npm install`
- When a file needs to be edited manually, say exactly which file, which line, and what to change
- Treat every interaction as if you are teaching someone who is learning to code for the first time

---

## Plan-Driven Development

All features in this repo are planned before they are built. Plans live in the `plans/` directory:

```
plans/
  plan-1.md   ← Foundation (schema, auth, navigation)
  plan-2.md   ← Core features (browse, closet, compare)
  plan-3.md   ← Social features (reviews, follows, feed, search)
```

**Before writing any code:**
1. Read the relevant plan file
2. Identify the current chunk (the next uncompleted section)
3. Summarize the chunk in plain English — what it does, what files it touches, whether any database changes are needed
4. If the chunk requires a database migration, generate and apply the migration first
5. Only then begin writing code

**Never skip ahead.** Work through chunks in the order they appear in the plan.

---

## Pre-Implementation Checklist

Before starting any chunk, always:

1. **Explain the goal** — what this chunk does in plain English, as if explaining to a beginner
2. **List affected files** — which files will be created or changed
3. **Show schema changes** — if any database tables or migrations are needed, show them before coding
4. **Flag risks** — note anything that could break, fail, or require a manual step

Stop and wait for confirmation if anything is unclear or if a migration is needed.

---

## Test-Driven Development (TDD)

Every feature must be built using TDD — tests first, then implementation.

The cycle for every task:
1. Write the failing test
2. Run the test — confirm it fails (and explain why it's supposed to fail)
3. Write the implementation
4. Run the test — confirm it passes
5. Run the full test suite — confirm nothing else broke

**Never write implementation code before writing a test for it.**

Tests live in `src/__tests__/` and mirror the `src/` structure:
- `src/__tests__/services/` for service tests
- `src/__tests__/lib/` for utility/library tests
- `src/__tests__/context/` for context tests

---

## Commit and Push Requirements

After every logical unit of work (typically one task or one file pair):

1. Run all tests: `npx jest`
2. Confirm all tests pass
3. Stage only the relevant files — do not use `git add .` blindly
4. Write a clear commit message using the format: `feat: description of what was added`
5. Push to GitHub immediately: `git push`

**Commit message format:**
- `feat:` — new feature or file
- `fix:` — bug fix
- `chore:` — non-code change (docs, config, migrations)

Example: `feat: add comparisonService (recordComparison with score updates)`

**Never leave uncommitted work at the end of a session.**

---

## Work in Small Chunks

Each chunk in a plan is already broken into small tasks. Follow them exactly — do not combine multiple tasks into one commit, and do not skip steps.

If a task has steps labeled Step 1, Step 2, Step 3 — do them in that exact order.

If a step says "run the test and confirm it fails" — run it. Do not assume it will fail.

---

## One Chunk at a Time

After completing a chunk:
1. Run the full test suite
2. Commit all changes from the chunk
3. Push to GitHub
4. Stop and summarize what was done in plain English
5. Wait for the user to say "continue" before starting the next chunk

Do not automatically start the next chunk. Always wait.

---

## Supabase Migrations

When a migration is required:
1. Show the SQL first and explain in plain English what it does
2. Apply it using the Supabase MCP tool (`mcp__claude_ai_Supabase__apply_migration`) — do not rely on `supabase db push` unless the CLI is confirmed to be set up and logged in
3. Confirm the migration was applied successfully before writing any code that depends on it
4. Commit the migration file: `supabase/migrations/NNN_description.sql`

Migration files are numbered and named sequentially. Never reuse a number.

---

## Supabase Edge Functions

When an Edge Function is required:
1. Create the file under `supabase/functions/<function-name>/index.ts`
2. Deploy using `supabase functions deploy <function-name>` or the Supabase MCP deploy tool
3. Confirm the deploy succeeded before writing app code that calls it
4. Commit the function file

---

## What Not To Do

- Do not refactor code that wasn't part of the current task
- Do not add comments, docstrings, or type annotations to code you didn't change
- Do not add error handling for scenarios that can't happen in this app
- Do not create helper utilities for one-off operations
- Do not add features beyond what the current chunk specifies
- Do not combine multiple chunks into a single commit
- Do not push broken code — all tests must pass before pushing

---

## Architecture Pattern

This repo follows a strict three-layer architecture. Every feature uses the same structure:

```
Service → Hook → Screen
```

- **Service** (`src/services/`) — raw Supabase queries only. No React, no state.
- **Hook** (`src/hooks/`) — calls the service, manages loading/error state with `useState` and `useEffect`. No UI.
- **Screen** (`src/screens/`) — renders the data from the hook. No direct Supabase calls.

Never call Supabase directly from a screen. Always go through a service.

See `ARCHITECTURE.md` for the full breakdown.

---

## Project-Specific Notes

- **Supabase project ref:** `rwmrptlhcnmikqoozlcc`
- **App scheme:** `threadcount://`
- **Bundle ID (iOS):** `com.threadcount.app`
- **Android package:** `com.threadcount.app`
- **GitHub repo:** `https://github.com/zachshutan/ThreadCount.git`
- **Google OAuth:** Web client only (Android SHA-1 setup intentionally deferred)
- **Expo SDK:** 55
- **React Native:** 0.83.2
