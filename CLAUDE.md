@AGENTS.md

# Project Rules — EMBER Storefront

## Language

ALL code is written in English: variable names, function names, file names,
component names, database columns, comments, commit messages. No exceptions.
Albanian text exists ONLY inside `messages/sq.json` and in database
translation table rows. Never hardcode Albanian (or English) UI text in a component.

## Architecture rules — non-negotiable

1. All database writes go through Server Actions in `src/lib/actions/`.
   Every file there starts with `import 'server-only'`.
2. All database reads go through `src/lib/data/`. Also `server-only`.
3. A Supabase client is NEVER created inside a Client Component.
4. `SUPABASE_SERVICE_ROLE_KEY` is only ever referenced in `server-only` files.
5. Prices, discounts, shipping and totals are ALWAYS recomputed on the server
   from the database. The client sends only { productId, quantity }.
6. Every Server Action starts with: Zod validation, then auth check (if admin),
   then the work. In that order.
7. Every admin Server Action independently re-verifies admin status.
   A UI guard is not a security boundary.

## Component rules

8. Default to Server Components. Add 'use client' only for state, event
   handlers, or browser APIs — and push it to the smallest possible leaf.
9. Pages fetch data and pass props down. Components do not fetch their own data.
10. Never use `dangerouslySetInnerHTML`.
11. Never use `localStorage` except inside the cart store.

## Styling rules

12. Use ONLY the CSS variables defined in `globals.css`. Never write a raw hex
    colour in a component.
13. Dark theme only. No light mode.
14. Use shadcn/ui primitives as installed. Do not fork their internals.
15. Motion goes through the shared `<Reveal>` component. Do not write one-off
    Framer Motion variants.

## Type rules

16. `src/types/database.ts` is GENERATED. Never edit it by hand.
17. No `any`. No `@ts-ignore`.

## Working style

18. Do one thing per response. Do not scaffold ahead.
19. After changing the database schema, tell me to run the type generation script.
20. If a requirement is ambiguous, ask before writing code.
