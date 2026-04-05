import type { ReactNode } from 'react';

import { PersonalAreaShell } from '@/components/personal/PersonalAreaShell';

export default function PersonalAreaLayout({ children }: { children: ReactNode }) {
  return <PersonalAreaShell>{children}</PersonalAreaShell>;
}
