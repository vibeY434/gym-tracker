# CHANGELOG.md — Gym-Tracker App

## v1.0.2 — 2026-03-04 (In Progress)

### Bugfixes & Polishing
- **Schreibschutz für Historie:** Alte Sessions sind nun im "Read-only" Modus (deaktivierte Inputs), um versehentliche Änderungen am Verlauf zu verhindern.
- **Umlaute-Fix:** Alle UI-Texte auf korrekte deutsche Umlaute (ä, ö, ü) umgestellt.
- **Auto-Save Stabilität:** Sicherstellung, dass nur die aktuellste Session bearbeitet werden kann.

## v1.0.1 — 2026-03-04

### Setup & Deployment
- **Datenbank-Migration:** Tabellen auf `gt_sessions` und `gt_exercises` umbenannt (Präfix `gt_` für geteilte Supabase-Projekte).
- **Environment-Variablen:** Vollständige Integration von `NEXT_PUBLIC_SUPABASE_URL` und `ANON_KEY` in Vercel (Production/Preview).
- **Mobile-Check:** Erfolgreicher Funktionstest auf Mobilgeräten (Laden, Erstellen, Löschen von Sessions).

## v1.0.0 — 2026-03-03

### Aufgabenstellung
**Ziel:** Gym-Tracker Web-App zum Tracken von Krafttraining mit automatischer Session-Duplizierung.

**Features:**
- Next.js 16, TypeScript, Tailwind CSS.
- Supabase Backend.
- "Neues Training" kopiert Übungen der Vorwoche.
- +/- Buttons für Gewichte (2,5kg) und Cardio (5 Min).

---

**Erstellt:** 2026-03-04 10:36 UTC  
**Autor:** Antigravity (via OpenClaw)  
**Auftraggeber:** Dominik Weyh
