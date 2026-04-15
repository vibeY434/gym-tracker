# Gym Tracker Supabase Setup

Der Kram, den du am PC in Supabase und Vercel anfassen musst, in der richtigen Reihenfolge.

## 1. SQL im Supabase SQL Editor ausfuehren

Reihenfolge:

1. `schema.sql`
2. `equipment.sql`
3. `migrations/002_authenticated_access.sql`

Ziel:

- Tabellen `gt_sessions`, `gt_exercises`, `gt_equipment` stehen sauber
- alte offene Policies werden auf `authenticated` umgestellt

## 2. Supabase Auth dichtziehen

Pfad in Supabase:

- `Authentication -> Providers -> Email`
- `Authentication -> URL Configuration`

Stell ein:

- Email-Provider aktiv lassen
- `Confirm email` nur so lassen, wie dein Projekt es ohnehin braucht
- `Enable email signups` aus, wenn nur eine feste Allowlist rein darf
- `Site URL` auf deine echte App-URL setzen, z. B. `https://gym.w3yh.xyz`
- zusätzliche Redirect URL auf `https://gym.w3yh.xyz/private`

Wenn du erstmal ueber eine Vercel-Preview testest, genau diese Preview-URL ebenfalls als Redirect URL eintragen.

## 3. Vercel-Umgebungsvariablen setzen

Nutze bei Bedarf zuerst [`.env.example`](./.env.example) als Vorlage und ziehe die gleichen Werte danach ins Vercel-Projekt.

Im Vercel-Projekt vom Gym-Tracker diese Variablen setzen:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
NEXT_PUBLIC_GYM_TRACKER_ORIGIN=https://gym.w3yh.xyz
NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=true
GYM_ALLOWED_EMAILS=deine@mail.de,optional@family.de
W3YH_PRIVATE_HANDOFF_SECRET=<derselbe-wert-wie-im-private-gate>
```

Wichtig:

- `NEXT_PUBLIC_GYM_TRACKER_ORIGIN` muss die echte Origin sein, ohne Pfad hinten dran
- `GYM_ALLOWED_EMAILS` klein, komma-getrennt, kein Leerzeichen-Chaos
- `W3YH_PRIVATE_HANDOFF_SECRET` wird nur fuer den signierten Handoff vom zentralen Gate gebraucht

## 4. Was du danach testen musst

1. `/one-shot` oeffnen
   - muss ohne Login funktionieren
   - darf nichts in Supabase schreiben
2. `/private` oeffnen
   - muss Login-Maske zeigen
3. erlaubte Mail eintragen
   - Magic Link Mail muss rausgehen
4. Mail-Link anklicken
   - Ruecksprung auf `/private`
5. solange die Alias-Domain fehlt: `https://w3yh.xyz/private/go/gym` oeffnen
   - spaeter final: `https://private.w3yh.xyz/go/gym`
   - App muss ueber den Handoff mit bestehender Gate-Session direkt in `/private` landen
6. neue Session anlegen
   - `gt_sessions` und `gt_exercises` muessen sauber beschrieben werden
7. zweite, nicht erlaubte Mail testen
   - kein offener Zugang

## 5. Schneller SQL-Check nach dem Login-Test

Im Supabase SQL Editor:

```sql
select count(*) from gt_sessions;
select count(*) from gt_exercises;
select * from gt_sessions order by date desc limit 5;
```

## 6. Read-only API Check ohne Dashboard

Wenn du `.env.local` per `vercel env pull` gezogen hast, kannst du den Zustand auch
ohne offenen SQL-Editor grob gegenpruefen:

```bash
set -a
. ./.env.local
set +a

curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/gt_sessions?select=id&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"

curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/gt_exercises?select=id&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"

curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/gt_equipment?select=id,name&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"

curl "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Erwartung nach sauberem Rollout:

- `gt_equipment` darf fuer den Anon-Key lesbar bleiben
- `gt_sessions` und `gt_exercises` sollten **nicht** mehr anonym mit `200` offen sein
- `auth/v1/settings` sollte nicht mehr auf einem leeren `site_url` oder offenen Signup-Defaults haengen

Wenn `gt_sessions` oder `gt_exercises` weiter anonym `200` liefern, ist der SQL-/RLS-Teil
aus `migrations/002_authenticated_access.sql` noch nicht wirksam.

## 7. Wenn es haengt

- `GYM_ALLOWED_EMAILS` fehlt -> Route antwortet mit Serverfehler
- `NEXT_PUBLIC_GYM_TRACKER_ORIGIN` ist falsch -> Magic Link springt an die falsche URL
- Redirect URL in Supabase fehlt -> Link kommt an, aber Login landet nicht sauber in `/private`
- `migrations/002_authenticated_access.sql` nicht gelaufen -> Policies bleiben offen oder schief
