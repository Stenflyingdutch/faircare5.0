import { AdminModulePlaceholder } from '@/components/admin/common/AdminModulePlaceholder';
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export default function AdminResponsibilitiesPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="Verantwortungsbereiche" description="Pflege von Karten, Details, Altersgruppen, Kategorien und Übersetzungen." action={<button className="button primary">Bereich anlegen</button>} />
      <AdminModulePlaceholder filters={<><input className="input" placeholder="Suche" /><select className="input"><option>Altersklasse</option></select></>}>
        <p className="helper">Nächster Schritt: Detailformular mit Vorschau, Duplizieren und Archivieren.</p>
      </AdminModulePlaceholder>
    </div>
  );
}
