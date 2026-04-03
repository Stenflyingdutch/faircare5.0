import type { OwnershipAnswer, StressCategory } from '@/types/quiz';

export const ownershipOptions: Array<{ value: OwnershipAnswer; label: string }> = [
  { value: 'ich', label: 'ich' },
  { value: 'eher_ich', label: 'eher ich' },
  { value: 'beide', label: 'beide' },
  { value: 'eher_partner', label: 'eher Partner' },
  { value: 'partner', label: 'Partner' },
];

export const stressOptions: Array<{ value: StressCategory; label: string }> = [
  { value: 'organisation', label: 'Organisation' },
  { value: 'gesundheit', label: 'Gesundheit' },
  { value: 'betreuung_bildung', label: 'Betreuung & Bildung' },
  { value: 'grundversorgung', label: 'Grundversorgung' },
  { value: 'haushalt_versorgung', label: 'Haushalt & Versorgung' },
  { value: 'soziales', label: 'Soziales' },
];
