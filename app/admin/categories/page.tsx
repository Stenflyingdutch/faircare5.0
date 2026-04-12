import { AdminModulePlaceholder } from '@/components/admin/common/AdminModulePlaceholder';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export default function AdminCategoriesPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="Kategorien" description="Kategorien verwalten, sortieren, archivieren und Übersetzungsstatus prüfen." action={<button className="button primary">Kategorie anlegen</button>} />
      <AdminModulePlaceholder filters={<><input className="input" placeholder="Suche" /><select className="input"><option>Alle Stati</option></select></>}>
        <p className="helper">Die Kategorie-Verwaltung wird in dieser strukturierten Oberfläche konsolidiert.</p>
      </AdminModulePlaceholder>
    </div>
  );
}
