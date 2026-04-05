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

- **Frontend**: Next.js 16.2 (App Router) with React 19 and TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` plugin (no `tailwind.config` file — v4 uses CSS-based config in `app/globals.css`)
- **Producer**: Python with `statsbombpy` + `confluent-kafka`
- **Consumer**: Node.js/TypeScript with `kafkajs`, Prisma (MySQL), Mongoose (MongoDB)
- **API**: Node.js/TypeScript with GraphQL + WebSockets
- **Broker**: Apache Kafka (topic: `ucl-live-feed`)
- **Databases**: MySQL (relational metadata), MongoDB (event logs + coordinates)
- **Infrastructure**: Docker Compose (Kafka, Zookeeper, MySQL, MongoDB)
- Path alias: `@/*` maps to the project root

## Architecture

Real-time sports data pipeline: StatsBomb → Kafka → polyglot databases → GraphQL/WebSocket delivery.

```
app/                    ← Next.js frontend (UI only, consumes the API service)
services/
  producer/             ← Python: fetches StatsBomb UCL data, publishes to Kafka
  consumer/             ← Node.js/TS: subscribes to Kafka, routes to MySQL + MongoDB
  api/                  ← Node.js/TS: GraphQL (joins both DBs) + WebSockets (live feed)
infra/                  ← Docker Compose for Kafka, MySQL, MongoDB
```

- The Next.js frontend is a **client** of `services/api/`, not the host of the API
- The `services/api/` server is separate because it needs persistent WebSocket connections and independent scaling
- Database routing: team/player/match metadata → MySQL (Prisma), play-by-play events with x/y coordinates → MongoDB (Mongoose)

## Important: Next.js 16 Breaking Changes

This project runs Next.js 16, which has breaking changes from earlier versions. **Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`** to verify current APIs and conventions. Do not rely on training data for Next.js APIs.
