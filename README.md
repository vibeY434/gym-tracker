# Gym Tracker

Ein einfacher Gym-Tracker für wiederkehrende Geräte-Sessions mit Supabase + Next.js.

## Unterstützte Anforderungen

- Neue Zeilen für neue Geräte hinzufügen
- Gewicht per `+`/`-` in `2.5 kg`-Schritten ändern
- Datumsfeld pro Trainingseinheit
- `Neues Training` übernimmt automatisch alle Werte aus der letzten Session
- Cardio separat als Minuten + ZHF pflegen

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

1. Abhängigkeiten installieren:

```bash
npm install
```

2. In Supabase SQL Editor zuerst [`schema.sql`](./schema.sql), danach optional [`seed-data.sql`](./seed-data.sql) ausführen.

3. `.env.local` erstellen:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
```

4. App starten:

```bash
npm run dev
```

## Deployment (Vercel)

`vercel.json` enthält nur Build-Kommandos. Setze die beiden `NEXT_PUBLIC_SUPABASE_*` Variablen im Vercel-Projekt unter *Settings -> Environment Variables*.

## Hinweise

- Das Schema enthält offene RLS-Policies (`USING true`) für einen schnellen Single-User-Start.
- Für Multi-User-Betrieb sollte Auth aktiviert und Policies auf `auth.uid()` umgestellt werden.
