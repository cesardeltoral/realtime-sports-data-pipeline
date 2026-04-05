# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint (flat config, eslint-config-next with core-web-vitals + typescript)

No test runner is configured yet.

## Tech Stack

- **Next.js 16.2** (App Router) with React 19 and TypeScript (strict mode)
- **Tailwind CSS v4** via `@tailwindcss/postcss` plugin (no `tailwind.config` file — v4 uses CSS-based configuration in `app/globals.css`)
- Path alias: `@/*` maps to the project root

## Architecture

This is a fresh `create-next-app` scaffold using the App Router (`app/` directory). There is no `pages/` router.

- `app/layout.tsx` — root layout, loads Geist and Geist Mono fonts
- `app/page.tsx` — home page (single route so far)
- `app/globals.css` — global styles and Tailwind directives

## Important: Next.js 16 Breaking Changes

This project runs Next.js 16, which has breaking changes from earlier versions. **Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`** to verify current APIs and conventions. Do not rely on training data for Next.js APIs.
