import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

export default function AdminSystemPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader title="System" description="Fachliche Konfigurationen wie aktive Sprachen, Feature-Flags und Defaults." />
      <section className="admin-module-card">
        <p className="helper">Keine Secrets oder Infrastrukturschlüssel: nur produktrelevante Einstellungen.</p>
      </section>
    </div>
  );
}
