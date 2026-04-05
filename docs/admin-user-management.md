# Admin User Management – Technische Dokumentation

## 1) Analyse der bestehenden Struktur

### Admin-Rechte bisher
- Firestore Rules kannten bereits eine `isAdmin()`-Funktion über `users/{uid}.role == 'admin'`.
- In der UI gab es jedoch keinen durchgängigen Zugriffsschutz für `/admin`-Routen.
- Es gab keine serverseitigen Admin-APIs für User-Verwaltung.

### User-Speicherung in Auth & Datenbank
- Authentifizierung läuft über Firebase Auth (`services/auth.service.ts`).
- User-Profile liegen in `users/{uid}` mit Feldern wie `email`, `displayName`, `role`, `familyId`.

### User-bezogene Datenquellen / Relationen
Identifiziert über `firestoreCollections` sowie Service-Nutzung:
- Direkt mit `userId`: `quizResults`, `quizSessions`, `userResults`, `quizAnswers`, `results`, `mailLogs`.
- Familienbezogen mit User-Referenzen: `families` (`initiatorUserId`, `partnerUserId`).
- Familien-Subcollections: `ownershipCategories`, `ownershipCards`, `auditEvents`, `teamCheckPreparations`, `teamCheckRecords`.
- Verknüpfungen: `invitations` (`familyId`, `initiatorUserId`), `jointResults` (`familyId`).

### Wiederverwendete Strukturen
- Bestehende Admin-Navigation/-Design (`app/admin/page.tsx`, Card/Button/Systemklassen).
- Bestehende Auth-State-Observation (`observeAuthState`).
- Bestehende Firestore Rollenmodellierung in `users`.

### Risiken (vor Umsetzung)
- Kein serverseitig abgesicherter Admin-Endpunkt für kritische Aktionen.
- Fehlende zentrale Kaskadenlöschung über Family-Daten + Subcollections.
- Gefahr von Teillöschungen bei Fehlern zwischen Firestore und Auth.
- Gesperrte User wurden bisher nicht global über Rules abgefangen.

## 2) Umgesetzte Lösung

### UI / Admin-Bereich
- Neuer Admin-Bereich **User Management** unter `/admin/users`.
- Enthält:
  - User-Liste (Name, E-Mail, Rolle, Status, Registrierung, optional letzte Aktivität falls Feld vorhanden)
  - Suche (Name/E-Mail)
  - Sortierung (Registrierung, Name, E-Mail, zuletzt geändert)
  - Aktionen: Sperren/Entsperren, Endgültig löschen
  - Lade-, Leer-, Fehler- und Erfolgszustände
  - Bestätigungsdialog vor endgültiger Löschung

### Rechte & Schutz
- Neues `app/admin/layout.tsx` mit `AdminAccessGuard`:
  - Nicht eingeloggt => Redirect auf `/login`
  - Nicht admin => Redirect auf `/app/home`
- Serverseitige API-Prüfung per `requireAdmin()` in allen Admin-User-APIs.
- API-Zugriff erfolgt nur mit Firebase-ID-Token im Authorization Header.

### Serverlogik / Services
- Neue serverseitige Services:
  - `listUsers` / `listUsersForAdmin`
  - `suspendUser`
  - `unsuspendUser`
  - `deleteUserCascade`
- Umsetzung über Firestore-/Identity-REST + Service-Account OAuth (ohne zusätzliche Runtime-Abhängigkeit).
- Audit-Logging in `adminAuditLogs` für suspend/unsuspend/delete inkl. Erfolg/Fehler.

### Sperren technisch wirksam
- Beim Sperren:
  - Auth-Konto wird über Identity Toolkit deaktiviert.
  - `users/{uid}.suspended = true` gesetzt.
- Firestore Rules prüfen `isSuspended()` und blockieren aktive App-Zugriffe für gesperrte User serverseitig.

### Endgültige Löschung / Kaskade
- Schutzlogik:
  - Kein Self-Delete des ausführenden Admins.
  - Letzter Admin kann nicht gelöscht werden.
- Strategie:
  1. Auth-Account zunächst deaktivieren (Blockade während Löschlauf)
  2. User-bezogene Collections löschen
  3. Familienbezüge ermitteln und Family-Tree inkl. Subcollections bereinigen
  4. User-Profil löschen
  5. Auth-Account endgültig löschen
- Bei Fehlern:
  - Audit-Log mit `success: false`, Fehlergrund und bereits entfernten Bereichen.

## 3) Geänderte Sicherheitsregeln (Firestore)

- `isActiveSignedIn()` und `isSuspended()` ergänzt.
- Suspended User werden über Rules bei geschützten Bereichen blockiert.
- Admins dürfen `users/*` lesen (für User-Liste).
- `adminAuditLogs` nur admin-les-/schreibbar.

## 4) Tests

- Ergänzte statische Regressionstests (`tests/admin-user-management.test.js`) für:
  - API-Admin-Guards
  - UI-Funktionen (Suche/Sortierung/Aktionen)
  - Löschschutz (Self/Last-Admin) und Auth-Deaktivierung + Auth-Löschung
  - Rule-Checks für Suspended-Blockierung und Admin-Audit-Logs

## 5) Bekannte Grenzen / Annahmen

- Für serverseitige Admin-Operationen sind folgende Env-Variablen erforderlich:
  - `FIREBASE_ADMIN_CLIENT_EMAIL`
  - `FIREBASE_ADMIN_PRIVATE_KEY`
  - `FIREBASE_ADMIN_PROJECT_ID`
- Die Kaskadenlöschung ist auf die im Projekt verwendeten Collections/Subcollections ausgelegt.
- Such-/Sortierlogik basiert auf einem serverseitig begrenzten User-Fetch (`USER_QUERY_LIMIT`) und ist für größere Datenmengen später über Cursor-Pagination ausbaubar.
