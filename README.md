# mental carefair – Web Plattform (Etappe 2)

## Projektziel
Diese Codebasis enthält die Website und den öffentlichen Test-Flow für „mental carefair“.

Etappe 2 liefert:
- Next.js App-Router-basierter öffentlicher Test ohne Registrierung
- Filterflow (`/test/filter`) → Quiz (`/test/quiz`) → Stressfrage (`/test/stress`) → Kurz-Auswertung (`/test/result`)
- Fragen-Generator (15 Fragen) für die Altersgruppe `0–1`
- temporäre Session-Speicherung (LocalStorage + Firestore)
- Kurz-Auswertung mit einfacher Ownership-Berechnung
- sichtbare Build-/Versionskennung im Footer

Noch **nicht** enthalten (bewusst):
- Registrierung und Login-Flow für Testergebnisse
- Partnervergleich / gemeinsames Ergebnis
- Zuordnung von Verantwortlichkeiten
- Weekly Check-in
- Admin-Bearbeitung

## Tech Stack
- Next.js (App Router)
- TypeScript
- Firebase Firestore
- Firebase Auth (Basis weiter vorhanden)

## Setup
```bash
npm install
```

## Lokal starten
```bash
npm run dev
```
Danach unter: `http://localhost:3000`

## Firebase Setup
Erstelle `.env.local` mit folgenden Variablen:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Firebase ist zentral gekapselt in `lib/firebase.ts`.

Hinweis: Die Datei muss im **Projektroot** liegen, also unter `faircare5.0/.env.local` (nicht in Unterordnern). Für lokale Setups kann `.env.local` direkt aus `.env.example` erstellt und anschließend befüllt werden.

## Test-Flow (Etappe 2)
- `/test` Einstieg
- `/test/filter` Kontextfragen (Kinderzahl, Altersgruppe, Betreuung, Klarheit)
- `/test/quiz` 15 Ownership-Fragen mit Fortschrittsanzeige
- `/test/stress` optionale Mehrfachauswahl belastender Bereiche
- `/test/result` Kurz-Auswertung vor Registrierung

## Datenhaltung
- **questionPools**: Fragenpool (Firestore-first, lokaler Seed als Fallback)
- **quizSessions**: temporäre Session-Metadaten + Antwortenstatus
- **quizAnswers**: Antwort-Payload pro tempSessionId
- **results**: Kurz-Auswertungsstatus und Stress-Kategorien

Temporäre Session-Felder:
- `tempSessionId`
- `childCount`
- `youngestAgeGroup`
- `childcareTags`
- `splitClarity`
- `questionIds`
- `answers`
- `stressCategories`
- `sourcePlatform = web`
- `createdAt`
- `completedAt` (optional)

## Versions-/Build-Anzeige
Im Footer wird eine Kennung angezeigt:
- bevorzugt: `Build <short-git-sha>`
- fallback: `Version <package.json version>`

Die Kennung wird zentral über `utils/version.ts` angezeigt.
`next.config.ts` erzeugt `NEXT_PUBLIC_BUILD_ID` und `NEXT_PUBLIC_APP_VERSION` für Laufzeit/Build.

Damit ändert sich die sichtbare Kennung nach neuem Commit/Merge zuverlässig (bei vorhandenem Git SHA).

## Qualität / Checks
```bash
npm run lint
npm run typecheck
```

## Admin-User hochstufen (Firebase)
Bestehenden Benutzer zur Admin-Rolle hochstufen (ohne Passwort-Reset):

```bash
npm run admin:upsert-user -- --email tenijenhuis@gmail.com --grant-only
```

Falls der Benutzer neu angelegt oder aktualisiert werden soll, zusätzlich Passwort/Vorname setzen:

```bash
npm run admin:upsert-user -- --email <email> --password <passwort> --first-name <vorname> [--last-name <nachname>]
```
