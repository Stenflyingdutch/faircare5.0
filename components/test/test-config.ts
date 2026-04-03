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
  { value: '6_12', label: '6–12 Jahre' },
  { value: '12_18', label: '12–18 Jahre' },
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
  { value: 'organisation', label: 'Organisation' },
  { value: 'gesundheit', label: 'Gesundheit' },
  { value: 'betreuung_bildung', label: 'Betreuung & Bildung' },
  { value: 'grundversorgung', label: 'Grundversorgung' },
  { value: 'haushalt_versorgung', label: 'Haushalt & Versorgung' },
  { value: 'soziales', label: 'Soziales' },
];
