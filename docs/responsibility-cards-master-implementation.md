# Responsibility Cards – Firebase/Firestore Master-Umsetzung

## 1) Neue Collections

- `catalog_responsibility_cards`
- `families/{familyId}/responsibility_cards`

## 2) Felder

### `catalog_responsibility_cards/{catalogCardId}`

Pflichtfelder:
- `categoryKey: string`
- `title: string`
- `description: string`
- `language: "de" | "en" | "nl"`
- `ageGroup: "0-1" | "1-3" | "3-6" | "6-12" | "12-18"`
- `sortOrder: number`
- `isActive: boolean`
- `createdAt: timestamp`
- `updatedAt: timestamp`
- `createdBy: userId`
- `updatedBy: userId`

Optional:
- `tags: string[]`
- `version: number`

### `families/{familyId}/responsibility_cards/{cardId}`

Pflichtfelder:
- `familyId: string`
- `categoryKey: string`
- `title: string`
- `description: string`
- `sourceType: "catalog" | "custom"`
- `sourceCatalogCardId: string | null`
- `importedAt: timestamp | null`
- `createdAt: timestamp`
- `updatedAt: timestamp`
- `createdBy: userId`
- `updatedBy: userId`
- `assigneeUserId: string | null`
- `status: "open" | "done"`
- `focusState: "now" | "soon" | "later" | null`
- `isArchived: boolean`

Optional:
- `delegationState`
- `lastMessageAt`
- `messageCount`

## 3) Firestore Rules (umgesetzt)

- Katalog:
  - `read`: authentifizierte User
  - `create/update/delete`: nur `isAdmin()`
- Familienkarten:
  - `read/create/update/delete`: nur `isFamilyMember(familyId)` bei aktivem Account

Datei: `firestore.rules`.

## 4) Migration Script

Script-Datei: `scripts/migrate-responsibility-cards.mjs`

Ablauf:
1. Legacy-Karten unter `families/{familyId}/ownershipCards` lesen.
2. Nach `families/{familyId}/responsibility_cards/{cardId}` schreiben.
3. `sourceType` inferieren (`catalog`, wenn `sourceCatalogCardId` vorhanden, sonst `custom`).
4. Optional globales Legacy-Set `ownershipCards` lesen und zuordnen.
5. Dry-run möglich mit `--dry-run`.

## 5) UI-Komponentenstruktur

- `components/responsibilities/FamilyCategoryView.tsx`
  - Category-Header mit Counter
  - Buttons: „Katalog“ / „Neue Karte“
  - Empty-State nach Vorgabe
  - Familienkarten-Liste (nur Family-Daten)
- `components/responsibilities/CatalogViewModal.tsx`
  - Katalogkarten-Liste
  - Status „Bereits übernommen“ via `sourceCatalogCardId`-Set
  - Action „Übernehmen“ via `importFromCatalog`
- `app/admin/responsibilities/page.tsx`
  - Admin-Katalog-Ansicht
  - Filter: Kategorie, Sprache, Altersgruppe
  - Aktionen: erstellen/löschen
  - UI-Hinweis zur Nicht-Synchronisation

Zusatzseite:
- `app/app/verantwortungsbereiche/page.tsx` als Family-Entry-Point.

## 6) Testprotokoll

Siehe Terminal-Checks im Umsetzungs-PR (Typecheck/Lint/Tests je nach Umgebung).
