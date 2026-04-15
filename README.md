# Gym Tracker

Gym-Tracker mit zwei getrennten Modi:

- **`/one-shot`**: öffentlich, ohne Datenbank, mit Copy-Paste-Export
- **`/private`**: private Supabase-Version mit Session-Historie und vorbereitetem Magic-Link-Login

## Unterstützte Anforderungen

- Neue Zeilen für neue Geräte hinzufügen
- Gewicht per `+`/`-` in `2.5 kg`-Schritten ändern
- Datumsfeld pro Trainingseinheit
- `Neues Training` übernimmt automatisch alle Werte aus der letzten Session
- Cardio separat als Minuten + ZHF pflegen
- Öffentliche One-Time-Nutzung ohne Supabase-Rückschreiben
- Trennung zwischen öffentlicher Vorlage und privater DB-Version

## Datenmodell

### Tabelle `sessions`

- `id` (UUID, PK)
- `date` (DATE)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### Tabelle `exercises`

- `id` (UUID, PK)
- `session_id` (UUID, FK -> sessions.id)
- `name` (TEXT)
- `sets` (INTEGER)
- `reps` (INTEGER)
- `weight` (NUMERIC(6,1))
- `notes` (TEXT)
- `created_at` / `updated_at` (TIMESTAMPTZ)

## Setup

Der genaue PC-Fahrplan fuer Auth, Redirects und Vercel-Env liegt in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
Als schnelle Startbasis liegt jetzt ausserdem eine [`.env.example`](./.env.example) fuer lokale und Vercel-Variablen im Repo.

1. Abhängigkeiten installieren:

```bash
npm install
```

2. In Supabase SQL Editor zuerst [`schema.sql`](./schema.sql), dann [`equipment.sql`](./equipment.sql) und für bestehende offene Installationen zusätzlich [`migrations/002_authenticated_access.sql`](./migrations/002_authenticated_access.sql) ausführen.

3. `.env.local` erstellen:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
NEXT_PUBLIC_GYM_TRACKER_ORIGIN=https://gym.w3yh.xyz
NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=false
W3YH_PRIVATE_HANDOFF_SECRET=<derselbe-wert-wie-im-private-gate>
# optional für den privaten Login-Flow:
# GYM_ALLOWED_EMAILS=mail1@example.com,mail2@example.com
```

4. App starten:

```bash
npm run dev
```

## Deployment (Vercel)

`vercel.json` enthält nur Build-Kommandos. Für die private Version setzt du im Vercel-Projekt:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GYM_TRACKER_ORIGIN`
- optional `NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=true`
- optional `GYM_ALLOWED_EMAILS=...`
- optional `W3YH_PRIVATE_HANDOFF_SECRET=...` fuer signierten Gate-Handoff

## Hinweise

- Die öffentliche Vorlage unter `/one-shot` speichert nur lokal im Browser und schreibt **nicht** nach Supabase zurück.
- Die private Version unter `/private` ist auf Magic-Link-Login vorbereitet. Der Route-Handler sitzt unter `src/app/api/auth/magic-link/route.ts`.
- Fuer das neue Private-Gate kann Gym ausserdem `src/app/auth/handoff/route.ts` verwenden, um eine bestehende Session vom zentralen Gate lokal auf `gym.w3yh.xyz` zu uebernehmen. Solange die Alias-Domain noch fehlt, ist `https://w3yh.xyz/private/go/gym` der reale Live-Pfad.
- Die Repo-SQL-Dateien sind jetzt auf **`authenticated` statt `public`** gestellt. Für Altbestände brauchst du das Nachzieh-Script `migrations/002_authenticated_access.sql`.
- Für echte Abschottung reicht der Code allein nicht: In Supabase Auth sollten öffentliche Signups aus oder nur explizit eingeladene Nutzer aktiv sein.
- Für die komplette PC-Checkliste: [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
