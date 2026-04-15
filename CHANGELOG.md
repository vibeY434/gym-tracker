# CHANGELOG.md — Gym-Tracker App

## v1.1.0 — 2026-04-13 (In Progress)

### Architektur & Sicherheit
- **Cookie-basierte Browser-Session vereinheitlicht:** `src/lib/supabase.ts` nutzt jetzt `@supabase/ssr` statt des alten Plain-Clients. Damit lesen privater Browser-Login, Magic-Link-Rückkehr und Gate-Handoff dieselbe Session-Art statt aneinander vorbeizulaufen.
- **Auth-Callback ergänzt:** `src/app/auth/callback/route.ts` tauscht Mail-Link- oder Recovery-Token jetzt serverseitig in eine echte App-Session für `gym.w3yh.xyz`. Die Magic-Link-API zeigt dafür nicht mehr stumpf auf `/private`, sondern auf den Callback.
- **Fallback-Login auf Passwort erweitert:** `/private` akzeptiert jetzt zusätzlich E-Mail plus Passwort; Magic Link bleibt nur noch der Fallback. Die Copy erklärt jetzt auch hier klar, dass das Private Gate der erste Weg und der Passwortmanager danach der bequemste Alltagspfad ist.
- **Öffentliche und private Variante getrennt:** Root ist jetzt ein Einstieg mit klarer Trennung zwischen öffentlicher One-Shot-Vorlage (`/one-shot`) und privater Supabase-Version (`/private`).
- **Öffentliche One-Shot-Vorlage:** Neue browserlokale Version ohne Supabase-Rückschreiben mit Copy-Paste-Export für einmalige Trainingslogs.
- **Privater Magic-Link-Flow vorbereitet:** Die private Version ist auf Supabase-Login via Mail-Link vorbereitet; Route-Handler liegt unter `src/app/api/auth/magic-link/route.ts`.
- **Private-Gate-Handoff vorbereitet:** `src/lib/handoff.ts` und `src/app/auth/handoff/route.ts` koennen jetzt signierte Sessions von `private.w3yh.xyz` pruefen und lokal auf `gym.w3yh.xyz` in eine App-Session uebernehmen.
- **Magic-Link-Route gehärtet:** Redirect-Origin wird validiert, kaputte JSON-Bodies werden sauber abgefangen und Magic-Link-Anfragen werden serverseitig rate-limitiert.
- **RLS-Defaults gehärtet:** `schema.sql`, `equipment.sql` und `migrations/001_equipment.sql` stellen neue Setups nicht mehr offen auf `public full access`.
- **Nachzieh-Migration:** `migrations/002_authenticated_access.sql` zieht bestehende offene Installationen auf `authenticated` um.
- **PC-Setup dokumentiert:** `SUPABASE_SETUP.md` bündelt die exakte Reihenfolge für SQL, Auth-Settings, Redirect-URLs, Vercel-Env und den abschließenden Login-Test.

### Go-Live & Verifikation
- **Produktions-Env für den privaten Login gesetzt:** `NEXT_PUBLIC_GYM_TRACKER_ORIGIN`, `NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=true` und `GYM_ALLOWED_EMAILS` sind im Vercel-Projekt jetzt produktiv hinterlegt.
- **Production-Deploy erneuert:** `gym.w3yh.xyz` läuft auf einem frischen Deploy mit aktivem privaten Auth-Pfad.
- **Magic-Link-API live getestet:** `/api/auth/magic-link` antwortet neutral sowohl für freigeschaltete als auch für gesperrte Adressen und leakt damit keine Allowlist.
- **Rate-Limit-Fehler nicht mehr verschleiert:** Wenn Supabase den Mailversand drosselt oder der gemeinsame Email-Provider deaktiviert ist, kommt jetzt eine passende Fehlermeldung statt eines diffusen generischen 500ers.
- **Read-only-Probe ergänzt:** `SUPABASE_SETUP.md` enthält jetzt einen API-Check ohne Dashboard, damit man offene RLS-/Auth-Defaults sofort sieht.
- **Private UI auf Gate-Einstieg gezogen:** Die Login-Maske unter `/private` verweist jetzt sichtbar auf das zentrale Gate; solange `private.w3yh.xyz` noch nicht als Alias haengt, ist `https://w3yh.xyz/private/go/gym` der reale Live-Pfad. `README.md` und `SUPABASE_SETUP.md` dokumentieren zusaetzlich das benoetigte Secret `W3YH_PRIVATE_HANDOFF_SECRET`.
- **Env-Vorlage ergänzt:** `.env.example` liegt jetzt direkt im Repo, damit der produktive Gate-/Supabase-Block nicht mehr nur aus verstreuten Doku-Schnipseln zusammengesetzt werden muss.
- **Gate-Rollout live bestätigt:** Der GitHub-Deploy `76aa59c` ist auf Vercel `READY`; `https://gym.w3yh.xyz/private` antwortet damit jetzt produktiv auf dem neuen privaten Einstieg.
- **Handoff-Runtime live eingegrenzt:** `https://gym.w3yh.xyz/auth/handoff?handoff=test` redirectet kontrolliert auf `/private?error=Private-Gate-Handoff+ist+noch+nicht+konfiguriert.` Damit ist klar, dass der neue Handoff-Pfad live ist und jetzt nur noch `W3YH_PRIVATE_HANDOFF_SECRET` im Runtime-Setup fehlt.
- **Shared-Secret live angekommen:** Der Handoff-Test auf `https://gym.w3yh.xyz/auth/handoff?handoff=test` faellt jetzt mit `Handoff-Token ist unvollstaendig.` statt mit einem Konfigurationsfehler. Damit ist die Runtime-Verkabelung geschlossen; offen bleibt nur noch der echte Gate-Login mit realer Session.
- **Verbleibender Rest klar benannt:** Die Read-only-Probe zeigt aktuell noch anon `200` auf `gt_sessions` und `gt_exercises`; dazu stehen `site_url` und Signup-Defaults im Supabase-Auth-Setup noch nicht auf dem Zielzustand. Der Rest von `GYM-1` ist damit ein reiner Dashboard-/SQL-Schritt.
- **Lokaler Build nach Auth-Umbau grün:** `npm run build` läuft nach Passwort-Login, SSR-Browser-Client und neuem `/auth/callback` wieder sauber durch; der nächste Rest ist nur noch Deploy plus echter Gate-Smoke.

## v1.0.2 — 2026-03-04 (In Progress)

### Bugfixes & Polishing
- **Schreibschutz für Historie:** Alte Sessions sind nun im "Read-only" Modus (deaktivierte Inputs), um versehentliche Änderungen am Verlauf zu verhindern.
- **Umlaute-Fix:** Alle UI-Texte auf korrekte deutsche Umlaute (ä, ö, ü) umgestellt.
- **Auto-Save Stabilität:** Sicherstellung, dass nur die aktuellste Session bearbeitet werden kann.
- **Undo-Funktion:** Gelöschte Übungen können nun innerhalb von 5 Sekunden per Button wiederhergestellt werden.
- **Performance Autocomplete:** Übungsvorschläge werden nun effizienter (ilike + Limit) vom Backend geladen.
- **Mobile-Stepper verbessert:** Gewicht-/Minuten-Buttons bleiben auf kleinen Screens in einer gemeinsamen Zeile; Add- und Edit-Formulare umbrechen nun sauberer und sperren die jeweilige Zeile kurz während des Supabase-Saves.
- **Undo-Timeout gehärtet:** Alte Lösch-Timer werden beim erneuten Löschen oder beim Rückgängig-Machen sauber verworfen, damit die aktuelle Undo-Meldung nicht versehentlich verschwindet.
- **Session-Rollback abgesichert:** Wenn das Duplizieren der letzten Übungen nach dem Anlegen einer neuen Session fehlschlägt, wird die frisch erzeugte `gt_sessions`-Zeile wieder gelöscht, damit keine leeren Sessions in Supabase hängen bleiben.
- **Bootstrap konsolidiert:** `schema.sql` und `seed-data.sql` sprechen jetzt dieselbe kanonische `gt_*`-Tabellenstruktur.
- **Equipment-Schema vereinheitlicht:** Die Migration `migrations/001_equipment.sql` ist jetzt auf dieselbe `gt_equipment`-Struktur gezogen wie `equipment.sql` und das UI-Feature.

## v1.0.1 — 2026-03-04

### Setup & Deployment
- **Datenbank-Migration:** Tabellen auf `gt_sessions` und `gt_exercises` umbenannt (Präfix `gt_` für geteilte Supabase-Projekte).
- **Environment-Variablen:** Vollständige Integration von `NEXT_PUBLIC_SUPABASE_URL` und `ANON_KEY` in Vercel (Production/Preview).
- **Mobile-Check:** Erfolgreicher Funktionstest auf Mobilgeräten (Laden, Erstellen, Löschen von Sessions).

## v1.0.0 — 2026-03-03

### Aufgabenstellung

**Ziel:** Gym-Tracker Web-App zum Tracken von Krafttraining mit automatischer Session-Duplizierung.

**Anforderungen:**
- Next.js 16 mit App Router, TypeScript, Tailwind CSS
- Supabase (PostgreSQL) als Backend
- UI mit Trainings-View und +/- Buttons (2,5kg Incremente)
- "Neues Training" Button kopiert letzte Session
- Seed-Daten: 4 historische Sessions (19.02, 26.02, 28.02, 02.03.2026)
- Deployment via Vercel
- GitHub Repo für Version Control

**Supabase Schema:**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER DEFAULT 5,
  reps INTEGER DEFAULT 10,
  weight DECIMAL(5,1) NOT NULL,
  notes TEXT
);
```

---

### Umsetzung

#### 1. Projekt-Setup
- Next.js 16 bereits vorinstalliert im Ordner `/home/openclaw/workspace/gym-tracker`
- Supabase Client installiert: `npm install @supabase/supabase-js`
- `.env.local` erstellt mit Supabase Credentials

#### 2. Supabase-Integration
- **Datei:** `src/lib/supabase.ts`
- Supabase Client mit `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Schema direkt in Supabase erstellt über Client-API
- Seed-Daten eingefügt (4 Sessions + 32 Exercises)

#### 3. UI-Komponenten
- **Datei:** `src/app/page.tsx`
- Session-Auswahl als Dropdown (neueste zuerst)
- Trainings-View mit allen Übungen als Karten
- +/- Buttons für Gewichtsanpassung (2,5kg Schritte)
- "Neues Training" Button dupliziert letzte Session
- Cardio-Sektion mit Minuten + ZHF Eingabe

#### 4. Vercel Deployment
- `vercel.json` erstellt mit Umgebungsvariablen
- Umgebungsvariablen via Vercel API gesetzt:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Deploy-Befehl: `vercel deploy --prod --yes --token $VERCEL_TOKEN`
- Build erfolgreich in 39 Sekunden

#### 5. GitHub + Vercel Link
- GitHub Repo erstellt: https://github.com/vibeY434/gym-tracker
- Code gepusht mit SSH-Key (`~/.ssh/id_ed25519`)
- Vercel automatisch verbunden (Auto-Deploy bei Push)

---

### Tech Stack

| Komponente | Version |
|---|---|
| Next.js | 16.1.6 |
| React | 19.x |
| TypeScript | 5.x |
| Tailwind CSS | 3.x |
| Supabase | @supabase/supabase-js |
| Vercel | Production Deployment |

---

### Credentials

**Supabase:**
- URL: `https://svsfwenqmpcdlpyyytgd.supabase.co`
- Keys in Vercel Environment Variables hinterlegt

**Vercel:**
- Token: In `.openclaw/openclaw.json` env hinterlegt
- Projekt: `vibey434s-projects/gym-tracker`

**GitHub:**
- Repo: `vibeY434/gym-tracker`
- SSH-Key: `~/.ssh/id_ed25519` (vibeY434)

---

### Live-Links

| Umgebung | URL |
|---|---|
| Production | https://gym-tracker-8f6qz5tuy-vibey434s-projects.vercel.app |
| Alias | https://gym-tracker-pied-three.vercel.app |
| GitHub | https://github.com/vibeY434/gym-tracker |

---

### Seed-Daten

**Session 1 — 19.02.2026:**
- Cardio: 15min @ 110 ZHF
- Leg Press: 60kg | Leg Extension: 45kg | Leg Curl: 30kg
- Abdominal: 45kg | Back Extension: 65kg
- Hip Adduction: 65kg | Hip Abduction: 80kg

**Session 2 — 26.02.2026:**
- Cardio: 20min @ 100 ZHF
- Alle Übungen +2,5kg

**Session 3 — 28.02.2026:**
- Cardio: 20min @ 100 ZHF
- Alle Übungen +2,5kg

**Session 4 — 02.03.2026:**
- Cardio: 20min @ 100 ZHF
- Alle Übungen +2,5kg
- Leg Extension Note: "hart, aber ok"

---

### Bekannte Issues

- GitHub Integration zu Vercel manuell zu verbinden (API-Call fehlgeschlagen)
- Git Email musste auf `dominik.weyh@gmail.com` gesetzt werden für Vercel Access

---

### Nächste Schritte (Optional)

- [ ] Auth-Login für mehrere User
- [ ] Export als PDF/CSV
- [ ] Charts für Progress-Tracking
- [ ] Exercise-Bibliothek mit Vorschlägen
- [ ] Rest-Timer Integration
- [ ] Mobile-Optimierung verbessern

---

**Erstellt:** 2026-03-03 12:44 UTC  
**Autor:** Tyrone (via OpenClaw)  
**Auftraggeber:** Dominik Weyh
