# Mission Control UI

Production-ready Next.js App Router interface for managing Clawdbot agents via Supabase.

## Stack
- Next.js 14 + TypeScript
- Tailwind CSS + shadcn/ui-style components
- Supabase Auth, Postgres, Realtime
- TanStack Query

## Setup
1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and set values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, server-only)
   - `ALLAN_GATEWAY_URL` (optional)
   - `ALLAN_GATEWAY_TOKEN` (optional)
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run development server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000.

## Routes
- `/login`: Supabase email magic link / OTP login
- `/dashboard`: Metrics + recent activity
- `/tickets`: Searchable ticket list with status filter
- `/tickets/[id]`: Ticket details, status update, realtime comments
- `/chat/allan`: Realtime chat channel
- `/requests/new`: Structured request form + command preview
- `POST /api/allan/request`: stubbed gateway forwarding endpoint

## Deploy to Vercel
1. Push this repo to GitHub.
2. Import project in Vercel.
3. Set all environment variables from `.env.example` in Vercel project settings.
4. Deploy.
5. .

## Build
```bash
npm run build
```
