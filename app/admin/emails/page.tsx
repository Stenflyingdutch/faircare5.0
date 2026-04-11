import { AdminModulePlaceholder } from '@/components/admin/common/AdminModulePlaceholder';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export default function AdminEmailsPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="E-Mail-Templates" description="Betreff, Plain-Text, HTML, Variablen und Validierungsstatus verwalten." action={<button className="button primary">Template anlegen</button>} />
      <AdminModulePlaceholder filters={<><input className="input" placeholder="Template suchen" /><select className="input"><option>Validierungsstatus</option></select></>}>
        <p className="helper">Template-Preview und Variablen-Validierung sind als nächster Ausbau vorgesehen.</p>
      </AdminModulePlaceholder>
    </div>
  );
}
