# mental carefair – Web Plattform (Etappe 1)

## Projektziel
Diese Codebasis enthält das **technische und visuelle Fundament** der Plattform „mental carefair“ zum Thema Mental Load in der Kindererziehung.

Etappe 1 liefert:
- moderne Next.js Website mit App Router
- modulare Architektur für UI, Auth, Firestore und Templates
- öffentliche Seiten + Platzhalter für geschützte Bereiche
- vorbereitete Datentypen und Collection-Struktur für spätere Quiz-/App-Features

Noch **nicht** enthalten (bewusst):
- Quiz-Flow und Ergebnisberechnung
- fertiger Login-Flow inkl. Provider
- produktive Admin-Bearbeitung
- echte Weekly Check-in Logik

## Tech Stack
- Next.js (App Router)
- TypeScript
- Firebase Auth (Basis vorbereitet)
- Firestore (Basis vorbereitet)
- für Vercel Deployment vorbereitet

## Setup
```bash
npm install
```

## Lokal starten
```bash
npm run dev
```

Danach unter: `http://localhost:3000`

## Environment Variablen
Erstelle eine `.env.local` auf Basis von `.env.example`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Firebase Konfiguration
- `lib/firebase.ts`: zentrale Firebase Initialisierung
- `services/auth.service.ts`: Auth-Basis (Auth-State, Sign-out)
- `services/firestore.service.ts`: Firestore Basisfunktionen
- `services/template-loader.service.ts`: vorbereitetes Laden von Template-Daten

## Seitenstruktur
- `/` Startseite
- `/mental-load` Wissen zu Mental Load
- `/about` Über uns
- `/newsletter` Newsletter Anmeldung (UI)
- `/login` Login Platzhalter
- `/dashboard` geschützter Bereich (Platzhalter)
- `/admin` Admin Bereich (Platzhalter)

## Vorbereitete Firestore Collections
- users
- templates
- questionPools
- quizSessions
- quizAnswers
- results
- couples
- taskAssignments
- weeklyCheckins
- newsletterSubscribers

## Architektur / Ordner
- `app/` Routing + Seiten (UI Layer)
- `components/` wiederverwendbare UI-Bausteine
- `lib/` Infrastruktur (Firebase Init)
- `services/` Auth-, Firestore- und Template-Services
- `types/` zentrale Domain-Typen (inkl. Rollenmodell)
- `styles/` Theme-Basis
- `utils/` Hilfsstrukturen (Navigation)

## Nächste Etappen
1. Geschützte Routen + Rollenprüfung (`user` / `admin`)
2. Quiz-Template Einbindung aus Firestore
3. Quiz-Session + Antworten speichern
4. Ergebnisdarstellung (einzeln & gemeinsam)
5. Aufgaben-Zuordnung und Weekly Check-in Datenmodell aktiv nutzen
6. Admin-Editing Oberfläche für Templates
7. API-/Shared-Layer extrahieren für zukünftige iOS-/Android-Nutzung

## Expo + Firebase mobile module

This repository now includes a modular Expo React Native implementation under `src/` for authentication, onboarding, quiz, and results.

### Environment variables

Set the following in your Expo environment (`.env` / EAS secrets):

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### Expo packages to install

```bash
npx expo install firebase expo-router expo-auth-session expo-apple-authentication react-native-safe-area-context react-native-screens
npm i zustand
```

### Firestore rules

Deploy `firestore.rules` to protect user, individual result, and shared result access.
