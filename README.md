# Gym Tracker

Gym-Tracker mit zwei getrennten Modi:

- **`/one-shot`**: öffentlich, ohne Datenbank, mit Copy-Paste-Export
- **`/private`**: private Supabase-Version mit Session-Historie; bevorzugter Einstieg läuft über das w3yh Private Gate, Magic Link bleibt Fallback

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

Der genaue PC-Fahrplan für Auth, Redirects und Vercel-Env liegt in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
Als schnelle Startbasis liegt jetzt außerdem eine [`.env.example`](./.env.example) für lokale und Vercel-Variablen im Repo.

1. Abhängigkeiten installieren:

```bash
npm install
```

2. Für ein eigenes Supabase-Projekt zuerst [`schema.sql`](./schema.sql) und [`equipment.sql`](./equipment.sql) ausführen. Im geteilten W3YH-Projekt werden App-Mitgliedschaft und RLS zentral über die W3YH-Migrationen verwaltet.

3. `.env.local` erstellen:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
NEXT_PUBLIC_GYM_TRACKER_ORIGIN=https://gym.w3yh.xyz
NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=false
NEXT_PUBLIC_W3YH_PRIVATE_GATE_ORIGIN=https://private.w3yh.xyz
# optional für den privaten Login-Flow:
# GYM_ALLOWED_EMAILS=mail1@example.com,mail2@example.com
# nur serverseitig:
# SUPABASE_SECRET_KEY=<secret-oder-service-role-key>
# W3YH_PRIVATE_HANDOFF_GYM_REDEEM_SECRET=<mindestens-32-zufallszeichen>
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
- `NEXT_PUBLIC_W3YH_PRIVATE_GATE_ORIGIN`
- optional `NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=true`
- optional `GYM_ALLOWED_EMAILS=...`
- `SUPABASE_SECRET_KEY` oder `SUPABASE_SERVICE_ROLE_KEY` nur serverseitig
- `W3YH_PRIVATE_HANDOFF_GYM_REDEEM_SECRET` nur serverseitig

## Hinweise

- Die öffentliche Vorlage unter `/one-shot` speichert nur lokal im Browser und schreibt **nicht** nach Supabase zurück.
- Die private Version unter `/private` hat einen direkten Passwort-/Magic-Link-Fallback. Primär läuft der Einstieg über `https://private.w3yh.xyz/go/gym`.
- Das Private Gate sendet einen kurzlebigen Einmal-Code per `POST` an `/auth/gate`. Gym löst ihn serverseitig ein, prüft Nutzer, Allowlist und App-Mitgliedschaft erneut und mintet eine lokale hostgebundene Session.
- `src/app/auth/handoff/route.ts` lehnt den alten signierten Session-Handoff dauerhaft mit `410 Gone` ab.
- Im geteilten Hosted-Supabase-Projekt bleiben globale Sign-ups wegen `meindeinunser` aktiv. Gym-Daten sind trotzdem über `private_app_memberships` plus RLS verriegelt; die Rolle `authenticated` allein reicht nicht.
- Für die komplette PC-Checkliste: [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
