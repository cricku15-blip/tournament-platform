# Sports Tournament Platform (Web Application)

A modern, high-performance web platform for local sports tournaments, direct squad management, and real-time player auctions. Designed to support 10,000–15,000 users from day one.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: v22+ (v24 recommended)
- **npm**: v10+
- **Supabase CLI** (optional, for local DB operations)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```
Fill in your Supabase project keys in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.
Visit [http://localhost:3000/dev/ui](http://localhost:3000/dev/ui) for the interactive UI component catalog.

---

## 🛠️ Scripts & Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the application for production |
| `npm run start` | Runs the production build |
| `npm run lint` | Runs ESLint |
| `npm run typecheck` | Validates TypeScript strictly |
| `npm test` | Runs Vitest unit tests |
| `npm run check:budget` | Verifies landing page JS bundle is under 150 KB (gzipped) |
| `npm run db:types` | Regenerates `types/supabase.ts` from the linked project |

---

## 🗄️ Database Migrations & Types

1. **Migrations are append-only** in `supabase/migrations/` (owned by Plan 1).
2. To link to Supabase and apply migrations:
   ```bash
   npx supabase link --project-ref $SUPABASE_PROJECT_REF
   npx supabase db push
   ```
3. To regenerate TypeScript database types after any migration:
   ```bash
   npm run db:types
   ```

---

## 📐 Architecture & Plans

- `RULES.md`: Architecture rules, scale targets, and conventions.
- `tournament-platform-web-spec.md`: Complete functional and visual specification.
- `plan-1-supabase-backend.md`: Database schemas, RLS policies, and Edge Functions.
- `plan-2-web-foundation.md`: Design system, layouts, Supabase clients, error mapping, system pages.
- `plan-3` to `plan-10`: Product feature phases.
