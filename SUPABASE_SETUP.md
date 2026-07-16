# Gym Tracker Supabase Setup

Der Kram, den du am PC in Supabase und Vercel anfassen musst, in der richtigen Reihenfolge.

## 1. SQL im Supabase SQL Editor ausführen

Reihenfolge:

1. `schema.sql`
2. `equipment.sql`
3. `migrations/002_authenticated_access.sql`

Ziel für ein eigenes Projekt:

- Tabellen `gt_sessions`, `gt_exercises`, `gt_equipment` stehen sauber
- alte offene Policies werden auf `authenticated` umgestellt

Im geteilten W3YH-Projekt gilt stattdessen die zentrale Migration
`20260716_private_app_memberships.sql`: `gt_sessions` und `gt_exercises`
verlangen eine aktive `gym`-Mitgliedschaft. `gt_equipment` darf weiterhin
öffentlich lesbar bleiben.

## 2. Supabase Auth dichtziehen

Pfad in Supabase:

- `Authentication -> Providers -> Email`
- `Authentication -> URL Configuration`

Stell ein:

- Email-Provider aktiv lassen
- `Confirm email` nur so lassen, wie dein Projekt es ohnehin braucht
- globale Sign-ups nur abschalten, wenn das Projekt nicht mit einer öffentlichen App geteilt wird
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
NEXT_PUBLIC_W3YH_PRIVATE_GATE_ORIGIN=https://private.w3yh.xyz
GYM_ALLOWED_EMAILS=deine@mail.de,optional@family.de
SUPABASE_SECRET_KEY=<secret-oder-service-role-key>
W3YH_PRIVATE_HANDOFF_GYM_REDEEM_SECRET=<mindestens-32-zufallszeichen>
```

Wichtig:

- `NEXT_PUBLIC_GYM_TRACKER_ORIGIN` muss die echte Origin sein, ohne Pfad hinten dran
- `NEXT_PUBLIC_W3YH_PRIVATE_GATE_ORIGIN` muss die exakte HTTPS-Origin des Gates sein
- `GYM_ALLOWED_EMAILS` klein, komma-getrennt, kein Leerzeichen-Chaos
- der frühere Shared-Secret-Handoff ist deaktiviert und darf nicht wieder gesetzt werden
- Secret-/Service-Role-Key und Audience-Secret bleiben ausschließlich serverseitig
- im Shared-Projekt ist `authenticated` allein keine Autorisierung; Zugriff braucht zusätzlich eine aktive `private_app_memberships`-Zeile für `gym`

## 4. Was du danach testen musst

1. `/one-shot` öffnen
   - muss ohne Login funktionieren
   - darf nichts in Supabase schreiben
2. `/private` öffnen
   - muss Login-Maske zeigen
3. erlaubte Mail eintragen
   - Passwort-Login oder Magic-Link-Fallback muss kontrolliert reagieren
4. Mail-Link anklicken
   - Rücksprung auf `/private`
5. `https://w3yh.xyz/private/go/gym` öffnen
   - final: `https://private.w3yh.xyz/go/gym`
   - Gate muss direkt in `/private` landen; URL und Historie dürfen weder Session-Tokens noch den Einmal-Code enthalten
6. neue Session anlegen
   - `gt_sessions` und `gt_exercises` müssen sauber beschrieben werden
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
ohne offenen SQL-Editor grob gegenprüfen:

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

- `gt_equipment` darf für den Anon-Key lesbar bleiben
- `gt_sessions` und `gt_exercises` dürfen für Anon keinen Zugriff liefern
- ein normaler authentifizierter Nutzer ohne `gym`-Mitgliedschaft erhält null Zeilen
- globale Signup-Defaults dürfen im Shared-Projekt aktiv sein, solange Membership-RLS greift

Wenn ein authentifizierter Nicht-Mitglied-Nutzer Gym-Zeilen sieht, fehlt die
zentrale Membership-RLS und der Rollout ist kaputt.

## 7. Wenn es haengt

- `GYM_ALLOWED_EMAILS` fehlt -> Route antwortet mit Serverfehler
- `NEXT_PUBLIC_GYM_TRACKER_ORIGIN` ist falsch -> Magic Link springt an die falsche URL
- `NEXT_PUBLIC_W3YH_PRIVATE_GATE_ORIGIN` ist falsch -> `/auth/gate` lehnt den Browser-POST mit `403` ab
- Audience-Secret oder Service-Key fehlt -> Einmal-Code kann keine lokale Session minten
- Redirect URL in Supabase fehlt -> Link kommt an, aber Login landet nicht sauber in `/private`
- `private_app_memberships` oder die Membership-Policies fehlen -> direkter Datenzugriff ist nicht sauber verriegelt
