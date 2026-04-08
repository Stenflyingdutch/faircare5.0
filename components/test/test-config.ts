import type { AgeGroup, ChildcareTag, OwnershipAnswer, SplitClarity, StressSelection } from '@/types/quiz';

export const ownershipOptions: Array<{ value: OwnershipAnswer; label: string }> = [
  { value: 'ich', label: 'ich' },
  { value: 'eher_ich', label: 'eher ich' },
  { value: 'beide', label: 'beide' },
  { value: 'eher_partner', label: 'eher Partner' },
  { value: 'partner', label: 'Partner' },
];

export function resolveAgeGroupLabel(ageGroup: AgeGroup) {
  if (ageGroup === '0_1') return '0–1 Jahre';
  if (ageGroup === '1_3') return '1–3 Jahre';
  if (ageGroup === '3_6') return '3–6 Jahre';
  if (ageGroup === '6_10') return '6–12 Jahre';
  return '12–18 Jahre';
}

export const ageGroupOptions: Array<{ value: AgeGroup; label: string }> = [
  { value: '0_1', label: resolveAgeGroupLabel('0_1') },
  { value: '1_3', label: resolveAgeGroupLabel('1_3') },
  { value: '3_6', label: resolveAgeGroupLabel('3_6') },
  { value: '6_10', label: resolveAgeGroupLabel('6_10') },
  { value: '10_plus', label: resolveAgeGroupLabel('10_plus') },
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

export const stressOptions: Array<{ value: StressSelection; label: string }> = [
  { value: 'betreuung_entwicklung', label: 'Betreuung & Entwicklung' },
  { value: 'gesundheit', label: 'Gesundheit' },
  { value: 'babyalltag_pflege', label: 'Alltag & Pflege' },
  { value: 'haushalt_einkaeufe_vorraete', label: 'Haushalt, Einkäufe & Vorräte' },
  { value: 'keiner_genannten_bereiche', label: 'In keiner der genannten Bereiche' },
];
