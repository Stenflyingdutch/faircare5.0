import type { AgeGroup, ChildcareTag, OwnershipAnswer, SplitClarity, StressCategory } from '@/types/quiz';

export const ownershipOptions: Array<{ value: OwnershipAnswer; label: string }> = [
  { value: 'ich', label: 'ich' },
  { value: 'eher_ich', label: 'eher ich' },
  { value: 'beide', label: 'beide' },
  { value: 'eher_partner', label: 'eher Partner' },
  { value: 'partner', label: 'Partner' },
];

export const ageGroupOptions: Array<{ value: AgeGroup; label: string }> = [
  { value: '0_1', label: '0–1 Jahre' },
  { value: '1_3', label: '1–3 Jahre' },
  { value: '3_6', label: '3–6 Jahre' },
  { value: '6_10', label: '6–10 Jahre' },
  { value: '10_plus', label: '10+ Jahre' },
];

export const splitClarityOptions: Array<{ value: SplitClarity; label: string }> = [
  { value: 'eher_klar', label: 'eher klar' },
  { value: 'teils_spontan', label: 'teils klar, teils spontan' },
  { value: 'oft_unklar', label: 'oft unklar' },
];

export const childcareChoices: Array<{ label: string; value: ChildcareTag }> = [
  { label: 'keine Betreuung', value: 'none' },
  { label: 'Kita', value: 'kita' },
  { label: 'Tagesmutter', value: 'tagesmutter' },
  { label: 'Großeltern / Familie', value: 'family' },
  { label: 'Babysitter / Nanny', value: 'babysitter' },
];

export const stressOptions: Array<{ value: StressCategory; label: string }> = [
  { value: 'betreuung_entwicklung', label: 'Betreuung & Entwicklung' },
  { value: 'gesundheit', label: 'Gesundheit' },
  { value: 'babyalltag_pflege', label: 'Babyalltag & Pflege' },
  { value: 'haushalt_einkaeufe_vorraete', label: 'Haushalt, Einkäufe & Vorräte' },
  { value: 'termine_planung_absprachen', label: 'Termine, Planung & Absprachen' },
];
