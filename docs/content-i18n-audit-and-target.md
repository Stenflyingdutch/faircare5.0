# FairCare Content & Mehrsprachigkeits-Audit (Phase 1–5)

## Phase 1 – Ist-Analyse / Bestandsaufnahme

### Bereits zentral oder admin-pflegbar
- `templates/ui-text-blocks` wird über `services/contentBlocks.service.ts` geladen und im Admin unter `/admin/texts` bearbeitet.
- Viele Landingpage- und Quiz-Filtertexte sind bereits als Key-Struktur in `data/textBlocks.ts` hinterlegt.
- Es existieren Sprachwerte für `de`, `en`, `nl` in `LocalizedText`.

### Gefundene Inkonsistenzen
1. **Fehlende zentrale Sprachkonfiguration:** aktive Sprachen, Default und Fallback waren nicht in Content-Datenmodell gespeichert.
2. **Unvollständige Fallback-Logik:** verschiedene Komponenten nutzen eigene ad-hoc Auflösung (`text[locale] || text.de`).
3. **Admin ohne Übersetzungs-Lückenindikator:** fehlende Sprachwerte wurden nicht markiert und nicht filterbar gemacht.
4. **Uneinheitlicher Zugriff:** `fetchContentBlocks()` lieferte nur Blöcke, aber keine Sprach-Metadaten.
5. **Hart codierte UI-Texte in mehreren Flows:** u. a. Login/Register, Einstellungen, Invite-Fehlerseiten, Team-Check-Texte, Teile der Ergebnislogik.

### Hotspots mit harten Texten (Auszug)
- Authentifizierung: `app/login/LoginPageClient.tsx`, `app/register/page.tsx`, `services/auth.service.ts`
- Einstellungen: `app/app/einstellungen/*.tsx`
- Invite & Partner-Flows: `app/invite/[token]/page.tsx`, `services/partnerFlow.service.ts`
- Ergebnis-/Insights-Texte: `services/resultInsights.ts`, `app/quiz/result/page.tsx`
- API-/Serverfehlermeldungen: `app/api/mail/route.ts`, weitere `app/api/**/route.ts`

> Hinweis: Diese Iteration fokussiert auf zentrale Content-Bausteine, Sprachkonfiguration und Admin-UX für Übersetzungsqualität.

## Phase 2 – Zielstruktur

Zielstruktur wurde auf bestehender Architektur aufgebaut (kein Parallel-System):

- Collection/Dokument: `templates/ui-text-blocks`
- `content.blocks[]`: bestehende `ContentTextBlock`-Einträge (Key, Group, Text je Sprache)
- **Neu:** `content.localeSettings`
  - `activeLocales: Locale[]`
  - `defaultLocale: Locale`
  - `fallbackLocale: Locale`

Zusätzlich zentraler Access-Layer:
- `lib/content-access.ts` für Laden, Mergen, Fallback und Missing-Tracking.

## Phase 3 – Umsetzung

### Implementiert
1. **Central Content Access Layer**
   - `loadContentCatalog()`
   - `resolveContentText()` mit kontrollierter Fallback-Kaskade
   - `missingTranslations` Ermittlung über aktive Sprachen
2. **Datenmodell-Erweiterung ohne Breaking Change**
   - `fetchContentBlocks()` liefert nun `{ blocks, localeSettings? }`
   - `persistContentBlocks()` speichert optional `localeSettings`
3. **Admin-UX erweitert**
   - Spracheinstellungen (aktive Sprachen, Default, Fallback)
   - Markierung fehlender Übersetzungen je Block
   - Filter „Nur unvollständige Übersetzungen“
4. **Frontend-Verwendung vereinheitlicht (Landingpage)**
   - Verwendung des zentralen Content-Layers statt lokaler Fallback-Logik.

## Phase 4 – Migration / Normalisierung

- **Rückwärtskompatibel:** Wenn `localeSettings` in Firestore fehlt, greifen sichere Defaults (`de/en/nl`, Default+Fallback `de`).
- Bestehende `blocks` bleiben unverändert nutzbar.
- Persistenz schreibt `localeSettings` nur bei neuen Saves mit.

## Phase 5 – Tests / Abschlussprüfung

- Architekturtests ergänzt:
  - zentrale Locale-Settings vorhanden
  - Persistenz inklusive `localeSettings`
  - Admin-UI enthält Lückenindikator + Filter + Sprachkonfiguration

## Finale Content-Architektur (aktuell)

- **Registry/Keys:** weiter key-basiert (`landing.*`, `quiz.*`, `common.*`)
- **Inhalte:** pro Key `LocalizedText` in `de/en/nl`
- **Sprachregeln:** `content.localeSettings` + zentrale Resolverlogik
- **Adminpflege:** in `/admin/texts` gruppiert, suchbar, fehlende Übersetzungen sichtbar

## Sprachlogik und Fallback

Priorität bei Textauflösung:
1. angeforderte Sprache
2. `fallbackLocale`
3. `defaultLocale`
4. Placeholder `[[missing:key]]`

Zusätzlich werden fehlende Übersetzungen im Admin sichtbar gemacht.

## Neu admin-pflegbar in dieser Iteration

- Sprachkonfiguration (`activeLocales`, `defaultLocale`, `fallbackLocale`)
- Übersetzungsvollständigkeit pro Textblock inkl. Filter

## Offene Altlasten (bewusst nicht komplett in diesem Schritt)

1. Viele Auth-/Settings-/Invite-/Result-Texte sind noch hart codiert.
2. E-Mail-Redaktionstexte sind noch nicht vollständig in ein zentrales, mehrsprachiges Template-Modell überführt.
3. Einheitliche Content-Keys für alle Domänen (Quiz-Katalog, Task-Katalog, Mails, UI-Labels) müssen weiter konsolidiert werden.
4. Vollständige End-to-End-Testmatrix für Mehrsprachigkeit fehlt noch.

## Priorisierte Optimierungsliste

### Sofort umsetzen
1. Auth-, Invite- und Einstellungsseiten auf zentrale Content-Keys migrieren.
2. E-Mail-Subjects/Bodies in admin-pflegbare, mehrsprachige Template-Collection verschieben.
3. Einheitliche fehlende-Übersetzungen-Logs serverseitig ergänzen.

### Wichtig als nächstes
1. Quiz-/Result-/Task-Kataloge vollständig als lokalisierte Strukturen versionieren.
2. Zentrale Key-Registry für `page.*`, `quiz.*`, `tasks.*`, `email.*` formalisieren.
3. Admin-Vorschau für E-Mails und Seitenblöcke ergänzen.

### Später sinnvoll
1. Draft/Published-Workflow für Content.
2. Import/Export/Seed-Tooling je Sprache.
3. Änderungsprotokoll mit `updatedBy`, optionalen Change Notes und Verlauf.
