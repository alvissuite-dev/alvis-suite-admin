# Alvis Suite — Web Portal

Luxury short-term rental booking website + admin dashboard.
Built with Next.js 14, Tailwind CSS, and Supabase.

---

## Pages

### Public (guest-facing)
| Route | Description |
|---|---|
| `/` | Hero + property grid + booking modal |

### Admin portal
| Route | Description |
|---|---|
| `/admin/login` | Host login (demo: admin@alvissuite.com / admin123) |
| `/admin/dashboard` | KPIs, today's check-ins, recent bookings |
| `/admin/bookings` | All bookings — confirm/cancel/search/filter |
| `/admin/properties` | Add/edit/deactivate properties |
| `/admin/availability` | Block dates per property |
| `/admin/guests` | Guest records + booking history |

---

## Quick start (3 commands)

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials (see below)
npm run dev
```

Open http://localhost:3000

---

## Supabase setup

1. Create a free project at https://supabase.com
2. Go to SQL Editor → paste the contents of `supabase/schema.sql` → Run
3. Go to Settings → API → copy your Project URL and anon key
4. Paste into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Go to Authentication → Users → Add user
   - Email: admin@alvissuite.com
   - Password: admin123 (change this for production)

---

## Without Supabase (mock mode)

The app works fully with mock data out of the box.
No Supabase needed to see all screens.

Just run:
```bash
npm install && npm run dev
```

The `.env.local` file can have placeholder values:
```
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
```

---

## Deploy to Vercel (1 command)

```bash
npx vercel
```

Then add the 3 environment variables in your Vercel project settings.

---

## Tech stack
- **Next.js 14** — App Router
- **Tailwind CSS** — Styling
- **Lucide React** — Icons
- **Supabase** — Database + Auth
- **React Day Picker** — Date selection
- **date-fns** — Date utilities
