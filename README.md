# Mission Control UI

Production-ready Next.js App Router interface for managing Clawdbot agents, tickets, and Allan gateway workflows via Supabase.

## Stack
- Next.js 14 + TypeScript
- Tailwind CSS + shadcn/ui-style components
- Supabase Auth, Postgres, Realtime
- TanStack Query

## Prerequisites
- Node.js 18+
- npm 9+
- A Supabase project

## Setup
1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and set values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, server-only)
   - `OPENCLAW_GATEWAY_URL`
   - `OPENCLAW_GATEWAY_TOKEN`
   - `OPENCLAW_ALLAN_AGENT_ID` (optional)
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000).

## Available scripts
- `npm run dev` — start local development server
- `npm run build` — create production build
- `npm run start` — start production server
- `npm run lint` — run ESLint

## Routes
- `/login`: Supabase email magic link / OTP login
- `/dashboard`: Metrics + recent activity
- `/tickets`: Searchable ticket list with filters and bulk actions
- `/projects`: Project listing view
- `/project-files`: File browser for project artifacts
- `/board`: Board view for mission items

## API routes
- `POST /api/tickets`: create a ticket for the current authenticated agent mapping
- `POST /api/allan/request`: forwards Allan requests to the configured gateway
- `GET /api/allan-chat/history`: fetches Allan chat history from gateway-compatible endpoints
- `GET /api/vm/status`: checks VM status
- `POST /api/vm/restart`: restarts VM

## Deploy to Vercel
1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set all environment variables from `.env.example` in Vercel project settings.
4. Deploy.

## Build
```bash
npm run build
```
