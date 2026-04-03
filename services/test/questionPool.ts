export type OwnershipOption = 'ich' | 'eher_ich' | 'beide' | 'eher_partner' | 'partner';

export interface OwnershipQuestion {
  id: string;
  text: string;
  category: 'organisation' | 'gesundheit' | 'betreuung_bildung' | 'grundversorgung' | 'haushalt_versorgung' | 'soziales' | 'entwicklung';
  ageGroup: '0_1';
  core?: boolean;
  requiresChildcareTag?: 'grosseltern_familie' | 'babysitter_nanny';
}

export const OWNERSHIP_OPTIONS: Array<{ label: string; value: OwnershipOption }> = [
  { label: 'ich', value: 'ich' },
  { label: 'eher ich', value: 'eher_ich' },
  { label: 'beide', value: 'beide' },
  { label: 'eher Partner', value: 'eher_partner' },
  { label: 'Partner', value: 'partner' },
];

export const STRESS_CATEGORIES = [
  'Organisation',
  'Gesundheit',
  'Betreuung & Bildung',
  'Grundversorgung',
  'Haushalt & Versorgung',
  'Soziales',
] as const;

export const QUESTION_POOL_0_1: OwnershipQuestion[] = [
  { id: 'q_0_1_feed_timing', text: 'Wer denkt daran, wann die nächste Mahlzeit ansteht?', category: 'grundversorgung', ageGroup: '0_1', core: true },
  { id: 'q_0_1_sleep_rhythm', text: 'Wer hat im Blick, wann das Baby schlafen sollte?', category: 'grundversorgung', ageGroup: '0_1', core: true },
  { id: 'q_0_1_day_planning', text: 'Wer plant den Tag rund um Schlafen, Essen und Termine?', category: 'organisation', ageGroup: '0_1', core: true },
  { id: 'q_0_1_packing', text: 'Wer merkt sich, was für unterwegs eingepackt werden muss?', category: 'organisation', ageGroup: '0_1', core: true },
  { id: 'q_0_1_health_check', text: 'Wer entscheidet, ob das Baby krank ist und was zu tun ist?', category: 'gesundheit', ageGroup: '0_1', core: true },
  { id: 'q_0_1_vaccination', text: 'Wer behält im Blick, wann U-Untersuchungen oder Impfungen anstehen?', category: 'gesundheit', ageGroup: '0_1', core: true },
  { id: 'q_0_1_diapers_stock', text: 'Wer merkt, wenn Windeln oder Feuchttücher leer gehen?', category: 'haushalt_versorgung', ageGroup: '0_1', core: true },
  { id: 'q_0_1_buying', text: 'Wer sorgt dafür, dass diese Dinge rechtzeitig nachgekauft werden?', category: 'haushalt_versorgung', ageGroup: '0_1', core: true },
  { id: 'q_0_1_clothing_weather', text: 'Wer entscheidet, was das Baby je nach Wetter anzieht?', category: 'grundversorgung', ageGroup: '0_1', core: true },
  { id: 'q_0_1_visit_planning', text: 'Wer organisiert Besuche von Familie oder Freunden?', category: 'soziales', ageGroup: '0_1' },
  { id: 'q_0_1_visit_balance', text: 'Wer entscheidet, wann Besuche sinnvoll sind oder zu viel werden?', category: 'soziales', ageGroup: '0_1' },
  { id: 'q_0_1_supply_overview', text: 'Wer behält im Blick, was zuhause für das Baby fehlt?', category: 'haushalt_versorgung', ageGroup: '0_1' },
  { id: 'q_0_1_schedule_coordination', text: 'Wer koordiniert Arzttermine oder andere wichtige Termine?', category: 'organisation', ageGroup: '0_1' },
  { id: 'q_0_1_support_planning', text: 'Wer organisiert Unterstützung im Alltag, zum Beispiel Familie?', category: 'organisation', ageGroup: '0_1' },
  { id: 'q_0_1_routine_adjust', text: 'Wer passt Routinen an, wenn sich etwas ändert?', category: 'organisation', ageGroup: '0_1' },
  { id: 'q_0_1_sleep_changes', text: 'Wer merkt, wenn sich der Schlafrhythmus verändert?', category: 'grundversorgung', ageGroup: '0_1' },
  { id: 'q_0_1_food_changes', text: 'Wer passt Ernährung oder Mengen an, wenn sich Bedürfnisse ändern?', category: 'grundversorgung', ageGroup: '0_1' },
  { id: 'q_0_1_growth_tracking', text: 'Wer behält Entwicklung und Wachstum im Blick?', category: 'entwicklung', ageGroup: '0_1' },
  { id: 'q_0_1_doctor_followup', text: 'Wer denkt daran, Arzttermine nachzuhalten oder Ergebnisse zu verfolgen?', category: 'gesundheit', ageGroup: '0_1' },
  { id: 'q_0_1_outing_ready', text: 'Wer stellt sicher, dass ihr jederzeit startklar für unterwegs seid?', category: 'organisation', ageGroup: '0_1' },
  { id: 'q_0_1_childcare_base', text: 'Wer organisiert grundsätzlich, wer sich wann um das Baby kümmert?', category: 'betreuung_bildung', ageGroup: '0_1', core: true },
  { id: 'q_0_1_childcare_timing', text: 'Wer hat im Kopf, wann Betreuung stattfindet oder ausfällt?', category: 'betreuung_bildung', ageGroup: '0_1' },
  { id: 'q_0_1_family_coordination', text: 'Wer stimmt sich mit Familie zur Betreuung ab?', category: 'betreuung_bildung', ageGroup: '0_1', requiresChildcareTag: 'grosseltern_familie' },
  { id: 'q_0_1_babysitter_org', text: 'Wer organisiert Babysitter oder externe Hilfe?', category: 'betreuung_bildung', ageGroup: '0_1', requiresChildcareTag: 'babysitter_nanny' },
  { id: 'q_0_1_babysitter_coord', text: 'Wer denkt an Planung, Übergabe und Abstimmung mit Babysittern?', category: 'betreuung_bildung', ageGroup: '0_1', requiresChildcareTag: 'babysitter_nanny' },
];
