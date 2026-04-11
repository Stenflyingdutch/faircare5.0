import Link from 'next/link';

import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export default function AdminContentPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="Texte und Header" description="Content-Registry für freie Texte, Labels, Placeholder und Kontext-Hinweise." action={<Link href="/admin/texts" className="button">Bestehenden Editor öffnen</Link>} />
      <section className="admin-module-card">
        <p className="helper">Dieser Bereich dient als strukturierter Einstieg in die bestehende Textpflege und wird schrittweise auf das neue Datenmodell gehoben.</p>
      </section>
    </div>
  );
}
